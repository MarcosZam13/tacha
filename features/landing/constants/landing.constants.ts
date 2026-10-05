import type { InfoBlock } from "../models/InfoBlock.interface";
import type { NavLink } from "../models/NavLink.interface";
import type { PlatformFeature } from "../models/PlatformFeature.interface";
import type { TestimonialList } from "../models/Testimonial.interface";

export const LANDING_ROUTE = {
  ABOUT: "/nosotros",
  HOME: "/",
  REGISTER: "/registro",
  TERMS: "/terminos",
} as const;

export const LANDING_SECTION_ID = {
  CONTACT: "contacto",
  DEMO: "demo",
  INTRO: "que-es-tacha",
  MORE_INFO: "mas-informacion",
  TESTIMONIALS: "testimonios",
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

// Marcador hasta tener el video de la demo (CA-03 a CA-05 de HU-07 pendientes).
export const DEMO_TEXT = {
  PLACEHOLDER: "Aquí va la demo, pendiente",
} as const;

export const ABOUT_TEXT = {
  DESCRIPTION: "Conocé quiénes somos y hacia dónde vamos.",
  MISSION:
    "Ayudar a los hogares costarricenses a organizar sus compras en equipo, con información real de precios, para que gasten menos tiempo y menos dinero.",
  MISSION_TITLE: "Misión",
  TITLE: "Sobre Tacha",
  VISION:
    "Ser la herramienta de referencia en Costa Rica para planificar las compras del hogar de forma colaborativa, transparente y desde cualquier dispositivo.",
  VISION_TITLE: "Visión",
} as const;

export const ORGANIZATION_TEXT = {
  TITLE: "Quiénes somos",
} as const;

export const ORGANIZATION_FACTS: readonly InfoBlock[] = [
  {
    id: "origen",
    text: "Tacha nació en 2026 como proyecto del curso Introducción al Desarrollo Web, cuando notamos que en nuestras casas se repetían compras y nadie sabía cuánto se gastaba.",
    title: "Cómo nació",
  },
  {
    id: "proposito",
    text: "Para que comprar en familia sea un trabajo en equipo: una sola lista, precios de referencia y un registro claro de los gastos.",
    title: "Para qué existe",
  },
  {
    id: "equipo",
    text: "Un equipo de seis estudiantes que diseña, programa y prueba la plataforma trabajando por sprints con Scrum.",
    title: "Quiénes la hacen",
  },
  {
    id: "caracteristicas",
    text: "Precios reales de supermercados costarricenses, uso gratuito y una app que funciona igual en el celular que en la computadora.",
    title: "Qué nos caracteriza",
  },
];

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

export const TESTIMONIALS_TEXT = {
  NEXT_LABEL: "Ver testimonio siguiente",
  POSITION_SEPARATOR: "de",
  PREVIOUS_LABEL: "Ver testimonio anterior",
  REGION_LABEL: "Testimonios",
  ROLE_DESCRIPTION: "carrusel",
  TITLE: "Lo que dicen quienes ya la usan",
} as const;

// PROVISIONAL: reemplazar por testimonios reales, con permiso de quien los da.
export const TESTIMONIALS: TestimonialList = [
  {
    id: "andrea",
    location: "Heredia",
    name: "Andrea",
    quote: "Antes comprábamos dos veces el arroz. Ahora todos vemos la lista y tachamos al momento.",
  },
  {
    id: "jose",
    location: "Cartago",
    name: "José",
    quote: "Me gusta ver antes de salir en qué súper me sale más barata la compra de la semana.",
  },
  {
    id: "valeria",
    location: "San José",
    name: "Valeria",
    quote: "Con mis compañeros de apartamento por fin sabemos quién compró qué y cuánto gastamos.",
  },
];

// Trazo SVG de las flechas del carrusel (chevron).
export const CAROUSEL_ICON_PATH = {
  NEXT: "m9 18 6-6-6-6",
  PREVIOUS: "m15 18-6-6 6-6",
} as const;

export const FOOTER_TEXT = {
  ABOUT_LABEL: "Sobre Tacha",
  CONTACT_DESCRIPTION: "Escribinos por mensaje directo en Instagram.",
  CONTACT_TITLE: "Contacto",
  DESCRIPTION:
    "Listas de compras colaborativas para el hogar: una lista compartida, precios aproximados por supermercado y menos mandados repetidos.",
  LEGAL_LABEL: "Enlaces legales e institucionales",
  SOCIAL_TITLE: "Seguinos",
} as const;

export const BACK_BUTTON_TEXT = {
  LABEL: "← Volver",
} as const;

// Con una sola entrada (pestaña nueva, enlace pegado) no hay página anterior.
export const BROWSER_HISTORY = {
  MIN_ENTRIES_TO_GO_BACK: 2,
} as const;

export const TACHA_INSTAGRAM = {
  HANDLE: "@tacha.2026",
  LINK_LABEL: "Instagram de Tacha (se abre en una pestaña nueva)",
  URL: "https://www.instagram.com/tacha.2026/",
} as const;

// Cada sección nueva agrega su enlace acá.
export const NAV_LINKS: readonly NavLink[] = [
  { href: LANDING_ROUTE.HOME, label: "Inicio" },
  { href: LANDING_ROUTE.ABOUT, label: "Nosotros" },
  { href: `${LANDING_ROUTE.HOME}#${LANDING_SECTION_ID.CONTACT}`, label: "Contacto" },
];

export const FOOTER_LINKS: readonly NavLink[] = [
  { href: LANDING_ROUTE.ABOUT, label: "Nosotros" },
  { href: LANDING_ROUTE.TERMS, label: "Términos y condiciones" },
];
