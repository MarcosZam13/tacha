import type { NullableRef } from "@/types/nullable.types";
import type { PendingReminderStatusType } from "../../constants/finance.constants";

/** El recordatorio de compras sin total (SCRUM-92, SPEC §6 y §8), con solo lo que dibuja. */
export interface PendingTotalReminderProps {
  /** "No se pudo revisar si tienes compras sin total…"; solo en `failed`. */
  errorMessage: NullableRef<string>;
  /** "#compras-sin-total" en el Historial; "/finanzas/historial#compras-sin-total" en el Dashboard. */
  linkHref: string;
  /** "Completarla" o "Completarlas". */
  linkText: string;
  /** "Tienes 2 compras sin total desde hace más de 24 horas"; solo en `pending`. */
  messageText: NullableRef<string>;
  onRetry: () => void;
  status: PendingReminderStatusType;
}
