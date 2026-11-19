import type { Locator, Page } from "@playwright/test";

// Cómo encontrar las cosas y qué hace el usuario en "Mis grupos". Sin
// aserciones: eso es del test (playwright-e2e, references/standards.md).
export const LIST_PATH = "/lista";
export const GROUPS_PATH = "/lista/grupos";

export const getManageGroupsLink = (page: Page): Locator => page.getByRole("link", { name: "Gestionar mis grupos" });

export const getGroupsTitle = (page: Page): Locator => page.getByRole("heading", { level: 1, name: "Mis grupos" });

export const getGroupsEmptyState = (page: Page): Locator =>
  page.getByText("Agrupá los productos que siempre comprás juntos");

export const getBackToListLink = (page: Page): Locator => page.getByRole("link", { name: "Volver a la lista" });

/**
 * El ítem "General" de la navegación del shell que se ve en este ancho
 * (sidebar en desktop, tabs en el celular; las dos están en el HTML).
 */
export const getGeneralNavLink = (page: Page): Locator =>
  page
    .getByRole("navigation", { name: "Secciones de la app" })
    .filter({ visible: true })
    .getByRole("link", { name: "General" });
