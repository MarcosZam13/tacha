import { BUDGET_AMOUNT } from "../constants/finance.constants";

export type BudgetAmountParseResult = { amount: number; isValid: true } | { isValid: false };

/**
 * El texto del campo del presupuesto → el monto a guardar (SPEC regla 15).
 * Solo colones enteros de 0 a 9 999 999 999; los separadores de miles van en
 * grupos de 3, así "12.5" no se adivina como 125 sino que se rechaza. A
 * diferencia de "Total gastado", vacío es inválido: un presupuesto siempre
 * tiene monto. ₡0 es válido.
 */
export const parseBudgetAmount = (text: string): BudgetAmountParseResult => {
  const trimmed = text.trim();
  if (!BUDGET_AMOUNT.PATTERN.test(trimmed)) return { isValid: false };

  const amount = Number(trimmed.replace(BUDGET_AMOUNT.THOUSANDS_SEPARATOR, ""));
  return amount <= BUDGET_AMOUNT.MAX ? { amount, isValid: true } : { isValid: false };
};
