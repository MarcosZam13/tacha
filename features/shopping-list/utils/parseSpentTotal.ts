import type { NullableRef } from "@/types/nullable.types";
import { SPENT_TOTAL } from "../constants/purchase-session.constants";

export type SpentTotalParseResult = { isValid: true; total: NullableRef<number> } | { isValid: false };

/**
 * El texto del campo "Total gastado" → el total a guardar. Vacío = "sin
 * total" (documento-proyecto §4.6: se puede cerrar sin él). Solo colones
 * enteros; los separadores de miles van en grupos de 3, así "12.5" no se
 * adivina como 125 sino que se rechaza.
 */
export const parseSpentTotal = (text: string): SpentTotalParseResult => {
  const trimmed = text.trim();
  if (trimmed === "") return { isValid: true, total: null };
  if (!SPENT_TOTAL.PATTERN.test(trimmed)) return { isValid: false };

  const total = Number(trimmed.replace(SPENT_TOTAL.THOUSANDS_SEPARATOR, ""));
  return total <= SPENT_TOTAL.MAX ? { isValid: true, total } : { isValid: false };
};
