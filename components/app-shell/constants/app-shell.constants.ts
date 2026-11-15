import { APP_ROUTE } from "@/constants";
import type { AppNavItem } from "../models/AppNavItem.interface";

export const APP_SHELL_TEXT = {
  BRAND: "Tacha",
  NAV_LABEL: "Secciones de la app",
  PROFILE_LINK_LABEL: "Mi perfil",
} as const;

// Orden de DESIGN.md §3.1, solo con las secciones que ya existen: Listas
// privadas se agrega acá cuando tenga pantalla (SPEC §5, regla 3). Finanzas
// llegó con SCRUM-69 y Fechas con SCRUM-77. Son 6: el menú "Más" que pide §3.2
// en mobile queda para el sprint de UI/UX.
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: APP_ROUTE.LIST, label: "General" },
  { href: APP_ROUTE.DATE_LISTS, label: "Fechas" },
  { href: APP_ROUTE.CATALOG, label: "Catálogo" },
  { href: APP_ROUTE.RECIPES, label: "Recetas" },
  { href: APP_ROUTE.FINANCE, label: "Finanzas" },
  { href: APP_ROUTE.HOUSEHOLD, label: "Mi familia" },
];
