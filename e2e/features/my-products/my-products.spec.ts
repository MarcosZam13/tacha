import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";

// Escenarios: features/my-products/specs/E2E.md.
const MY_PRODUCTS_PATH = "/catalogo/mis-productos";
const DETAIL_URL = /\/catalogo\/producto\/[0-9a-f-]+$/;

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

// La tarjeta se encuentra por su título (h2). El enlace que la envuelve no
// tiene nombre accesible propio: el contenido es un <article>.
const getProductCard = (page: Page, productName: string) =>
  page.getByRole("heading", { level: 2, name: new RegExp(productName) });

const getActionButton = (page: Page, action: string, productName: string) =>
  page.getByRole("button", { name: `${action} ${productName}` });

const openDeleteDialog = async (page: Page, productName: string) => {
  await getActionButton(page, "Eliminar", productName).click();
  const dialog = page.getByRole("dialog", { name: "¿Eliminar este producto?" });
  await expect(dialog).toBeVisible();
  return dialog;
};

const deleteProduct = async (page: Page, productName: string): Promise<void> => {
  const dialog = await openDeleteDialog(page, productName);
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
    await deleteProduct(page, editedName);
  });

  test("E2E-MISPROD-04: eliminar un producto sin uso lo quita de la lista", async ({ page }) => {
    const productName = uniqueProductName("Natilla");
    await createProduct(page, productName);

    const dialog = await openDeleteDialog(page, productName);
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

    const dialog = await openDeleteDialog(page, productName);
    await expect(dialog.getByRole("status")).toContainText("1 lista activa");
    await dialog.getByRole("button", { name: "Eliminar" }).click();

    await expect(getProductCard(page, productName)).toHaveCount(0);
  });
});
