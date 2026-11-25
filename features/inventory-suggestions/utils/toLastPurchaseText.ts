import { calendarDaysBetween } from "@/utils/calendarDaysBetween";
import { INVENTORY_SUGGESTIONS_TEXT } from "../constants/inventory-suggestions.constants";

/**
 * "Lo compraste hace 9 días". Cuenta días del calendario local, no bloques de
 * 24 h (calendarDaysBetween): algo comprado ayer a las 11 p. m. es "hace 1 día"
 * aunque sea de madrugada.
 */
export const toLastPurchaseText = (lastPurchasedAt: string, now: Date): string => {
  const daysAgo = Math.max(0, calendarDaysBetween(new Date(lastPurchasedAt), now));

  if (daysAgo === 0) return INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_TODAY;
  if (daysAgo === 1) return INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_ONE_DAY;
  return `${INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_DAYS_PREFIX} ${daysAgo} ${INVENTORY_SUGGESTIONS_TEXT.LAST_PURCHASE_DAYS_SUFFIX}`;
};
