import { COLONES_AMOUNT } from "../constants/finance.constants";

export type ColonesAmountParseResult = { amount: number; isValid: true } | { isValid: false };

/**
 * El texto de un campo de colones → el monto a guardar: el presupuesto (SPEC
 * regla 15) y los totales editados (reglas 46, D13 y D14). Solo colones enteros
 * de 0 a 9 999 999 999; los separadores de miles van en grupos de 3, así "12.5"
 * no se adivina como 125 sino que se rechaza. A diferencia de "Total gastado"
 * del modo compra, vacío es inválido: un presupuesto o un total editado siempre
 * tiene monto. ₡0 es válido.
 */
export const parseColonesAmount = (text: string): ColonesAmountParseResult => {
  const trimmed = text.trim();
  if (!COLONES_AMOUNT.PATTERN.test(trimmed)) return { isValid: false };

  const amount = Number(trimmed.replace(COLONES_AMOUNT.THOUSANDS_SEPARATOR, ""));
  return amount <= COLONES_AMOUNT.MAX ? { amount, isValid: true } : { isValid: false };
};
