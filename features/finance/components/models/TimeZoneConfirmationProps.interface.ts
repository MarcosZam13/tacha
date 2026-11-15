import type { NullableRef } from "@/types/nullable.types";

/** El aviso de TZ002 al leer, en lugar de los totales (SCRUM-91, SPEC §7, regla 60). */
export interface TimeZoneConfirmationProps {
  /** Error al guardar la zona; null si no hay. */
  errorMessage: NullableRef<string>;
  isSaving: boolean;
  onConfirm: () => void;
  /** La zona del navegador que se propone. */
  timeZone: string;
}
