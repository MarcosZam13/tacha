import { APP_NAV_LINK_VARIANT } from "../constants/app-nav-link.constants";
import { APP_SHELL_TEXT } from "../constants/app-shell.constants";
import { AppNavLink } from "./AppNavLink";
import type { AppNavigationProps } from "./models/AppNavigationProps.interface";

/** Navegación de desktop (md en adelante): fija a la izquierda, DESIGN.md §3.1. */
export const AppSidebar = ({ navItems }: AppNavigationProps): React.JSX.Element => (
  <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 border-r border-tacha-border bg-tacha-surface px-4 py-6 md:flex">
    <p className="px-3 font-display text-2xl font-bold text-tacha-text">{APP_SHELL_TEXT.BRAND}</p>
    <nav aria-label={APP_SHELL_TEXT.NAV_LABEL} className="flex-1">
      <ul className="flex flex-col gap-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <AppNavLink item={item} variant={APP_NAV_LINK_VARIANT.SIDEBAR} />
          </li>
        ))}
      </ul>
    </nav>
    {/* Punto de extensión: "Cerrar sesión" (SCRUM-55) va acá, al pie del sidebar. */}
  </aside>
);
