import type { Locator, Page } from "@playwright/test";

// Cómo encontrar las cosas y qué hace el usuario en "Mis grupos". Sin
// aserciones: eso es del test (playwright-e2e, references/standards.md).
export const LIST_PATH = "/lista";
export const GROUPS_PATH = "/lista/grupos";
export const NEW_GROUP_PATH = "/lista/grupos/nuevo";

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

// --- Crear un grupo (HU-73, SCRUM-110) ---

export const getCreateFirstGroupLink = (page: Page): Locator => page.getByRole("link", { name: "Crear tu primer grupo" });

export const getGroupNameInput = (page: Page): Locator => page.getByLabel(/^Nombre del grupo/);

export const getSaveGroupButton = (page: Page): Locator => page.getByRole("button", { name: "Guardar grupo" });

/** Las filas del grupo en armado: cada una tiene su botón "Quitar …". */
export const getGroupItemRows = (page: Page): Locator =>
  page.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^Quitar / }) });

/** La tarjeta de un grupo en "Mis grupos": el <li> con su nombre como <h2>. */
export const getGroupCard = (page: Page, groupName: string): Locator =>
  page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 2, name: groupName }) });

/**
 * Busca un producto y elige su primera presentación. La opción del desplegable
 * (SCRUM-149) es la que tiene ese nombre exacto ("Leche", no "Leche condensada").
 * Devuelve el texto de la fila que se agrega ("Leche — 1 L").
 */
export const addFirstOptionOf = async (page: Page, searchTerm: string, productName: string): Promise<string> => {
  await page.getByRole("combobox", { name: "Buscar producto" }).fill(searchTerm);
  const option = page
    .getByRole("option")
    .filter({ has: page.getByText(productName, { exact: true }) })
    .first();
  await option.waitFor();
  const [, sizeLabel] = await option.locator("span").allTextContents();
  await option.click();
  return `${productName} — ${sizeLabel}`;
};

// --- Agregar un grupo a la lista (HU-74, SCRUM-111) ---

export const getAddGroupToListButton = (page: Page, groupName: string): Locator =>
  page.getByRole("button", { name: `Agregar ${groupName} a la lista` });

/** El resumen de agregar, dentro de la tarjeta del grupo. */
export const getAddGroupToListSummary = (page: Page, groupName: string): Locator =>
  getGroupCard(page, groupName).getByRole("status");

/** Las filas de la sección "Pendientes" de /lista. */
export const getPendingListRows = (page: Page): Locator =>
  page.getByRole("region", { name: "Pendientes" }).getByRole("listitem");
