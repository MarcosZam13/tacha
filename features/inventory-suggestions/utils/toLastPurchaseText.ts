import { startOfLocalDay } from "@/utils/startOfLocalDay";
import { INVENTORY_SUGGESTIONS_TEXT, MS_PER_DAY } from "../constants/inventory-suggestions.constants";

/**
 * "Lo compraste hace 9 días". Cuenta días del calendario local, no bloques de
 * 24 h: algo comprado ayer a las 11 p. m. es "hace 1 día" aunque sea de
 * madrugada. Math.round absorbe el día de 23 o 25 h de un cambio de horario.
 */
export const toLastPurchaseText = (lastPurchasedAt: string, now: Date): string => {
  const lastPurchaseDay = Date.parse(startOfLocalDay(new Date(lastPurchasedAt)));
  const today = Date.parse(startOfLocalDay(now));
  const daysAgo = Math.max(0, Math.round((today - lastPurchaseDay) / MS_PER_DAY));

  if (daysAgo === 0) return INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_TODAY;
  if (daysAgo === 1) return INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_ONE_DAY;
  return `${INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_DAYS_PREFIX} ${daysAgo} ${INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_DAYS_SUFFIX}`;
};
