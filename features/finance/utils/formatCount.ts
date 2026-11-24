import { PRODUCT_HISTORY_TEXT } from "../constants/finance.constants";

const toCountText = (count: number, singularSuffix: string, pluralSuffix: string): string =>
  `${count}${count === 1 ? singularSuffix : pluralSuffix}`;

/** "1 vez" / "4 veces": apariciones, no compras (regla 89). */
export const formatTimes = (count: number): string =>
  toCountText(count, PRODUCT_HISTORY_TEXT.TIMES_SINGULAR_SUFFIX, PRODUCT_HISTORY_TEXT.TIMES_PLURAL_SUFFIX);

/** "1 producto" / "12 productos": cuántos coinciden con la búsqueda (SPEC §9). */
export const formatProductCount = (count: number): string =>
  toCountText(count, PRODUCT_HISTORY_TEXT.RESULTS_SINGULAR_SUFFIX, PRODUCT_HISTORY_TEXT.RESULTS_PLURAL_SUFFIX);
