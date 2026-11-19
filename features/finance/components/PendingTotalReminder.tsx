import Link from "next/link";
import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { FINANCE_TEXT, PENDING_REMINDER_STATUS } from "../constants/finance.constants";
import type { PendingTotalReminderProps } from "./models/PendingTotalReminderProps.interface";

/**
 * El recordatorio de compras sin total (SCRUM-92, CA-02): persistente y sin botón
 * de cerrar (D26). Es informativo, no un error: sin role="alert", en tonos crema
 * y terracota con el texto de contraste AA (D27), y con un enlace a "Compras sin
 * total". Mientras carga o sin compras que pasen las 24 horas no dibuja nada.
 * Si la lectura falla, lo dice con "Reintentar" en este mismo lugar (regla 67).
 */
export const PendingTotalReminder = ({
  errorMessage,
  linkHref,
  linkText,
  messageText,
  onRetry,
  status,
}: PendingTotalReminderProps): React.JSX.Element | null => {
  if (status === PENDING_REMINDER_STATUS.FAILED) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
          {FINANCE_TEXT.RETRY}
        </Button>
      </div>
    );
  }

  if (status !== PENDING_REMINDER_STATUS.PENDING) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-tacha-card border border-tacha-chipborder bg-tacha-chipbg px-4 py-3 font-body">
      <p className="text-sm font-medium text-tacha-text">{messageText}</p>
      <Link href={linkHref} className="text-sm font-semibold text-tacha-terracotta-text underline">
        {linkText}
      </Link>
    </div>
  );
};
