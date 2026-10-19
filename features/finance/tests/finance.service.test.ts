import { beforeEach, describe, expect, it, vi } from "vitest";
import { BUDGET_AMOUNT, FINANCE_DB, SPENDING_PERIOD } from "../constants/finance.constants";
import {
  getPeriodSpending,
  getSpendingBudgets,
  hasRegisteredSession,
  setSpendingBudget,
} from "../services/finance.service";
import { getPeriodBounds } from "../utils/getPeriodBounds";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso. Las consultas
// de tabla son cadenas (from → select → gte → lt); cada paso es un mock que
// devuelve el siguiente, y el último resuelve con lo que respondería PostgREST.
const getSessionMock = vi.fn();
const rpcMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const gteMock = vi.fn();
const ltMock = vi.fn();
// ensureSession no se puede usar en Finanzas (crearía una sesión anónima).
const ensureSessionMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => ensureSessionMock(),
  getSupabaseClient: () => ({ auth: { getSession: getSessionMock }, from: fromMock, rpc: rpcMock }),
}));

const SUPABASE_ERROR = { code: "42501", message: "permission denied for table spending_budgets" };

beforeEach(() => {
  vi.resetAllMocks();
  fromMock.mockReturnValue({ select: selectMock });
  selectMock.mockReturnValue({ gte: gteMock });
  gteMock.mockReturnValue({ lt: ltMock });
});

describe("hasRegisteredSession", () => {
  it("is true with the session of a registered account", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { is_anonymous: false } } }, error: null });

    await expect(hasRegisteredSession()).resolves.toBe(true);
  });

  it("is false without a session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    await expect(hasRegisteredSession()).resolves.toBe(false);
  });

  it("is false with an anonymous session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { is_anonymous: true } } }, error: null });

    await expect(hasRegisteredSession()).resolves.toBe(false);
  });

  it("never creates a session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    await hasRegisteredSession();

    expect(ensureSessionMock).not.toHaveBeenCalled();
  });

  it("rethrows the Supabase error", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: SUPABASE_ERROR });

    await expect(hasRegisteredSession()).rejects.toBe(SUPABASE_ERROR);
  });
});

describe("getPeriodSpending", () => {
  // Semana del lunes 12 al domingo 18 de octubre de 2026, en hora local.
  const WEEK_BOUNDS = getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2026, 9, 18, 15, 0));

  it("reads only total_amount of the purchases closed inside the period", async () => {
    ltMock.mockResolvedValue({ data: [], error: null });

    await getPeriodSpending(WEEK_BOUNDS);

    // Nombres literales a propósito: fijan el contrato con la base (016)
    // aunque alguien cambie las constantes por error.
    expect(fromMock).toHaveBeenCalledWith("purchase_sessions");
    expect(selectMock).toHaveBeenCalledWith("total_amount");
    // Inicio incluido y fin excluido, en ISO (la base guarda closed_at en UTC).
    expect(gteMock).toHaveBeenCalledWith("closed_at", new Date(2026, 9, 12).toISOString());
    expect(ltMock).toHaveBeenCalledWith("closed_at", new Date(2026, 9, 19).toISOString());
  });

  it("never filters by owner: the RLS returns only the user's own purchases", async () => {
    ltMock.mockResolvedValue({ data: [], error: null });

    await getPeriodSpending(WEEK_BOUNDS);

    expect(JSON.stringify([selectMock.mock.calls, gteMock.mock.calls, ltMock.mock.calls])).not.toContain("owner_id");
  });

  it("adds the totals and counts purchases without a total apart", async () => {
    ltMock.mockResolvedValue({
      data: [{ total_amount: 10000 }, { total_amount: null }, { total_amount: 5000.5 }],
      error: null,
    });

    await expect(getPeriodSpending(WEEK_BOUNDS)).resolves.toEqual({
      closedCount: 2,
      total: 15000.5,
      withoutTotalCount: 1,
    });
  });

  it("returns ₡0 when there are no closed purchases in the period", async () => {
    ltMock.mockResolvedValue({ data: [], error: null });

    await expect(getPeriodSpending(WEEK_BOUNDS)).resolves.toEqual({
      closedCount: 0,
      total: 0,
      withoutTotalCount: 0,
    });
  });

  it("rejects bounds that do not move forward without calling the database", async () => {
    const start = new Date(2026, 9, 12);

    await expect(getPeriodSpending({ end: start, start })).rejects.toThrow(RangeError);
    await expect(getPeriodSpending({ end: new Date(2026, 9, 11), start })).rejects.toThrow(RangeError);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rethrows the Supabase error", async () => {
    ltMock.mockResolvedValue({ data: null, error: SUPABASE_ERROR });

    await expect(getPeriodSpending(WEEK_BOUNDS)).rejects.toBe(SUPABASE_ERROR);
  });
});

