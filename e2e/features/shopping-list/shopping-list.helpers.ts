import type { Locator, Page } from "@playwright/test";

// Cómo encontrar las cosas y qué hace el usuario en /lista. Sin aserciones:
// eso es del test (playwright-e2e, references/standards.md).
export const LIST_PATH = "/lista";

export const getSearchBox = (page: Page): Locator => page.getByRole("textbox", { name: "Buscar producto" });

export const getEmptyListMessage = (page: Page): Locator =>
  page.getByText("Tu lista está vacía. Busca un producto para empezar.");

/** La fila de un producto de la lista, ubicada por su nombre. */
export const getListRow = (page: Page, productName: string): Locator =>
  page.getByRole("listitem").filter({ has: page.getByText(productName, { exact: true }) });

/**
 * Busca un término y elige el primer resultado. Devuelve el nombre del
 * producto elegido, para ubicar su fila después. Se usa con la lista vacía:
 * así los únicos botones dentro de un <li> son los resultados.
 */
export const addFirstSearchResult = async (page: Page, searchTerm: string): Promise<string> => {
  await getSearchBox(page).fill(searchTerm);
  const firstResult = page.getByRole("listitem").getByRole("button").first();
  const productName = (await firstResult.locator("span").first().textContent()) ?? "";
  await firstResult.click();
  return productName;
};

/** Una sección de la lista ("Pendientes" o "Tachados hoy"), por su nombre. */
export const getListSection = (page: Page, sectionName: string): Locator =>
  page.getByRole("region", { name: sectionName });

/** El botón que tacha y destacha la fila de un producto: su nombre es el del producto. */
export const getCheckButton = (scope: Locator, productName: string): Locator =>
  scope.getByRole("button", { name: productName });

/** La barra del modo compra (SCRUM-67). */
export const getShoppingModeBar = (page: Page): Locator => page.getByRole("region", { name: "Modo compra" });

/** El panel "Cerrar compra" (SCRUM-67). */
export const getClosePurchasePanel = (page: Page): Locator => page.getByRole("region", { name: "Cerrar compra" });

/** "Iniciar compra" y elegir el súper en el diálogo. */
export const startPurchaseAt = async (page: Page, storeName: string): Promise<void> => {
  await page.getByRole("button", { name: "Iniciar compra" }).click();
  await page.getByRole("dialog", { name: "¿Dónde estás comprando?" }).getByRole("button", { name: storeName }).click();
};
