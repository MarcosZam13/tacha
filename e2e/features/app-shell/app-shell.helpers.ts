import type { Locator, Page } from "@playwright/test";

// Cómo encontrar las cosas del shell. Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md).
export const LIST_PATH = "/lista";
export const LANDING_PATH = "/";

const APP_NAV_NAME = "Secciones de la app";
const PUBLIC_NAV_NAME = "Navegación principal";

/**
 * La navegación del shell que se ve en este ancho: el sidebar en desktop o
 * los tabs en mobile. Las dos existen en el HTML; el CSS esconde una.
 */
export const getVisibleAppNav = (page: Page): Locator =>
  page.getByRole("navigation", { name: APP_NAV_NAME }).filter({ visible: true });

/** Todas las navegaciones del shell, visibles o no (para comprobar que no existen). */
export const getAnyAppNav = (page: Page): Locator => page.getByRole("navigation", { name: APP_NAV_NAME });

export const getPublicNav = (page: Page): Locator => page.getByRole("navigation", { name: PUBLIC_NAV_NAME });

export const getSectionLink = (nav: Locator, label: string): Locator => nav.getByRole("link", { name: label });
