// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FINANCE_TEXT,
  SPENDING_PERIOD,
  TOTAL_EDIT_STATUS,
  TOTAL_EDIT_TARGET,
  TOTAL_SAVE_ERROR,
  TOTAL_SAVE_ERROR_MESSAGE,
} from "../constants/finance.constants";
import type { SpendingPeriodType, TotalSaveErrorType } from "../constants/finance.constants";
import { useTotalEdit } from "../hooks/useTotalEdit";
import type { TotalEditTarget } from "../hooks/useTotalEdit";
import { TotalSaveError } from "../models/TotalMutations.interface";
import type { SetPurchaseTotalResponse } from "../models/TotalMutations.interface";
import { setPeriodTotal, setPurchaseTotal, setSpendingTimeZone } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  setPeriodTotal: vi.fn(),
  setPurchaseTotal: vi.fn(),
  setSpendingTimeZone: vi.fn(),
}));
const purchaseSaveMock = vi.mocked(setPurchaseTotal);
const periodSaveMock = vi.mocked(setPeriodTotal);
const timeZoneSaveMock = vi.mocked(setSpendingTimeZone);

const BROWSER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const PURCHASE_A: TotalEditTarget = { purchaseId: "purchase-a", type: TOTAL_EDIT_TARGET.PURCHASE };
const PURCHASE_B: TotalEditTarget = { purchaseId: "purchase-b", type: TOTAL_EDIT_TARGET.PURCHASE };
const WEEK: TotalEditTarget = { period: SPENDING_PERIOD.WEEK, type: TOTAL_EDIT_TARGET.PERIOD };
const SAVED_PURCHASE: SetPurchaseTotalResponse = { closedAt: "2026-10-18T16:00:00Z", id: "purchase-a", totalAmount: 12000 };

const saveError = (reason: TotalSaveErrorType): TotalSaveError => new TotalSaveError(reason, { code: "x" });

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const onPurchaseSaved = vi.fn();
const onPeriodTotalSaved = vi.fn();
const onReadTimeZoneConfirmed = vi.fn();

const renderEdit = (period: SpendingPeriodType = SPENDING_PERIOD.WEEK) =>
  renderHook(
    ({ hookPeriod }) => useTotalEdit({ onPeriodTotalSaved, onPurchaseSaved, onReadTimeZoneConfirmed, period: hookPeriod }),
    { initialProps: { hookPeriod: period } },
  );

// Abre un total, escribe y guarda.
const editAndSave = (result: ReturnType<typeof renderEdit>["result"], target: TotalEditTarget, text: string) => {
  act(() => result.current.onEdit(target, ""));
  act(() => result.current.onTextChange(text));
  act(() => result.current.onSave());
};

beforeEach(() => {
  vi.resetAllMocks();
  purchaseSaveMock.mockResolvedValue(SAVED_PURCHASE);
  periodSaveMock.mockResolvedValue({ adjustment: null });
  timeZoneSaveMock.mockResolvedValue({ timeZone: BROWSER_TIME_ZONE });
});

afterEach(() => {
  cleanup();
});

describe("useTotalEdit: open, write and cancel", () => {
  it("starts with no field open", () => {
    const { result } = renderEdit();

    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING);
    expect(result.current.editTarget).toBeNull();
  });

  it("opens with the given text and keeps what is written", () => {
    const { result } = renderEdit();

    act(() => result.current.onEdit(PURCHASE_A, "10000"));
    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.EDITING);
    expect(result.current.editTarget).toEqual(PURCHASE_A);
    expect(result.current.editText).toBe("10000");

    act(() => result.current.onTextChange("12 000"));
    expect(result.current.editText).toBe("12 000");
  });

  it("discards what was written on cancel", () => {
    const { result } = renderEdit();
    act(() => result.current.onEdit(PURCHASE_A, "10000"));

    act(() => result.current.onCancel());

    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING);
    expect(result.current.editText).toBe("");
  });

  it("keeps a single field open: opening another closes the first (D21)", () => {
    const { result } = renderEdit();
    act(() => result.current.onEdit(PURCHASE_A, "10000"));
    act(() => result.current.onTextChange("999"));

    act(() => result.current.onEdit(PURCHASE_B, "5000"));

    expect(result.current.editTarget).toEqual(PURCHASE_B);
    expect(result.current.editText).toBe("5000");
  });

  it("discards what was written when the period changes (rule 55)", () => {
    const { rerender, result } = renderEdit();
    act(() => result.current.onEdit(WEEK, "20000"));

    rerender({ hookPeriod: SPENDING_PERIOD.MONTH });
    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING);

    rerender({ hookPeriod: SPENDING_PERIOD.WEEK });
    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING);
  });
});

