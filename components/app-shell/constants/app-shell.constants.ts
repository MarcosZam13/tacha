import { APP_ROUTE } from "@/constants";
import type { AppNavItem } from "../models/AppNavItem.interface";

export const APP_SHELL_TEXT = {
  BRAND: "Tacha",
  NAV_LABEL: "Secciones de la app",
} as const;

// Orden de DESIGN.md §3.1, solo con las secciones que ya existen: Fechas y
// Listas privadas se agregan acá cuando tengan pantalla (SPEC §5, regla 3).
// Finanzas llegó con SCRUM-69. Con más de 5 ítems, mobile necesita el menú
// "Más" (§3.2).
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: APP_ROUTE.LIST, label: "General" },
  { href: APP_ROUTE.CATALOG, label: "Catálogo" },
  { href: APP_ROUTE.RECIPES, label: "Recetas" },
  { href: APP_ROUTE.FINANCE, label: "Finanzas" },
  { href: APP_ROUTE.HOUSEHOLD, label: "Mi familia" },
];
