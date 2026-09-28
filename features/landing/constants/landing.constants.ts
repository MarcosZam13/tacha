import type { NavLink } from "../models/NavLink.interface";

export const LANDING_ROUTE = {
  HOME: "/",
  REGISTER: "/registro",
} as const;

export const BRAND_LOGO = {
  IMAGE_SIZE_PX: 40,
  IMAGE_SRC: "/logo-marca/logo.png",
  LINK_LABEL: "Tacha, ir al inicio",
  NAME: "Tacha",
} as const;

export const NAVBAR_TEXT = {
  NAV_LABEL: "Navegación principal",
  REGISTER: "Registrarse",
} as const;

//Cada sección nueva agrega su enlace acá.
export const NAV_LINKS: readonly NavLink[] = [{ href: LANDING_ROUTE.HOME, label: "Inicio" }];
