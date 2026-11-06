import type { NullableRef } from "@/types/nullable.types";
import type { TotalEditStatusType } from "../../constants/finance.constants";

/** El campo abierto de un total (SCRUM-91, SPEC §6 a §9), con solo lo que dibuja. */
export interface InlineTotalEditorProps {
  /** Error de validación o de guardado; null si no hay. */
  errorMessage: NullableRef<string>;
  /** "Total de la compra (₡)", "Total de esta semana (₡)". */
  inputLabel: string;
  onCancel: () => void;
  /** Guarda `timeZoneToConfirm` y repite el guardado, sin perder lo escrito (regla 59). */
  onConfirmTimeZone: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: TotalEditStatusType;
  text: string;
  /** La zona del navegador que se propone con TZ001 o TZ002; null si no hace falta confirmar. */
  timeZoneToConfirm: NullableRef<string>;
}
