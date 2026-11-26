import Link from "next/link";
import { Icon } from "@/components/ui/icon/Icon";
import { ICON_SIZE } from "@/constants";
import { APP_NAV_LINK_VARIANT } from "../constants/app-nav-link.constants";
import type { AppNavLinkVariantType } from "../constants/app-nav-link.constants";
import type { AppNavLinkProps } from "./models/AppNavLinkProps.interface";

// Clases por variante: mismo enlace, distinto tamaño. El activo usa los colores del mockup v3.
// Sidebar: ícono a la izquierda de la etiqueta. Tab: ícono arriba y etiqueta
// chica abajo, para que las 6 secciones entren en 360 px (SCRUM-146).
const VARIANT_CLASS: Record<AppNavLinkVariantType, string> = {
  [APP_NAV_LINK_VARIANT.SIDEBAR]: "flex items-center gap-3 rounded-tacha-badge px-3 py-2 text-sm",
  [APP_NAV_LINK_VARIANT.TAB]:
    "flex h-full min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[11px] leading-tight",
};

/**
 * Un ítem de la navegación. Es un enlace y no un botón: cambia de página.
 * aria-current="page" marca el activo también para lectores de pantalla.
 * El ícono es decorativo: el nombre accesible sigue siendo la etiqueta, y como
 * toma el color del texto (currentColor), el activo también lo tiñe.
 */
export const AppNavLink = ({ item, variant }: AppNavLinkProps): React.JSX.Element => (
  <Link
    href={item.href}
    aria-current={item.isActive ? "page" : undefined}
    className={`${VARIANT_CLASS[variant]} font-body font-semibold transition-colors ${
      item.isActive ? "bg-tacha-chipbg text-tacha-teal" : "text-tacha-textsec hover:text-tacha-teal"
    }`}
  >
    <Icon icon={item.icon} size={ICON_SIZE.MEDIUM} />
    <span className="whitespace-nowrap">{item.label}</span>
  </Link>
);
