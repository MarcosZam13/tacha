import { DECIMAL_SEPARATOR } from "../constants/recipes.constants";

/** " 0,5 " → "0.5": recorta y pasa la coma decimal a punto, que es lo que entiende Number(). */
export const normalizeDecimal = (text: string): string =>
  text.trim().replace(DECIMAL_SEPARATOR.COMMA, DECIMAL_SEPARATOR.POINT);
