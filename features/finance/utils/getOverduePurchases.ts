import { PENDING_TOTAL_REMINDER } from "../constants/finance.constants";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";

/**
 * Las compras sin total que ya cuentan para el recordatorio (SCRUM-92, regla 63):
 * cerradas hace 24 horas o más (D23), de cualquier fecha. Una de 23 h 59 min
 * todavía no cuenta; una de 24 h exactas, sí. `now` es la hora de la carga
 * (regla 65), no la de cada render. Respeta el orden recibido.
 */
export const getOverduePurchases = (purchases: readonly PeriodPurchase[], now: Date): PeriodPurchase[] => {
  const cutoff = now.getTime() - PENDING_TOTAL_REMINDER.AFTER_MS;
  return purchases.filter((purchase) => purchase.totalAmount === null && new Date(purchase.closedAt).getTime() <= cutoff);
};
