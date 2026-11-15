import { describe, expect, it, vi } from "vitest";
import { FINANCE_TEXT, PENDING_REMINDER_STATUS } from "../constants/finance.constants";
import { toPendingTotalReminder } from "../utils/toPendingTotalReminder";

const HISTORY_ANCHOR = "#compras-sin-total";

describe("toPendingTotalReminder (SCRUM-92, SPEC §8)", () => {
  it("says it in singular for one purchase", () => {
    expect(toPendingTotalReminder(PENDING_REMINDER_STATUS.PENDING, 1, HISTORY_ANCHOR, vi.fn())).toMatchObject({
      errorMessage: null,
      linkHref: HISTORY_ANCHOR,
      linkText: "Completarla",
      messageText: "Tienes 1 compra sin total desde hace más de 24 horas",
    });
  });

  it("says it in plural for several purchases", () => {
    expect(toPendingTotalReminder(PENDING_REMINDER_STATUS.PENDING, 3, HISTORY_ANCHOR, vi.fn())).toMatchObject({
      linkText: "Completarlas",
      messageText: "Tienes 3 compras sin total desde hace más de 24 horas",
    });
  });

  it("gives the load error only when the read failed (rule 67)", () => {
    const failed = toPendingTotalReminder(PENDING_REMINDER_STATUS.FAILED, 0, HISTORY_ANCHOR, vi.fn());

    expect(failed.errorMessage).toBe(FINANCE_TEXT.PENDING_REMINDER_LOAD_ERROR);
    expect(failed.messageText).toBeNull();
  });

  it.each([PENDING_REMINDER_STATUS.LOADING, PENDING_REMINDER_STATUS.NONE])("gives no text while %s", (status) => {
    expect(toPendingTotalReminder(status, 0, HISTORY_ANCHOR, vi.fn())).toMatchObject({
      errorMessage: null,
      messageText: null,
      status,
    });
  });

  it("keeps where the link goes and the retry it was given", () => {
    const onRetry = vi.fn();
    const reminder = toPendingTotalReminder(PENDING_REMINDER_STATUS.FAILED, 0, "/finanzas/historial#compras-sin-total", onRetry);

    reminder.onRetry();

    expect(reminder.linkHref).toBe("/finanzas/historial#compras-sin-total");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
