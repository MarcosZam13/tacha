import { MULTIPLIER_FORMAT } from "../constants/meal-planner.constants";

/**
 * 2 → "2"; 1.5 → "1,5". Coma decimal porque así se escribe en Costa Rica
 * (igual que las cantidades de las recetas).
 */
export const toDecimalCommaText = (value: number): string =>
  String(value).replace(MULTIPLIER_FORMAT.DECIMAL_POINT, MULTIPLIER_FORMAT.DECIMAL_COMMA);
