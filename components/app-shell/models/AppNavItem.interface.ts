import type { AppRouteType } from "@/constants";

/** Una sección de la app en la navegación. */
export interface AppNavItem {
  href: AppRouteType;
  label: string;
}

/** Un ítem listo para dibujar: el ViewModel ya decidió si es el activo. */
export interface AppNavItemViewModel extends AppNavItem {
  isActive: boolean;
}
