import type { NullableRef } from "@/types/nullable.types";
import { TOTAL_SAVE_ERROR } from "../constants/finance.constants";
import type { SpendingPeriodType, TotalSaveErrorType } from "../constants/finance.constants";
import type { PeriodAdjustment } from "./PeriodAdjustment.interface";

// Las ediciones de un total (SCRUM-91, nextjs-enterprise-patterns §4) y la
// confirmación de zona que pueden pedir: Payload, Response y el error tipado
// que comparten. Nunca llevan dueño: lo pone la base (SPEC §12, regla 51).

/** Editar el total de una compra cerrada propia (CA-01, set_purchase_session_total). */
export interface SetPurchaseTotalPayload {
  purchaseId: string;
  /** Colones enteros de 0 al tope (regla 46). */
  total: number;
}

/** La compra guardada. Su fecha no cambia al editar (regla 47). */
export interface SetPurchaseTotalResponse {
  closedAt: string;
  id: string;
  /** Nunca null: editar no vuelve una compra a "Sin total" (D13). */
  totalAmount: number;
}

/**
 * Escribir el total del periodo en curso (CA-02, set_period_total). Se manda el
 * total deseado, nunca la diferencia ni los límites: los calcula la base (D15).
 */
export interface SetPeriodTotalPayload {
  period: SpendingPeriodType;
  /** Colones enteros de 0 al tope (regla 46). */
  total: number;
}

export interface SetPeriodTotalResponse {
  /** El ajuste guardado, o null si la diferencia dio 0 y se quitó (regla 50). */
  adjustment: NullableRef<PeriodAdjustment>;
}

/**
 * Confirmar o cambiar la zona (regla 59, set_spending_time_zone). Solo con un
 * toque explícito de la persona: nada la asigna solo. Es la salida de TZ001 y
 * de TZ002.
 */
export interface SetSpendingTimeZonePayload {
  /** Una zona con nombre, como "America/Costa_Rica" (regla 58). */
  timeZone: string;
}

export interface SetSpendingTimeZoneResponse {
  timeZone: string;
}

/**
 * El error tipado de setPurchaseTotal y setPeriodTotal: cualquier error de la
 * base al guardar llega como uno de estos, con el motivo que decide el mensaje
 * (SPEC §7). El error original queda en `cause`, nunca en pantalla.
 */
export class TotalSaveError extends Error {
  readonly reason: TotalSaveErrorType;

  constructor(reason: TotalSaveErrorType, cause: unknown) {
    super(`No se pudo guardar el total: ${reason}`, { cause });
    this.name = "TotalSaveError";
    this.reason = reason;
  }
}

/** El motivo de cualquier error de guardado; uno que no sea TotalSaveError es GENERAL. */
export const toTotalSaveErrorReason = (error: unknown): TotalSaveErrorType =>
  error instanceof TotalSaveError ? error.reason : TOTAL_SAVE_ERROR.GENERAL;