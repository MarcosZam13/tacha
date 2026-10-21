// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUDGET_STATUS, FINANCE_TEXT, SPENDING_PERIOD } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import { useSpendingBudgets } from "../hooks/useSpendingBudgets";
import type { SpendingBudgets } from "../models/SpendingBudgets.type";
import { getSpendingBudgets, setSpendingBudget } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  getSpendingBudgets: vi.fn(),
  setSpendingBudget: vi.fn(),
}));
const budgetsMock = vi.mocked(getSpendingBudgets);
const saveMock = vi.mocked(setSpendingBudget);

const BUDGETS: SpendingBudgets = { day: null, month: 200000, week: 50000 };

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderBudgets = (period: SpendingPeriodType = SPENDING_PERIOD.WEEK, isEnabled = true) =>
  renderHook(({ hookPeriod, hookIsEnabled }) => useSpendingBudgets(hookPeriod, hookIsEnabled), {
    initialProps: { hookIsEnabled: isEnabled, hookPeriod: period },
  });

// Con los presupuestos ya cargados.
const renderLoaded = async (period: SpendingPeriodType = SPENDING_PERIOD.WEEK) => {
  const rendered = renderBudgets(period);
  await waitFor(() => expect(rendered.result.current.status).toBe(BUDGET_STATUS.VIEWING));
  return rendered;
};

beforeEach(() => {
  vi.resetAllMocks();
  budgetsMock.mockResolvedValue(BUDGETS);
});

// Sin globals, Testing Library no desmonta solo entre tests.
afterEach(cleanup);

describe("useSpendingBudgets: loading", () => {
  it("asks for nothing without a registered account", () => {
    const { result } = renderBudgets(SPENDING_PERIOD.WEEK, false);

    expect(result.current.status).toBe(BUDGET_STATUS.LOADING);
    expect(budgetsMock).not.toHaveBeenCalled();
  });

  it("loads the three budgets once and shows the one of the chosen period", async () => {
    const { result, rerender } = await renderLoaded();

    expect(result.current.amount).toBe(50000);

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.MONTH });
    expect(result.current.amount).toBe(200000);
    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.DAY });
    expect(result.current.amount).toBeNull();
    // Cambiar de periodo no los vuelve a pedir.
    expect(budgetsMock).toHaveBeenCalledTimes(1);
  });

  it("does not allow editing when loading failed, and retries", async () => {
    budgetsMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderBudgets();
    await waitFor(() => expect(result.current.status).toBe(BUDGET_STATUS.LOAD_FAILED));

    act(() => result.current.onEdit());
    expect(result.current.status).toBe(BUDGET_STATUS.LOAD_FAILED);

    act(() => result.current.onRetry());
    await waitFor(() => expect(result.current.status).toBe(BUDGET_STATUS.VIEWING));
    expect(budgetsMock).toHaveBeenCalledTimes(2);
  });
});

describe("useSpendingBudgets: editing", () => {
  it("opens the field with the current amount, or empty without a budget", async () => {
    const { result, rerender } = await renderLoaded();

    act(() => result.current.onEdit());
    expect(result.current.status).toBe(BUDGET_STATUS.EDITING);
    expect(result.current.editText).toBe("50000");

    act(() => result.current.onCancel());
    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.DAY });
    act(() => result.current.onEdit());
    expect(result.current.editText).toBe("");
  });

  it("rejects an invalid amount without calling the database", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.onEdit());

    act(() => result.current.onTextChange("12.5"));
    act(() => result.current.onSave());

    expect(result.current.status).toBe(BUDGET_STATUS.EDITING);
    expect(result.current.editErrorMessage).toBe(FINANCE_TEXT.BUDGET_INVALID);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("rejects an empty field: a budget always has an amount", async () => {
    const { result } = await renderLoaded(SPENDING_PERIOD.DAY);
    act(() => result.current.onEdit());

    act(() => result.current.onSave());

    expect(result.current.editErrorMessage).toBe(FINANCE_TEXT.BUDGET_INVALID);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("saves, shows the new amount and announces it", async () => {
    saveMock.mockResolvedValue(12000);
    const { result } = await renderLoaded();
    act(() => result.current.onEdit());
    act(() => result.current.onTextChange("12 000"));

    await act(async () => result.current.onSave());

    expect(saveMock).toHaveBeenCalledWith(SPENDING_PERIOD.WEEK, 12000);
    expect(result.current.status).toBe(BUDGET_STATUS.VIEWING);
    expect(result.current.amount).toBe(12000);
    expect(result.current.noticeMessage).toBe(FINANCE_TEXT.BUDGET_SAVED);
  });

  it("changes only the budget of the chosen period", async () => {
    saveMock.mockResolvedValue(12000);
    const { result, rerender } = await renderLoaded();
    act(() => result.current.onEdit());
    act(() => result.current.onTextChange("12000"));
    await act(async () => result.current.onSave());

    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.MONTH });

    expect(result.current.amount).toBe(200000);
    // El aviso es del semanal: no se ve en otro periodo.
    expect(result.current.noticeMessage).toBeNull();
  });

  it("keeps what was written when saving fails, and can retry", async () => {
    saveMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(30000);
    const { result } = await renderLoaded();
    act(() => result.current.onEdit());
    act(() => result.current.onTextChange("30000"));

    await act(async () => result.current.onSave());

    expect(result.current.status).toBe(BUDGET_STATUS.SAVE_FAILED);
    expect(result.current.editErrorMessage).toBe(FINANCE_TEXT.BUDGET_SAVE_ERROR);
    expect(result.current.editText).toBe("30000");
    expect(result.current.amount).toBe(50000);

    await act(async () => result.current.onSave());

    expect(result.current.status).toBe(BUDGET_STATUS.VIEWING);
    expect(result.current.amount).toBe(30000);
  });

  it("sends a single request on a double click and cannot be cancelled while saving", async () => {
    const pendingSave = createPending<number>();
    saveMock.mockReturnValue(pendingSave.promise);
    const { result } = await renderLoaded();
    act(() => result.current.onEdit());

    // Los dos clics en el mismo render: ven el mismo estado.
    act(() => {
      result.current.onSave();
      result.current.onSave();
    });
    expect(result.current.status).toBe(BUDGET_STATUS.SAVING);
    act(() => result.current.onCancel());
    expect(result.current.status).toBe(BUDGET_STATUS.SAVING);

    await act(async () => pendingSave.resolve(50000));
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("discards what was written when cancelling or changing the period", async () => {
    const { result, rerender } = await renderLoaded();
    act(() => result.current.onEdit());
    act(() => result.current.onTextChange("99999"));

    act(() => result.current.onCancel());
    expect(result.current.status).toBe(BUDGET_STATUS.VIEWING);

    act(() => result.current.onEdit());
    act(() => result.current.onTextChange("99999"));
    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.DAY });
    expect(result.current.status).toBe(BUDGET_STATUS.VIEWING);
    rerender({ hookIsEnabled: true, hookPeriod: SPENDING_PERIOD.WEEK });
    expect(result.current.status).toBe(BUDGET_STATUS.VIEWING);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
