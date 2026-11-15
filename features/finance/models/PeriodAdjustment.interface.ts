import type { SpendingPeriodType } from "../constants/finance.constants";

/**
 * Un ajuste manual de un periodo (SCRUM-91, SPEC D10): la diferencia entre el
 * total que escribió la persona y el calculado. No es una compra: no cuenta en
 * "Compras" ni en "Sin total".
 */
export interface PeriodAdjustment {
  /** Con signo y en colones; puede traer centavos. Nunca 0 (regla 50). */
  amount: number;
  /** Cuándo se creó, en ISO, como lo guarda la base. Decide en qué periodos cuenta. */
  effectiveAt: string;
  id: string;
  /** El nivel en que se escribió; cuenta en ese y en los mayores (regla 52). */
  scope: SpendingPeriodType;
}
