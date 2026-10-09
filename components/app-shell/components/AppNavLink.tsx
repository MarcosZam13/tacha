import Link from "next/link";
import { APP_NAV_LINK_VARIANT } from "../constants/app-nav-link.constants";
import type { AppNavLinkVariantType } from "../constants/app-nav-link.constants";
import type { AppNavLinkProps } from "./models/AppNavLinkProps.interface";

// Clases por variante: mismo enlace, distinto tamaño. El activo usa los colores del mockup v3.
const VARIANT_CLASS: Record<AppNavLinkVariantType, string> = {
  [APP_NAV_LINK_VARIANT.SIDEBAR]: "flex rounded-tacha-badge px-3 py-2 text-sm",
  [APP_NAV_LINK_VARIANT.TAB]: "flex h-full flex-col items-center justify-center px-1 py-3 text-xs",
};

/**
 * Un ítem de la navegación. Es un enlace y no un botón: cambia de página.
 * aria-current="page" marca el activo también para lectores de pantalla.
 */
export const AppNavLink = ({ item, variant }: AppNavLinkProps): React.JSX.Element => (
  <Link
    href={item.href}
    aria-current={item.isActive ? "page" : undefined}
    className={`${VARIANT_CLASS[variant]} font-body font-semibold transition-colors ${
      item.isActive ? "bg-tacha-chipbg text-tacha-teal" : "text-tacha-textsec hover:text-tacha-teal"
    }`}
  >
    {item.label}
  </Link>
);
