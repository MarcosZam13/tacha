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

/** El catálogo de recetas (SCRUM-114: E2E-LISTA-06 agrega una receta desde ahí). */
export const RECIPES_PATH = "/recetas";

/** "Agregar receta a lista" de la tarjeta de una receta: su nombre accesible lleva el de la receta. */
export const getAddRecipeToListButton = (page: Page, recipeName: string): Locator =>
  page.getByRole("button", { name: `Agregar receta a lista ${recipeName}` });

/** El resumen que aparece en la tarjeta al terminar de agregar la receta. */
export const getAddRecipeToListSummary = (page: Page): Locator => page.getByRole("status");

/** El panel "¿Qué hiciste?" (SCRUM-115). */
export const getShortfallPanel = (page: Page): Locator => page.getByRole("dialog", { name: "¿Qué hiciste?" });

/** El diálogo de destachar con deshacer (SCRUM-115). */
export const getUndoDialog = (page: Page): Locator =>
  page.getByRole("dialog", { name: "¿Destachar y deshacer lo que elegiste?" });

/** Los avisos de faltante bajo una fila (SCRUM-114): texto, no botones. */
export const getShortfallNote = (row: Locator, recipeName: string): Locator =>
  row.getByText(new RegExp(`^\\+ .+ necesarios para ${recipeName}$`));

/** Los chips de "cuánto le va a durar" de una fila (SCRUM-103): su nombre lleva el del producto. */
export const getShelfLifeChips = (page: Page, productName: string): Locator =>
  page.getByRole("group", { name: `¿Cuánto te va a durar ${productName}?` });

/**
 * Responde desde el test el guardado del chip (update de list_items.shelf_life_choice)
 * y devuelve lo que la pantalla mandó. Así el escenario no depende de que la 063 esté
 * aplicada; que la base guarde y valide el chip lo cubre la prueba SQL de la 063.
 * Cualquier otra petición a list_items sigue a la base.
 */
export const recordShelfLifeSaves = async (page: Page): Promise<unknown[]> => {
  const savedBodies: unknown[] = [];
  await page.route("**/rest/v1/list_items?*", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown> | null;
    if (request.method() !== "PATCH" || !body || !("shelf_life_choice" in body)) {
      await route.fallback();
      return;
    }
    savedBodies.push(body);
    await route.fulfill({ json: { id: new URL(request.url()).searchParams.get("id")?.replace("eq.", "") } });
  });
  return savedBodies;
};
