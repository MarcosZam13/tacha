import { usePathname } from "next/navigation";
import { APP_NAV_ITEMS } from "../constants/app-shell.constants";
import type { AppNavItemViewModel } from "../models/AppNavItem.interface";
import { isRouteActive } from "../utils/isRouteActive";

interface UseAppShellViewModelReturn {
  navItems: AppNavItemViewModel[];
}

/**
 * Qué ítem de la navegación está activo. Se deriva de la ruta en cada render:
 * no hay estado que guardar ni sincronizar.
 */
export const useAppShellViewModel = (): UseAppShellViewModelReturn => {
  const pathname = usePathname();

  return {
    navItems: APP_NAV_ITEMS.map((item) => ({ ...item, isActive: isRouteActive(pathname, item.href) })),
  };
};
