import { APP_NAV_LINK_VARIANT } from "../constants/app-nav-link.constants";
import { APP_SHELL_TEXT } from "../constants/app-shell.constants";
import { AppNavLink } from "./AppNavLink";
import type { AppNavigationProps } from "./models/AppNavigationProps.interface";

/**
 * Navegación de mobile: tabs fijos abajo, al alcance del pulgar (DESIGN.md §3.2).
 * Con más de 5 ítems el último pasa a ser "Más"; hoy son 4.
 */
export const AppTabBar = ({ navItems }: AppNavigationProps): React.JSX.Element => (
  <nav
    aria-label={APP_SHELL_TEXT.NAV_LABEL}
    className="fixed inset-x-0 bottom-0 z-10 border-t border-tacha-border bg-tacha-surface md:hidden"
  >
    <ul className="flex">
      {navItems.map((item) => (
        <li key={item.href} className="flex-1">
          <AppNavLink item={item} variant={APP_NAV_LINK_VARIANT.TAB} />
        </li>
      ))}
    </ul>
  </nav>
);
