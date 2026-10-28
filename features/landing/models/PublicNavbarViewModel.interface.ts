import type { AppRouteType } from "@/constants";
import type { LANDING_ROUTE } from "../constants/landing.constants";

/** El botón de la derecha de la navbar pública, ya decidido según la sesión. */
export interface PublicNavbarViewModel {
  ctaHref: AppRouteType | typeof LANDING_ROUTE.REGISTER;
  ctaLabel: string;
}
