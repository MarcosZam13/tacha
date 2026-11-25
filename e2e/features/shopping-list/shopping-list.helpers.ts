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

/**
 * SCRUM-163: la lista de la familia tal como la ve un miembro que no puede
 * leer un producto personal ajeno (RLS de la 032): la fila llega sin
 * presentación. Las familias exigen cuentas registradas, así que se simula la
 * respuesta de la base con la forma exacta que devuelve en ese caso.
 */
export const stubHouseholdListWithHiddenRow = async (page: Page, visibleProductName: string): Promise<void> => {
  const listId = "00000000-0000-4000-8000-000000000163";
  const baseRow = { checked_at: null, purchase_session_id: null, quantity_bought: null, quantity_requested: 1 };
  const rows = [
    {
      ...baseRow,
      created_at: "2026-11-25T10:00:00Z",
      id: "00000000-0000-4000-8000-000000000001",
      product_catalog_variant_id: "00000000-0000-4000-8000-000000000011",
      product_catalog_variants: {
        base_quantity: 1000,
        base_unit: "g",
        id: "00000000-0000-4000-8000-000000000011",
        product_catalog: { name: visibleProductName },
      },
    },
    {
      ...baseRow,
      created_at: "2026-11-25T11:00:00Z",
      id: "00000000-0000-4000-8000-000000000002",
      product_catalog_variant_id: "00000000-0000-4000-8000-000000000022",
      product_catalog_variants: null,
    },
  ];
  await page.route(/\/rest\/v1\/rpc\/find_general_list_id/, (route) => route.fulfill({ json: listId }));
  await page.route(/\/rest\/v1\/rpc\/get_general_list_(recipe_shortfalls|shortfall_snapshots)/, (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route(/\/rest\/v1\/lists\?select=id%2Clist_items|\/rest\/v1\/lists\?select=id,list_items/, (route) =>
    route.fulfill({ json: { id: listId, list_items: rows } }),
  );
};
