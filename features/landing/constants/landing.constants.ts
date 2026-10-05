import type { NavLink } from "../models/NavLink.interface";
import type { PlatformFeature } from "../models/PlatformFeature.interface";

export const LANDING_ROUTE = {
  HOME: "/",
  REGISTER: "/registro",
} as const;

export const LANDING_SECTION_ID = {
  CONTACT: "contacto",
  INTRO: "que-es-tacha",
  MORE_INFO: "mas-informacion",
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

export const INTRO_TEXT = {
  DESCRIPTION:
    "Una app para que tu casa organice las compras en equipo: todos ven la misma lista, nadie compra dos veces lo mismo y saben cuánto gastan.",
  READ_MORE: "Leer más",
  READ_MORE_LABEL: "Leer más sobre Tacha",
  TITLE: "¿Qué es Tacha?",
} as const;

export const MORE_INFO_TEXT = {
  BACK_TO_INTRO: "Volver arriba",
  TITLE: "Tacha en detalle",
} as const;

// La intro muestra `summary` y la información ampliada (HU-04) muestra `detail`:
// salen del mismo objeto para que nunca hablen de cosas distintas.
export const PLATFORM_FEATURES: readonly PlatformFeature[] = [
  {
    detail:
      "Creás un hogar, invitás con un enlace a quienes viven con vos y todos trabajan sobre la misma lista. Cuando alguien tacha un producto en el súper, los demás lo ven al instante.",
    id: "lista-compartida",
    summary: "Todos en la casa agregan y tachan productos en la misma lista, en tiempo real.",
    title: "Una lista para toda la casa",
  },
  {
    detail:
      "Tacha consulta los sitios oficiales de MaxiPali, Walmart y MasxMenos y guarda precios de referencia. Con eso te sugiere dónde te conviene comprar. Son aproximados: en tienda pueden variar.",
    id: "precios",
    summary: "Compará precios aproximados de tres supermercados antes de salir.",
    title: "Precios por supermercado",
  },
  {
    detail:
      "Cada compra guarda quién la hizo, en qué supermercado y cuánto costó. Con ese historial el hogar ve en qué se va la plata por producto, categoría o supermercado.",
    id: "gastos",
    summary: "Cada compra queda registrada: quién, dónde, cuándo y cuánto.",
    title: "Sabé cuánto gastan",
  },
];

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