describe("useTotalEdit: validation", () => {
  it.each(["", "   ", "12.5", "abc", "-5", "10000000000"])(
    "rejects %j without calling the database (D13, D14, rule 46)",
    (text) => {
      const { result } = renderEdit();

      editAndSave(result, PURCHASE_A, text);

      expect(result.current.status).toBe(TOTAL_EDIT_STATUS.EDITING);
      expect(result.current.editErrorMessage).toBe(FINANCE_TEXT.TOTAL_INVALID);
      expect(result.current.editText).toBe(text);
      expect(purchaseSaveMock).not.toHaveBeenCalled();
    },
  );

  it("accepts ₡0 as a real total (rule 47)", async () => {
    const { result } = renderEdit();

    editAndSave(result, PURCHASE_A, "0");

    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING));
    expect(purchaseSaveMock).toHaveBeenCalledWith({ purchaseId: "purchase-a", total: 0 });
  });
});

describe("useTotalEdit: saving", () => {
  it("saves a purchase total, closes the field and hands over what was saved", async () => {
    const answer = createPending<SetPurchaseTotalResponse>();
    purchaseSaveMock.mockReturnValueOnce(answer.promise);
    const { result } = renderEdit();

    editAndSave(result, PURCHASE_A, "12 000");

    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVING);
    expect(purchaseSaveMock).toHaveBeenCalledWith({ purchaseId: "purchase-a", total: 12000 });
    await act(async () => answer.resolve(SAVED_PURCHASE));

    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING);
    expect(onPurchaseSaved).toHaveBeenCalledWith(SAVED_PURCHASE);
    expect(result.current.hasSaved).toBe(true);
  });

  it("saves the period total with the wanted total, never the difference (D15)", async () => {
    const saved = { adjustment: null };
    periodSaveMock.mockResolvedValueOnce(saved);
    const { result } = renderEdit();

    editAndSave(result, WEEK, "20000");

    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING));
    expect(periodSaveMock).toHaveBeenCalledWith({ period: SPENDING_PERIOD.WEEK, total: 20000 });
    expect(onPeriodTotalSaved).toHaveBeenCalledWith(SPENDING_PERIOD.WEEK, saved, 20000);
    expect(purchaseSaveMock).not.toHaveBeenCalled();
  });

  it("sends a single call on a double click (rule 56)", async () => {
    const { result } = renderEdit();
    act(() => result.current.onEdit(PURCHASE_A, "12000"));

    act(() => {
      result.current.onSave();
      result.current.onSave();
    });

    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING));
    expect(purchaseSaveMock).toHaveBeenCalledTimes(1);
  });

  it("does not open, write nor cancel while saving (D21, rule 56)", async () => {
    const answer = createPending<SetPurchaseTotalResponse>();
    purchaseSaveMock.mockReturnValueOnce(answer.promise);
    const { result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");

    act(() => result.current.onEdit(PURCHASE_B, "1"));
    act(() => result.current.onTextChange("1"));
    act(() => result.current.onCancel());

    expect(result.current.editTarget).toEqual(PURCHASE_A);
    expect(result.current.editText).toBe("12000");
    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVING);
    await act(async () => answer.resolve(SAVED_PURCHASE));
  });

  it("forgets «Total guardado» when editing again or changing period", async () => {
    const { rerender, result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.hasSaved).toBe(true));

    act(() => result.current.onEdit(PURCHASE_B, ""));
    expect(result.current.hasSaved).toBe(false);

    act(() => result.current.onCancel());
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.hasSaved).toBe(true));
    rerender({ hookPeriod: SPENDING_PERIOD.DAY });
    expect(result.current.hasSaved).toBe(false);
  });

  it("keeps saving across a period change and hands over the answer (rule 55)", async () => {
    const answer = createPending<SetPurchaseTotalResponse>();
    purchaseSaveMock.mockReturnValueOnce(answer.promise);
    const { rerender, result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");

    rerender({ hookPeriod: SPENDING_PERIOD.MONTH });
    await act(async () => answer.resolve(SAVED_PURCHASE));

    expect(onPurchaseSaved).toHaveBeenCalledWith(SAVED_PURCHASE);
    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING);
  });

  it("ignores the answer if the screen closes while saving", async () => {
    const answer = createPending<SetPurchaseTotalResponse>();
    purchaseSaveMock.mockReturnValueOnce(answer.promise);
    const { result, unmount } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");

    unmount();
    await act(async () => answer.resolve(SAVED_PURCHASE));

    expect(onPurchaseSaved).not.toHaveBeenCalled();
  });
});

