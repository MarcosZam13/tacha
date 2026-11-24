import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { deleteOwnListItems } from "../../support/supabase";

// Escenarios: features/my-products/specs/E2E.md.
const MY_PRODUCTS_PATH = "/catalogo/mis-productos";
const REFERENCE_PRICE_NOTICE = "Precio ingresado por ti: no está verificado ni se actualiza automáticamente.";
const LIST_PATH = "/lista";
const DETAIL_URL = /\/catalogo\/producto\/[0-9a-f-]+$/;
// El diálogo de eliminar pide el uso del producto después de abrirse.
const USAGE_RPC_URL = /\/rpc\/get_personal_product_usage/;
// Intl separa los miles con un espacio que puede ser normal o duro según el
// navegador. Anclado al símbolo ₡ y sin más dígitos detrás: el nombre del
// producto lleva la hora y podría contener los mismos números.
const toPricePattern = (thousands: string, rest: string): RegExp =>
  new RegExp(`₡${thousands}\\s?${rest}(?!\\d)`);

// Fila que devuelve get_personal_product_usage (migración 052; group_count desde la 056).
interface UsageRow {
  active_list_count: number;
  group_count: number;
  recipe_count: number;
}

// Nombre único por test: la tarjeta se busca por él.
const uniqueProductName = (base: string): string => `${base} ${Date.now()}`;

interface ReferenceStoreInput {
  customStoreName?: string;
  price: string;
  supermarket?: string;
}

// Sin `store`, el producto se crea sin tienda ni precio (HU-58 no los necesita).
const createProduct = async (page: Page, productName: string, store?: ReferenceStoreInput): Promise<void> => {
  await page.getByRole("button", { name: "+ Agregar producto" }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar producto" });

  await dialog.getByLabel(/^Nombre del producto/).fill(productName);
  const categorySelect = dialog.getByLabel(/^Categoría/);
  await expect(categorySelect).toBeEnabled();
  await categorySelect.selectOption({ index: 1 });
  await dialog.getByLabel(/^Cantidad/).fill("500");

  if (store) {
    const storeSelect = dialog.getByLabel("Tienda (opcional)");
    if (store.supermarket) {
      await storeSelect.selectOption({ label: store.supermarket });
    }
    if (store.customStoreName) {
      await storeSelect.selectOption({ label: "Otra tienda" });
      await dialog.getByLabel(/^Nombre de la tienda/).fill(store.customStoreName);
    }
    await dialog.getByLabel("Precio de referencia (opcional)").fill(store.price);
  }

  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toBeHidden();
};

// La tarjeta es el enlace que contiene su título (h2): "{nombre} — {tamaño}".
// El enlace no tiene nombre accesible propio (su contenido es un <article>),
// así que no se puede buscar por nombre. Anclado al nombre entero.
const getProductCard = (page: Page, productName: string) =>
  page.getByRole("link").filter({
    has: page.getByRole("heading", { level: 2, name: new RegExp(`^${productName} — `) }),
  });

const getReferencePriceSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "Precio de referencia" }) });

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

test.describe("Mis productos: tienda y precio de referencia", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MY_PRODUCTS_PATH);
  });

  test("E2E-MISPROD-01: la tarjeta muestra el supermercado y el precio con su aviso", async ({ page }) => {
    const productName = uniqueProductName("Queso Turrialba");

    await createProduct(page, productName, { price: "2850", supermarket: "MaxiPali" });

    const card = getProductCard(page, productName);
    await expect(card).toContainText("MaxiPali");
    await expect(card).toContainText(toPricePattern("2", "850"));
    await expect(card).toContainText(REFERENCE_PRICE_NOTICE);

    // El detalle lee el supermercado por su relación con stores (051).
    await card.click();
    await expect(page).toHaveURL(DETAIL_URL);
    const section = getReferencePriceSection(page);
    await expect(section).toContainText("MaxiPali");
    await expect(section).toContainText(toPricePattern("2", "850"));
  });

  test("E2E-MISPROD-02: el detalle muestra la tienda escrita y el precio de referencia", async ({ page }) => {
    const productName = uniqueProductName("Chorizo artesanal");

    await createProduct(page, productName, { customStoreName: "Carnicería Los Ángeles", price: "3200" });
    await getProductCard(page, productName).click();
    await expect(page).toHaveURL(DETAIL_URL);

    const section = getReferencePriceSection(page);
    await expect(section).toContainText("Carnicería Los Ángeles");
    await expect(section).toContainText(toPricePattern("3", "200"));
    await expect(section.getByText(REFERENCE_PRICE_NOTICE)).toBeVisible();
  });
});

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

  test("E2E-MISPROD-06: editar cambia la tienda y el precio de referencia", async ({ page }) => {
    const productName = uniqueProductName("Natilla casera");
    await createProduct(page, productName, { price: "2850", supermarket: "MaxiPali" });

    await getActionButton(page, "Editar", productName).click();
    const dialog = page.getByRole("dialog", { name: "Editar producto" });
    const storeSelect = dialog.getByLabel("Tienda (opcional)");
    const priceInput = dialog.getByLabel("Precio de referencia (opcional)");
    // Abre precargado con lo que se guardó al crear.
    await expect(storeSelect.locator("option:checked")).toHaveText("MaxiPali");
    await expect(priceInput).toHaveValue("2850");

    await storeSelect.selectOption({ label: "Otra tienda" });
    await dialog.getByLabel(/^Nombre de la tienda/).fill("Feria de Zapote");
    await priceInput.fill("3100");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog).toBeHidden();

    const card = getProductCard(page, productName);
    await expect(card).toContainText("Feria de Zapote");
    await expect(card).toContainText(toPricePattern("3", "100"));
    await expect(card).not.toContainText("MaxiPali");
    await deleteProduct(page, productName);
  });

  test("E2E-MISPROD-04: eliminar un producto sin uso lo quita de la lista", async ({ page }) => {
    const productName = uniqueProductName("Natilla");
    await createProduct(page, productName);

    const { dialog, usage } = await openDeleteDialog(page, productName);
    expect(usage).toEqual([{ active_list_count: 0, group_count: 0, recipe_count: 0 }]);
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
