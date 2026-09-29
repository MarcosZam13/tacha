import type { NavLink } from "../models/NavLink.interface";

export const LANDING_ROUTE = {
  HOME: "/",
  REGISTER: "/registro",
} as const;

export const LANDING_SECTION_ID = {
  CONTACT: "contacto",
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

export const HERO_TEXT = {
  CTA: "Empezar gratis",
  DESCRIPTION:
    "Tacha organiza la lista de tu casa, reparte lo que falta comprar y te muestra dónde te conviene más, todo en un solo lugar.",
  TITLE: "Compras compartidas, sin complicaciones",
} as const;

export const FOOTER_TEXT = {
  ABOUT_LABEL: "Sobre Tacha",
  CONTACT_DESCRIPTION: "Escribinos por mensaje directo en Instagram.",
  CONTACT_TITLE: "Contacto",
  DESCRIPTION:
    "Listas de compras colaborativas para el hogar: una lista compartida, precios aproximados por supermercado y menos mandados repetidos.",
  SOCIAL_TITLE: "Seguinos",
} as const;


export const TACHA_INSTAGRAM = {
  HANDLE: "@tacha.2026",
  LINK_LABEL: "Instagram de Tacha (se abre en una pestaña nueva)",
  URL: "https://www.instagram.com/tacha.2026/",
} as const;

// Cada sección nueva agrega su enlace acá.
export const NAV_LINKS: readonly NavLink[] = [
  { href: LANDING_ROUTE.HOME, label: "Inicio" },
  { href: `${LANDING_ROUTE.HOME}#${LANDING_SECTION_ID.CONTACT}`, label: "Contacto" },
];
