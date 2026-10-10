import { APP_ROUTE } from "@/constants";
import { PURCHASE_SESSION_QUERY } from "../constants/purchase-session.constants";

/** El link de la lista en modo compra: /lista?compra=<id>. URLSearchParams escapa el id. */
export const toShoppingModeHref = (sessionId: string): string =>
  `${APP_ROUTE.LIST}?${new URLSearchParams({ [PURCHASE_SESSION_QUERY.PARAM]: sessionId })}`;
