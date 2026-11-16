import { CalendarDays, ChefHat, ListChecks, Store, Users, Wallet } from "lucide-react";
import { APP_ROUTE } from "@/constants";
import type { AppNavItem } from "../models/AppNavItem.interface";

export const APP_SHELL_TEXT = {
  BRAND: "Tacha",
  NAV_LABEL: "Secciones de la app",
  PROFILE_LINK_LABEL: "Mi perfil",
} as const;

// Orden de DESIGN.md §3.1, solo con las secciones que ya existen: Listas
// privadas se agrega acá cuando tenga pantalla (SPEC §5, regla 3). Finanzas
// llegó con SCRUM-69 y Fechas con SCRUM-77. Cada sección declara su ícono
// (SCRUM-146): el componente solo lo dibuja. Son 6 y entran en 360 px con el
// ícono arriba y la etiqueta corta abajo, así que no hace falta el menú "Más".
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: APP_ROUTE.LIST, label: "General", icon: ListChecks },
  { href: APP_ROUTE.DATE_LISTS, label: "Fechas", icon: CalendarDays },
  { href: APP_ROUTE.CATALOG, label: "Catálogo", icon: Store },
  { href: APP_ROUTE.RECIPES, label: "Recetas", icon: ChefHat },
  { href: APP_ROUTE.FINANCE, label: "Finanzas", icon: Wallet },
  { href: APP_ROUTE.HOUSEHOLD, label: "Mi familia", icon: Users },
];
