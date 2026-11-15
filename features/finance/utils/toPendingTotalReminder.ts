import { FINANCE_TEXT, PENDING_REMINDER_STATUS } from "../constants/finance.constants";
import type { PendingReminderStatusType } from "../constants/finance.constants";
import type { PendingTotalReminderProps } from "../components/models/PendingTotalReminderProps.interface";

/**
 * Los textos del recordatorio (SCRUM-92, SPEC §8), los mismos en el Dashboard y
 * en el Historial; solo cambia adónde lleva el enlace. "Tienes 1 compra…" y
 * "Completarla" en singular; "Tienes 3 compras…" y "Completarlas" en plural.
 */
export const toPendingTotalReminder = (
  status: PendingReminderStatusType,
  overdueCount: number,
  linkHref: string,
  onRetry: () => void,
): PendingTotalReminderProps => {
  const isSingular = overdueCount === 1;
  const suffix = isSingular ? FINANCE_TEXT.PENDING_REMINDER_SINGULAR_SUFFIX : FINANCE_TEXT.PENDING_REMINDER_PLURAL_SUFFIX;

  return {
    errorMessage: status === PENDING_REMINDER_STATUS.FAILED ? FINANCE_TEXT.PENDING_REMINDER_LOAD_ERROR : null,
    linkHref,
    linkText: isSingular ? FINANCE_TEXT.PENDING_REMINDER_LINK_SINGULAR : FINANCE_TEXT.PENDING_REMINDER_LINK_PLURAL,
    messageText:
      status === PENDING_REMINDER_STATUS.PENDING ? `${FINANCE_TEXT.PENDING_REMINDER_PREFIX}${overdueCount}${suffix}` : null,
    onRetry,
    status,
  };
};