describe("getSpendingBudgets", () => {
  it("reads period and amount from spending_budgets", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await getSpendingBudgets();

    expect(fromMock).toHaveBeenCalledWith("spending_budgets");
    expect(selectMock).toHaveBeenCalledWith("period, amount");
  });

  it("returns null for every period when none is defined", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    await expect(getSpendingBudgets()).resolves.toEqual({ day: null, month: null, week: null });
  });

  it("maps each row to its period and leaves the others as null", async () => {
    selectMock.mockResolvedValue({
      data: [
        { amount: 50000, period: "week" },
        { amount: 0, period: "month" },
      ],
      error: null,
    });

    await expect(getSpendingBudgets()).resolves.toEqual({ day: null, month: 0, week: 50000 });
  });

  it("throws on a period outside the contract", async () => {
    selectMock.mockResolvedValue({ data: [{ amount: 1000, period: "year" }], error: null });

    await expect(getSpendingBudgets()).rejects.toThrow(
      `${FINANCE_DB.TABLE.SPENDING_BUDGETS} devolvió un periodo desconocido`,
    );
  });

  it("rethrows the Supabase error", async () => {
    selectMock.mockResolvedValue({ data: null, error: SUPABASE_ERROR });

    await expect(getSpendingBudgets()).rejects.toBe(SUPABASE_ERROR);
  });
});

describe("setSpendingBudget", () => {
  it("calls set_spending_budget with only the period and the amount", async () => {
    rpcMock.mockResolvedValue({ data: { amount: 50000, owner_id: "user-a", period: "week" }, error: null });

    await setSpendingBudget(SPENDING_PERIOD.WEEK, 50000);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    // Nombre literal a propósito: fija el contrato con la base (027).
    expect(rpcMock).toHaveBeenCalledWith("set_spending_budget", { budget_amount: 50000, budget_period: "week" });
  });

  it("returns the saved amount", async () => {
    rpcMock.mockResolvedValue({ data: { amount: 12000, owner_id: "user-a", period: "day" }, error: null });

    await expect(setSpendingBudget(SPENDING_PERIOD.DAY, 12000)).resolves.toBe(12000);
  });

  it("accepts ₡0 and the database limit", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { amount: 0, owner_id: "user-a", period: "month" }, error: null })
      .mockResolvedValueOnce({ data: { amount: BUDGET_AMOUNT.MAX, owner_id: "user-a", period: "month" }, error: null });

    await expect(setSpendingBudget(SPENDING_PERIOD.MONTH, 0)).resolves.toBe(0);
    await expect(setSpendingBudget(SPENDING_PERIOD.MONTH, BUDGET_AMOUNT.MAX)).resolves.toBe(BUDGET_AMOUNT.MAX);
  });

  it.each([-1, 12.5, BUDGET_AMOUNT.MAX + 1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s without calling the database",
    async (invalidAmount) => {
      await expect(setSpendingBudget(SPENDING_PERIOD.WEEK, invalidAmount)).rejects.toThrow(RangeError);
      expect(rpcMock).not.toHaveBeenCalled();
    },
  );

  it("throws if the database answers with another period", async () => {
    rpcMock.mockResolvedValue({ data: { amount: 50000, owner_id: "user-a", period: "day" }, error: null });

    await expect(setSpendingBudget(SPENDING_PERIOD.WEEK, 50000)).rejects.toThrow(
      `${FINANCE_DB.RPC.SET_SPENDING_BUDGET} devolvió otro periodo`,
    );
  });

  it("rethrows the Supabase error, for example 42501 for an anonymous session", async () => {
    const anonymousError = { code: "42501", message: "Se requiere una cuenta registrada para guardar un presupuesto" };
    rpcMock.mockResolvedValue({ data: null, error: anonymousError });

    await expect(setSpendingBudget(SPENDING_PERIOD.WEEK, 50000)).rejects.toBe(anonymousError);
  });
});
