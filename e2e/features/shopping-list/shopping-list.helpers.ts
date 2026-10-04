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
