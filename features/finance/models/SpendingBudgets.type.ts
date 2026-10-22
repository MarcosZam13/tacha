import type { NullableRef } from "@/types/nullable.types";
import type { SpendingPeriodType } from "../constants/finance.constants";

/**
 * El presupuesto de cada tipo de periodo (SPEC D1), en colones enteros; null si
 * todavía no se definió. Los tres se cargan juntos: cambiar de periodo no
 * vuelve a pedirlos.
 */
export type SpendingBudgets = Record<SpendingPeriodType, NullableRef<number>>;
