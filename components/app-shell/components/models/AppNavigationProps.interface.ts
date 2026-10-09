import type { AppNavItemViewModel } from "../../models/AppNavItem.interface";

/** Lo que reciben el sidebar y la barra de tabs: los ítems ya calculados por el ViewModel. */
export interface AppNavigationProps {
  navItems: AppNavItemViewModel[];
}
