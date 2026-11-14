import type { LucideIcon } from "lucide-react";
import type { AppRouteType } from "@/constants";

/** Una sección de la app en la navegación. */
export interface AppNavItem {
  href: AppRouteType;
  label: string;
  /** Ícono de la sección (SCRUM-146). Lo declara APP_NAV_ITEMS, no el componente. */
  icon: LucideIcon;
}

/** Un ítem listo para dibujar: el ViewModel ya decidió si es el activo. */
export interface AppNavItemViewModel extends AppNavItem {
  isActive: boolean;
}