describe("useTotalEdit: save errors (SPEC §7)", () => {
  it.each([
    TOTAL_SAVE_ERROR.NEGATIVE_PERIOD,
    TOTAL_SAVE_ERROR.PURCHASE_UNAVAILABLE,
    TOTAL_SAVE_ERROR.GENERAL,
  ])("shows the message of %s and keeps what was written", async (reason) => {
    purchaseSaveMock.mockRejectedValueOnce(saveError(reason));
    const { result } = renderEdit();

    editAndSave(result, PURCHASE_A, "12000");

    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVE_FAILED));
    expect(result.current.editErrorMessage).toBe(TOTAL_SAVE_ERROR_MESSAGE[reason]);
    expect(result.current.editText).toBe("12000");
    expect(result.current.timeZoneToConfirm).toBeNull();
    expect(onPurchaseSaved).not.toHaveBeenCalled();
  });

  it("shows the general message for any error that is not a TotalSaveError", async () => {
    purchaseSaveMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderEdit();

    editAndSave(result, PURCHASE_A, "12000");

    await waitFor(() =>
      expect(result.current.editErrorMessage).toBe(TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.GENERAL]),
    );
  });

  it("saves again after a failure", async () => {
    purchaseSaveMock.mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.GENERAL));
    const { result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVE_FAILED));

    act(() => result.current.onSave());

    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING));
    expect(purchaseSaveMock).toHaveBeenCalledTimes(2);
  });
});

