import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLONES_AMOUNT, FINANCE_DB, SPENDING_PERIOD, TOTAL_SAVE_ERROR } from "../constants/finance.constants";
import {
  getPeriodFinance,
  getPeriodPurchases,
  getPeriodSpending,
  getSpendingBudgets,
  hasRegisteredSession,
  setPeriodTotal,
  setPurchaseTotal,
  setSpendingBudget,
  setSpendingTimeZone,
} from "../services/finance.service";
import { TotalSaveError, toTotalSaveErrorReason } from "../models/TotalMutations.interface";
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
const orderMock = vi.fn();
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

describe("getPeriodFinance", () => {
  const ZONED_RESPONSE = {
    adjustment_count: 1,
    adjustments: [{ amount: -2000, effective_at: "2026-10-15T18:00:00+00:00", id: "adjustment-1", scope: "week" }],
    closed_count: 1,
    period_end: "2026-10-19T06:00:00+00:00",
    period_start: "2026-10-12T06:00:00+00:00",
    purchases: [{ closed_at: "2026-10-18T21:00:00+00:00", id: "purchase-1", store_name: "MaxiPali", total_amount: 10000 }],
    time_zone: "America/Costa_Rica",
    total: 8000,
    without_total_count: 0,
  };

  it("sends only the scope: the owner and the time zone come from the database", async () => {
    rpcMock.mockResolvedValue({ data: ZONED_RESPONSE, error: null });

    await getPeriodFinance(SPENDING_PERIOD.WEEK);

    // Nombre literal a propósito: fija el contrato con la base (040).
    expect(rpcMock).toHaveBeenCalledWith("get_period_finance", { target_scope: "week" });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("gives the period of the saved time zone through the adapter", async () => {
    rpcMock.mockResolvedValue({ data: ZONED_RESPONSE, error: null });

    await expect(getPeriodFinance(SPENDING_PERIOD.WEEK)).resolves.toEqual({
      adjustments: [{ amount: -2000, effectiveAt: "2026-10-15T18:00:00+00:00", id: "adjustment-1", scope: "week" }],
      bounds: { end: new Date("2026-10-19T06:00:00+00:00"), start: new Date("2026-10-12T06:00:00+00:00") },
      purchases: [{ closedAt: "2026-10-18T21:00:00+00:00", id: "purchase-1", storeName: "MaxiPali", totalAmount: 10000 }],
      spending: { adjustmentCount: 1, closedCount: 1, total: 8000, withoutTotalCount: 0 },
      timeZone: "America/Costa_Rica",
    });
  });

  it("is not an error without a confirmed time zone (rule 59)", async () => {
    rpcMock.mockResolvedValue({
      data: { ...ZONED_RESPONSE, adjustment_count: 0, adjustments: [], closed_count: 0, period_end: null, period_start: null, purchases: [], time_zone: null, total: null },
      error: null,
    });

    await expect(getPeriodFinance(SPENDING_PERIOD.DAY)).resolves.toEqual({ timeZone: null });
  });

  it("gives null with TZ002, whatever the internal text or the HTTP status (rule 60)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "TZ002", message: "texto interno cualquiera", status: 400 } });

    await expect(getPeriodFinance(SPENDING_PERIOD.WEEK)).resolves.toBeNull();
  });

  it("rethrows any other Supabase error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: SUPABASE_ERROR });

    await expect(getPeriodFinance(SPENDING_PERIOD.WEEK)).rejects.toBe(SUPABASE_ERROR);
  });

  it("fails when the response breaks the contract instead of showing a wrong total", async () => {
    rpcMock.mockResolvedValue({ data: { ...ZONED_RESPONSE, total: 9000 }, error: null });

    await expect(getPeriodFinance(SPENDING_PERIOD.WEEK)).rejects.toThrow("no cuadra");
  });
});

