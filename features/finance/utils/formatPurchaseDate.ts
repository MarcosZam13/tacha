import { formatDay } from "./formatPeriodRange";

/** Cuándo se cerró una compra, en hora local y sin la hora (SPEC regla 27). */
export const formatPurchaseDate = (closedAt: string): string => formatDay(new Date(closedAt));
