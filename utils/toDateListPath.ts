import { APP_ROUTE } from "@/constants";

/** Ruta del detalle de una sublista. */
export const toDateListPath = (listId: string): string => `${APP_ROUTE.DATE_LISTS}/${listId}`;