describe("useTotalEdit: time zone confirmation (rule 59)", () => {
  it.each([TOTAL_SAVE_ERROR.TIME_ZONE_MISSING, TOTAL_SAVE_ERROR.TIME_ZONE_UNRECOGNIZED])(
    "proposes the browser time zone with %s and never saves it alone",
    async (reason) => {
      purchaseSaveMock.mockRejectedValueOnce(saveError(reason));
      const { result } = renderEdit();

      editAndSave(result, PURCHASE_A, "12000");

      await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVE_FAILED));
      expect(result.current.editErrorMessage).toBe(TOTAL_SAVE_ERROR_MESSAGE[reason]);
      expect(result.current.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE);
      expect(result.current.editText).toBe("12000");
      expect(timeZoneSaveMock).not.toHaveBeenCalled();
    },
  );

  it("saves the time zone only on «Confirmar» and repeats the same save", async () => {
    purchaseSaveMock.mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.TIME_ZONE_MISSING));
    const { result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE));

    act(() => result.current.onConfirmTimeZone());

    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVING);
    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.VIEWING));
    expect(timeZoneSaveMock).toHaveBeenCalledWith({ timeZone: BROWSER_TIME_ZONE });
    expect(purchaseSaveMock).toHaveBeenCalledTimes(2);
    expect(purchaseSaveMock).toHaveBeenLastCalledWith({ purchaseId: "purchase-a", total: 12000 });
    expect(onPurchaseSaved).toHaveBeenCalledWith(SAVED_PURCHASE);
  });

  it("does nothing on «Confirmar» when no time zone is needed", () => {
    const { result } = renderEdit();
    act(() => result.current.onEdit(PURCHASE_A, "12000"));

    act(() => result.current.onConfirmTimeZone());

    expect(timeZoneSaveMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe(TOTAL_EDIT_STATUS.EDITING);
  });

  it("keeps the previous time zone and stops proposing it when it would leave a period negative", async () => {
    purchaseSaveMock.mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.TIME_ZONE_MISSING));
    timeZoneSaveMock.mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.NEGATIVE_PERIOD));
    const { result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE));

    act(() => result.current.onConfirmTimeZone());

    await waitFor(() => expect(result.current.status).toBe(TOTAL_EDIT_STATUS.SAVE_FAILED));
    expect(result.current.editErrorMessage).toBe(FINANCE_TEXT.TIME_ZONE_REJECTED);
    expect(result.current.timeZoneToConfirm).toBeNull();
    expect(result.current.editText).toBe("12000");
    expect(purchaseSaveMock).toHaveBeenCalledTimes(1);
  });

  it("shows the general message when the time zone cannot be saved for another reason", async () => {
    purchaseSaveMock.mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.TIME_ZONE_MISSING));
    timeZoneSaveMock.mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.GENERAL));
    const { result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE));

    act(() => result.current.onConfirmTimeZone());

    await waitFor(() =>
      expect(result.current.editErrorMessage).toBe(TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.GENERAL]),
    );
    expect(purchaseSaveMock).toHaveBeenCalledTimes(1);
  });

  it("asks to confirm again when the repeated save still has no time zone", async () => {
    purchaseSaveMock
      .mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.TIME_ZONE_MISSING))
      .mockRejectedValueOnce(saveError(TOTAL_SAVE_ERROR.NEGATIVE_PERIOD));
    const { result } = renderEdit();
    editAndSave(result, PURCHASE_A, "12000");
    await waitFor(() => expect(result.current.timeZoneToConfirm).toBe(BROWSER_TIME_ZONE));

    act(() => result.current.onConfirmTimeZone());

    // La zona quedó guardada; el total se rechaza por D18, con su propio mensaje.
    await waitFor(() =>
      expect(result.current.editErrorMessage).toBe(TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.NEGATIVE_PERIOD]),
    );
    expect(result.current.timeZoneToConfirm).toBeNull();
  });
});

describe("useTotalEdit: time zone confirmation from the read (TZ002, rule 60)", () => {
  it("proposes the browser time zone and asks to read again once saved", async () => {
    const { result } = renderEdit();
    expect(result.current.readTimeZoneConfirmation.timeZone).toBe(BROWSER_TIME_ZONE);

    act(() => result.current.onConfirmReadTimeZone());

    expect(result.current.readTimeZoneConfirmation.isSaving).toBe(true);
    await waitFor(() => expect(onReadTimeZoneConfirmed).toHaveBeenCalledTimes(1));
    expect(timeZoneSaveMock).toHaveBeenCalledWith({ timeZone: BROWSER_TIME_ZONE });
    expect(result.current.readTimeZoneConfirmation.isSaving).toBe(false);
  });

  it.each([
    [TOTAL_SAVE_ERROR.NEGATIVE_PERIOD, FINANCE_TEXT.TIME_ZONE_REJECTED],
    [TOTAL_SAVE_ERROR.GENERAL, TOTAL_SAVE_ERROR_MESSAGE[TOTAL_SAVE_ERROR.GENERAL]],
  ])("shows why the time zone was not saved (%s)", async (reason, message) => {
    timeZoneSaveMock.mockRejectedValueOnce(saveError(reason));
    const { result } = renderEdit();

    act(() => result.current.onConfirmReadTimeZone());

    await waitFor(() => expect(result.current.readTimeZoneConfirmation.errorMessage).toBe(message));
    expect(onReadTimeZoneConfirmed).not.toHaveBeenCalled();
  });

  it("sends a single call on a double click", async () => {
    const { result } = renderEdit();

    act(() => {
      result.current.onConfirmReadTimeZone();
      result.current.onConfirmReadTimeZone();
    });

    await waitFor(() => expect(onReadTimeZoneConfirmed).toHaveBeenCalledTimes(1));
    expect(timeZoneSaveMock).toHaveBeenCalledTimes(1);
  });
});