describe("getPeriodSpending", () => {
  // Semana del lunes 12 al domingo 18 de octubre de 2026, en hora local.
  const WEEK_BOUNDS = getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2026, 9, 18, 15, 0));

  it("reads only total_amount of the purchases closed inside the period, with the exact count", async () => {
    ltMock.mockResolvedValue({ count: 0, data: [], error: null });

    await getPeriodSpending(WEEK_BOUNDS);

    // Nombres literales a propósito: fijan el contrato con la base (016)
    // aunque alguien cambie las constantes por error.
    expect(fromMock).toHaveBeenCalledWith("purchase_sessions");
    expect(selectMock).toHaveBeenCalledWith("total_amount", { count: "exact" });
    // Inicio incluido y fin excluido, en ISO (la base guarda closed_at en UTC).
    expect(gteMock).toHaveBeenCalledWith("closed_at", new Date(2026, 9, 12).toISOString());
    expect(ltMock).toHaveBeenCalledWith("closed_at", new Date(2026, 9, 19).toISOString());
  });

  it("never filters by owner: the RLS returns only the user's own purchases", async () => {
    ltMock.mockResolvedValue({ count: 0, data: [], error: null });

    await getPeriodSpending(WEEK_BOUNDS);

    expect(JSON.stringify([selectMock.mock.calls, gteMock.mock.calls, ltMock.mock.calls])).not.toContain("owner_id");
  });

  it.each([null, 4])("fails instead of giving a wrong total when the count is %s (D19, rule 30)", async (count) => {
    ltMock.mockResolvedValue({ count, data: [{ total_amount: 10000 }, { total_amount: 5000 }], error: null });

    await expect(getPeriodSpending(WEEK_BOUNDS)).rejects.toThrow("incompleto");
  });

  it("adds the totals and counts purchases without a total apart", async () => {
    ltMock.mockResolvedValue({
      count: 3,
      data: [{ total_amount: 10000 }, { total_amount: null }, { total_amount: 5000.5 }],
      error: null,
    });

    await expect(getPeriodSpending(WEEK_BOUNDS)).resolves.toEqual({
      adjustmentCount: 0,
      closedCount: 2,
      total: 15000.5,
      withoutTotalCount: 1,
    });
  });

  it("returns ₡0 when there are no closed purchases in the period", async () => {
    ltMock.mockResolvedValue({ count: 0, data: [], error: null });

    await expect(getPeriodSpending(WEEK_BOUNDS)).resolves.toEqual({
      adjustmentCount: 0,
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

describe("getPeriodPurchases", () => {
  const NOW = new Date(2026, 9, 18, 15, 0);
  const WEEK_BOUNDS = getPeriodBounds(SPENDING_PERIOD.WEEK, NOW);
  const CLOSED_AT = "2026-10-18T16:00:00+00:00";

  const buildRow = (overrides: Record<string, unknown> = {}) => ({
    closed_at: CLOSED_AT,
    id: "purchase-1",
    stores: { display_name: "MaxiPali" },
    total_amount: 10000,
    ...overrides,
  });

  // La consulta termina en dos .order(): el primero encadena y el segundo responde.
  const mockResponse = (response: Record<string, unknown>) => {
    ltMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValueOnce({ order: orderMock }).mockResolvedValueOnce(response);
  };
  const mockRows = (rows: readonly unknown[]) => mockResponse({ count: rows.length, data: rows, error: null });

  it("asks for the exact count and only the columns it shows, without a row limit", async () => {
    mockRows([]);

    await getPeriodPurchases(WEEK_BOUNDS);

    // Nombres literales a propósito: fijan el contrato con la base (016).
    expect(fromMock).toHaveBeenCalledWith("purchase_sessions");
    expect(selectMock).toHaveBeenCalledWith("id, closed_at, total_amount, stores(display_name)", { count: "exact" });
    // La cadena falsa no tiene limit ni range: si se agregaran, este test fallaría.
    expect(orderMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [SPENDING_PERIOD.DAY, new Date(2026, 9, 18), new Date(2026, 9, 19)],
    [SPENDING_PERIOD.WEEK, new Date(2026, 9, 12), new Date(2026, 9, 19)],
    [SPENDING_PERIOD.MONTH, new Date(2026, 9, 1), new Date(2026, 10, 1)],
  ])("filters the %s by closed_at, start included and end excluded", async (period, start, end) => {
    mockRows([]);

    await getPeriodPurchases(getPeriodBounds(period, NOW));

    expect(gteMock).toHaveBeenCalledWith("closed_at", start.toISOString());
    expect(ltMock).toHaveBeenCalledWith("closed_at", end.toISOString());
  });

  it("orders from the most recent to the oldest, with the id as a tiebreaker", async () => {
    mockRows([]);

    await getPeriodPurchases(WEEK_BOUNDS);

    expect(orderMock).toHaveBeenNthCalledWith(1, "closed_at", { ascending: false });
    expect(orderMock).toHaveBeenNthCalledWith(2, "id");
  });

  it("never filters by owner: the RLS returns only the user's own purchases", async () => {
    mockRows([]);

    await getPeriodPurchases(WEEK_BOUNDS);

    expect(
      JSON.stringify([selectMock.mock.calls, gteMock.mock.calls, ltMock.mock.calls, orderMock.mock.calls]),
    ).not.toContain("owner_id");
  });

  it("maps a row to the model", async () => {
    mockRows([buildRow()]);

    await expect(getPeriodPurchases(WEEK_BOUNDS)).resolves.toEqual([
      { closedAt: CLOSED_AT, id: "purchase-1", storeName: "MaxiPali", totalAmount: 10000 },
    ]);
  });

  it("keeps a null total and a real zero total apart (D8)", async () => {
    mockRows([buildRow({ id: "without-total", total_amount: null }), buildRow({ id: "zero", total_amount: 0 })]);

    const purchases = await getPeriodPurchases(WEEK_BOUNDS);

    expect(purchases.map((purchase) => purchase.totalAmount)).toEqual([null, 0]);
  });

  it("returns an empty list when there are no purchases", async () => {
    mockResponse({ count: 0, data: [], error: null });

    await expect(getPeriodPurchases(WEEK_BOUNDS)).resolves.toEqual([]);
  });

  it.each([
    ["a null relation", null],
    ["a null name", { display_name: null }],
    ["an empty name", { display_name: "" }],
    ["a blank name", { display_name: "   " }],
  ])("keeps the row with a null store name for %s (rule 29)", async (_caseName, stores) => {
    mockRows([buildRow({ stores })]);

    await expect(getPeriodPurchases(WEEK_BOUNDS)).resolves.toEqual([
      { closedAt: CLOSED_AT, id: "purchase-1", storeName: null, totalAmount: 10000 },
    ]);
  });

  it.each([
    ["more rows exist than the ones received", 2],
    ["fewer rows exist than the ones received", 0],
    ["the count is missing", null],
  ])("throws when %s (rule 30)", async (_caseName, count) => {
    mockResponse({ count, data: [buildRow()], error: null });

    await expect(getPeriodPurchases(WEEK_BOUNDS)).rejects.toThrow(
      `${FINANCE_DB.TABLE.PURCHASE_SESSIONS} devolvió un resultado incompleto`,
    );
  });

  it("throws on a row without closed_at, which the filter should have left out", async () => {
    mockRows([buildRow({ closed_at: null })]);

    await expect(getPeriodPurchases(WEEK_BOUNDS)).rejects.toThrow(
      `${FINANCE_DB.TABLE.PURCHASE_SESSIONS} devolvió una compra sin cierre`,
    );
  });

  it("rejects bounds that do not move forward without calling the database", async () => {
    const start = new Date(2026, 9, 12);

    await expect(getPeriodPurchases({ end: start, start })).rejects.toThrow(RangeError);
    await expect(getPeriodPurchases({ end: new Date(2026, 9, 11), start })).rejects.toThrow(RangeError);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("rethrows the Supabase error", async () => {
    mockResponse({ count: null, data: null, error: SUPABASE_ERROR });

    await expect(getPeriodPurchases(WEEK_BOUNDS)).rejects.toBe(SUPABASE_ERROR);
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
      .mockResolvedValueOnce({ data: { amount: COLONES_AMOUNT.MAX, owner_id: "user-a", period: "month" }, error: null });

    await expect(setSpendingBudget(SPENDING_PERIOD.MONTH, 0)).resolves.toBe(0);
    await expect(setSpendingBudget(SPENDING_PERIOD.MONTH, COLONES_AMOUNT.MAX)).resolves.toBe(COLONES_AMOUNT.MAX);
  });

  it.each([-1, 12.5, COLONES_AMOUNT.MAX + 1, Number.NaN, Number.POSITIVE_INFINITY])(
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

// Los errores de las dos ediciones: el motivo sale solo de error.code, con
// cualquier texto interno y cualquier estado HTTP (SPEC §7). P0002 suele llegar
// con un 500.
const SAVE_ERROR_CASES = [
  ["23514", TOTAL_SAVE_ERROR.NEGATIVE_PERIOD, 400],
  ["TZ001", TOTAL_SAVE_ERROR.TIME_ZONE_MISSING, 400],
  ["TZ002", TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED, 400],
  ["P0002", TOTAL_SAVE_ERROR.PURCHASE_UNAVAILABLE, 500],
  ["42501", TOTAL_SAVE_ERROR.GENERAL, 401],
  ["22023", TOTAL_SAVE_ERROR.GENERAL, 400],
  ["XX000", TOTAL_SAVE_ERROR.GENERAL, 500],
] as const;

const INVALID_TOTALS = [-1, 12.5, COLONES_AMOUNT.MAX + 1, Number.NaN, Number.POSITIVE_INFINITY];

describe("setPurchaseTotal", () => {
  const PURCHASE_ID = "purchase-1";
  const SAVED_PURCHASE = {
    closed_at: "2025-01-15T13:00:00+00:00",
    household_id: null,
    id: PURCHASE_ID,
    list_id: null,
    owner_id: "user-a",
    started_at: "2025-01-15T12:00:00+00:00",
    store_id: "store-1",
    total_amount: 12000,
  };

  it("sends only the purchase and the total: the owner and the time zone come from the database", async () => {
    rpcMock.mockResolvedValue({ data: SAVED_PURCHASE, error: null });

    await setPurchaseTotal({ purchaseId: PURCHASE_ID, total: 12000 });

    // Nombres literales a propósito: fijan el contrato con la base (040).
    expect(rpcMock).toHaveBeenCalledWith("set_purchase_session_total", {
      new_total: 12000,
      target_session_id: PURCHASE_ID,
    });
  });

  it("gives the saved purchase with its original date, also an old one (rules 47 and 48)", async () => {
    rpcMock.mockResolvedValue({ data: SAVED_PURCHASE, error: null });

    await expect(setPurchaseTotal({ purchaseId: PURCHASE_ID, total: 12000 })).resolves.toEqual({
      closedAt: "2025-01-15T13:00:00+00:00",
      id: PURCHASE_ID,
      totalAmount: 12000,
    });
  });

  it("saves ₡0 as a real total", async () => {
    rpcMock.mockResolvedValue({ data: { ...SAVED_PURCHASE, total_amount: 0 }, error: null });

    await expect(setPurchaseTotal({ purchaseId: PURCHASE_ID, total: 0 })).resolves.toMatchObject({ totalAmount: 0 });
  });

  it("accepts the top amount", async () => {
    rpcMock.mockResolvedValue({ data: { ...SAVED_PURCHASE, total_amount: COLONES_AMOUNT.MAX }, error: null });

    await expect(setPurchaseTotal({ purchaseId: PURCHASE_ID, total: COLONES_AMOUNT.MAX })).resolves.toMatchObject({
      totalAmount: COLONES_AMOUNT.MAX,
    });
  });

  it.each(INVALID_TOTALS)("rejects %s without calling the database", async (total) => {
    await expect(setPurchaseTotal({ purchaseId: PURCHASE_ID, total })).rejects.toThrow(RangeError);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each(SAVE_ERROR_CASES)("gives code %s as the reason %s (HTTP %s)", async (code, reason, status) => {
    const supabaseError = { code, details: null, hint: null, message: "texto interno cualquiera", status };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    const failure = await setPurchaseTotal({ purchaseId: PURCHASE_ID, total: 12000 }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TotalSaveError);
    expect(toTotalSaveErrorReason(failure)).toBe(reason);
    // El error de Supabase queda como causa, nunca como mensaje.
    expect(failure).toEqual(expect.objectContaining({ cause: supabaseError, reason }));
    expect(String(failure)).not.toContain("texto interno");
  });

  it.each([
    ["another purchase", { ...SAVED_PURCHASE, id: "purchase-2" }],
    ["an open purchase", { ...SAVED_PURCHASE, closed_at: null }],
    ["another total", { ...SAVED_PURCHASE, total_amount: 5000 }],
  ])("fails when the database returns %s", async (_, data) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(setPurchaseTotal({ purchaseId: PURCHASE_ID, total: 12000 })).rejects.toThrow("otra compra");
  });
});

describe("setPeriodTotal", () => {
  const SAVED_ADJUSTMENT = {
    amount: -2500.5,
    effective_at: "2026-10-18T21:00:00.123456+00:00",
    id: "adjustment-1",
    owner_id: "user-a",
    scope: "week",
  };

  it("sends only the scope and the wanted total, never the difference nor the bounds (D15)", async () => {
    rpcMock.mockResolvedValue({ data: [SAVED_ADJUSTMENT], error: null });

    await setPeriodTotal({ period: SPENDING_PERIOD.WEEK, total: 20000 });

    // Nombres literales a propósito: fijan el contrato con la base (040).
    expect(rpcMock).toHaveBeenCalledWith("set_period_total", { target_scope: "week", target_total: 20000 });
  });

  it("gives the saved adjustment without its owner", async () => {
    rpcMock.mockResolvedValue({ data: [SAVED_ADJUSTMENT], error: null });

    await expect(setPeriodTotal({ period: SPENDING_PERIOD.WEEK, total: 20000 })).resolves.toEqual({
      adjustment: {
        amount: -2500.5,
        effectiveAt: "2026-10-18T21:00:00.123456+00:00",
        id: "adjustment-1",
        scope: SPENDING_PERIOD.WEEK,
      },
    });
  });

  it("gives no adjustment when the difference was 0 and it was removed (rule 50)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await expect(setPeriodTotal({ period: SPENDING_PERIOD.DAY, total: 0 })).resolves.toEqual({ adjustment: null });
  });

  it.each(INVALID_TOTALS)("rejects %s without calling the database", async (total) => {
    await expect(setPeriodTotal({ period: SPENDING_PERIOD.WEEK, total })).rejects.toThrow(RangeError);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each(SAVE_ERROR_CASES)("gives code %s as the reason %s (HTTP %s)", async (code, reason, status) => {
    rpcMock.mockResolvedValue({ data: null, error: { code, details: null, hint: null, message: "texto interno", status } });

    const failure = await setPeriodTotal({ period: SPENDING_PERIOD.WEEK, total: 20000 }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TotalSaveError);
    expect(toTotalSaveErrorReason(failure)).toBe(reason);
  });

  it("fails when the database returns more than one adjustment", async () => {
    rpcMock.mockResolvedValue({ data: [SAVED_ADJUSTMENT, { ...SAVED_ADJUSTMENT, id: "adjustment-2" }], error: null });

    await expect(setPeriodTotal({ period: SPENDING_PERIOD.WEEK, total: 20000 })).rejects.toThrow("más de un ajuste");
  });

  it("fails when the database returns an adjustment of another period", async () => {
    rpcMock.mockResolvedValue({ data: [{ ...SAVED_ADJUSTMENT, scope: "month" }], error: null });

    await expect(setPeriodTotal({ period: SPENDING_PERIOD.WEEK, total: 20000 })).rejects.toThrow("otro periodo");
  });
});

describe("toTotalSaveErrorReason", () => {
  it("treats any error that is not a TotalSaveError as the general one", () => {
    expect(toTotalSaveErrorReason(new Error("network"))).toBe(TOTAL_SAVE_ERROR.GENERAL);
    expect(toTotalSaveErrorReason(new RangeError("total"))).toBe(TOTAL_SAVE_ERROR.GENERAL);
    expect(toTotalSaveErrorReason("texto")).toBe(TOTAL_SAVE_ERROR.GENERAL);
  });
});

describe("setSpendingTimeZone", () => {
  it("sends only the time zone: the owner comes from the database", async () => {
    rpcMock.mockResolvedValue({ data: { owner_id: "user-a", time_zone: "America/Costa_Rica" }, error: null });

    await expect(setSpendingTimeZone({ timeZone: "America/Costa_Rica" })).resolves.toEqual({
      timeZone: "America/Costa_Rica",
    });
    // Nombre literal a propósito: fija el contrato con la base (040).
    expect(rpcMock).toHaveBeenCalledWith("set_spending_time_zone", { new_time_zone: "America/Costa_Rica" });
  });

  it.each([
    ["23514", TOTAL_SAVE_ERROR.NEGATIVE_PERIOD],
    ["22023", TOTAL_SAVE_ERROR.GENERAL],
    ["42501", TOTAL_SAVE_ERROR.GENERAL],
  ] as const)("gives code %s as the reason %s", async (code, reason) => {
    rpcMock.mockResolvedValue({ data: null, error: { code, details: null, hint: null, message: "texto interno" } });

    const failure = await setSpendingTimeZone({ timeZone: "America/Costa_Rica" }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TotalSaveError);
    expect(toTotalSaveErrorReason(failure)).toBe(reason);
  });

  it("fails when the database saves another time zone", async () => {
    rpcMock.mockResolvedValue({ data: { owner_id: "user-a", time_zone: "UTC" }, error: null });

    await expect(setSpendingTimeZone({ timeZone: "America/Costa_Rica" })).rejects.toThrow("otra zona");
  });
});