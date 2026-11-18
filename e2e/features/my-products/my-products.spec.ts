import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";

// Escenarios: features/my-products/specs/E2E.md.
const MY_PRODUCTS_PATH = "/catalogo/mis-productos";
const LIST_PATH = "/lista";
const DETAIL_URL = /\/catalogo\/producto\/[0-9a-f-]+$/;
// El diálogo de eliminar pide el uso del producto después de abrirse.
const USAGE_RPC_URL = /\/rpc\/get_personal_product_usage/;

// Fila que devuelve get_personal_product_usage (migración 052).
interface UsageRow {
  active_list_count: number;
  recipe_count: number;
}

// Nombre único por test: la tarjeta se busca por él.
const uniqueProductName = (base: string): string => `${base} ${Date.now()}`;

const createProduct = async (page: Page, productName: string): Promise<void> => {
  await page.getByRole("button", { name: "+ Agregar producto" }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar producto" });

  await dialog.getByLabel(/^Nombre del producto/).fill(productName);
  const categorySelect = dialog.getByLabel(/^Categoría/);
  await expect(categorySelect).toBeEnabled();
  await categorySelect.selectOption({ index: 1 });
  await dialog.getByLabel(/^Cantidad/).fill("500");

  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
};

// La tarjeta se encuentra por su título (h2): "{nombre} — {tamaño}". El enlace
// que la envuelve no tiene nombre accesible propio: el contenido es un
// <article>. Anclado al nombre entero, para que "Queso" no coincida con
// "Queso editado".
const getProductCard = (page: Page, productName: string) =>
  page.getByRole("heading", { level: 2, name: new RegExp(`^${productName} — `) });

const getActionButton = (page: Page, action: string, productName: string) =>
  page.getByRole("button", { name: `${action} ${productName}` });

// Devuelve el diálogo cuando ya llegó el conteo de uso: antes de eso el aviso
// todavía no puede estar, y "no hay aviso" pasaría aunque después apareciera.
const openDeleteDialog = async (page: Page, productName: string) => {
  const usageResponse = page.waitForResponse(USAGE_RPC_URL);
  await getActionButton(page, "Eliminar", productName).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar este producto?" });
  await expect(dialog).toBeVisible();
  const response = await usageResponse;
  expect(response.ok()).toBe(true);
  const usage = (await response.json()) as UsageRow[];
  return { dialog, usage };
};

const deleteProduct = async (page: Page, productName: string): Promise<void> => {
  const { dialog } = await openDeleteDialog(page, productName);
  await dialog.getByRole("button", { name: "Eliminar" }).click();
  await expect(dialog).toBeHidden();
};

test.describe("Mis productos: editar y eliminar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MY_PRODUCTS_PATH);
  });

  test.afterEach(async ({ page, request }) => {
    await deleteOwnListItems(page, request);
  });

  test("E2E-MISPROD-03: editar abre el formulario precargado y actualiza la tarjeta", async ({ page }) => {
    const productName = uniqueProductName("Queso casero");
    const editedName = `${productName} editado`;
    await createProduct(page, productName);

    await getActionButton(page, "Editar", productName).click();
    const dialog = page.getByRole("dialog", { name: "Editar producto" });
    await expect(dialog.getByLabel(/^Nombre del producto/)).toHaveValue(productName);
    await dialog.getByLabel(/^Nombre del producto/).fill(editedName);
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(getProductCard(page, editedName)).toBeVisible();
    // Se actualizó el mismo producto: no quedó otra tarjeta con el nombre anterior.
    await expect(getProductCard(page, productName)).toHaveCount(0);
    await deleteProduct(page, editedName);
  });

  test("E2E-MISPROD-04: eliminar un producto sin uso lo quita de la lista", async ({ page }) => {
    const productName = uniqueProductName("Natilla");
    await createProduct(page, productName);

    const { dialog, usage } = await openDeleteDialog(page, productName);
    expect(usage).toEqual([{ active_list_count: 0, recipe_count: 0 }]);
    await expect(dialog.getByRole("status")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(getProductCard(page, productName)).toHaveCount(0);
  });

  test("E2E-MISPROD-05: eliminar un producto que está en la lista avisa y lo quita", async ({ page }) => {
    const productName = uniqueProductName("Tortillas");
    await createProduct(page, productName);

    await getProductCard(page, productName).click();
    await expect(page).toHaveURL(DETAIL_URL);
    await page.getByRole("button", { name: "Agregar a mi lista" }).click();
    await expect(page.getByText("Se agregó a tu lista.")).toBeVisible();
    await page.goto(MY_PRODUCTS_PATH);

    const { dialog } = await openDeleteDialog(page, productName);
    await expect(dialog.getByRole("status")).toContainText("1 lista activa");
    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(getProductCard(page, productName)).toHaveCount(0);

    // Archivado, no borrado: la lista lo sigue mostrando.
    await page.goto(LIST_PATH);
    await expect(page.getByRole("listitem").filter({ hasText: productName })).toBeVisible();
  });
});
