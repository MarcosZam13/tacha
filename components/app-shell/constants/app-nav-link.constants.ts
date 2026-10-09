// Dónde se dibuja un enlace de la navegación: cambia el estilo, no el comportamiento.
export const APP_NAV_LINK_VARIANT = {
  SIDEBAR: "sidebar",
  TAB: "tab",
} as const;

export type AppNavLinkVariantType = (typeof APP_NAV_LINK_VARIANT)[keyof typeof APP_NAV_LINK_VARIANT];
