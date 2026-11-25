import type { AppRouteType } from "@/constants";
import type { LANDING_ROUTE } from "../constants/landing.constants";

/** Los botones de la derecha de la navbar pública, ya decididos según la sesión. */
export interface PublicNavbarViewModel {
  ctaHref: AppRouteType | typeof LANDING_ROUTE.REGISTER;
  ctaLabel: string;
  /** "Iniciar sesión" solo tiene sentido para quien todavía no inició sesión (SCRUM-159). */
  isLoginVisible: boolean;
}
