import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Escenarios: features/my-products/specs/E2E.md.
const MY_PRODUCTS_PATH = "/catalogo/mis-productos";
const REFERENCE_PRICE_NOTICE = "Precio ingresado por ti: no está verificado ni se actualiza automáticamente.";
const DETAIL_URL = /\/catalogo\/producto\/[0-9a-f-]+$/;
// Intl separa los miles con un espacio que puede ser normal o duro según el navegador.
const toPricePattern = (thousands: string, rest: string): RegExp => new RegExp(`${thousands}\\s?${rest}`);

// Nombre único por test: la tarjeta se busca por él.
const uniqueProductName = (base: string): string => `${base} ${Date.now()}`;

interface ReferenceStoreInput {
  customStoreName?: string;
  price: string;
  supermarket?: string;
}

const createProduct = async (page: Page, productName: string, store: ReferenceStoreInput): Promise<void> => {
  await page.getByRole("button", { name: "+ Agregar producto" }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar producto" });

  await dialog.getByLabel(/^Nombre del producto/).fill(productName);
  const categorySelect = dialog.getByLabel(/^Categoría/);
  await expect(categorySelect).toBeEnabled();
  await categorySelect.selectOption({ index: 1 });
  await dialog.getByLabel(/^Cantidad/).fill("500");

  const storeSelect = dialog.getByLabel("Tienda (opcional)");
  if (store.supermarket) {
    await storeSelect.selectOption({ label: store.supermarket });
  }
  if (store.customStoreName) {
    await storeSelect.selectOption({ label: "Otra tienda" });
    await dialog.getByLabel(/^Nombre de la tienda/).fill(store.customStoreName);
  }
  await dialog.getByLabel("Precio de referencia (opcional)").fill(store.price);

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
  });

  test("E2E-MISPROD-02: el detalle muestra la tienda escrita y el precio de referencia", async ({ page }) => {
    const productName = uniqueProductName("Chorizo artesanal");

    await createProduct(page, productName, { customStoreName: "Carnicería Los Ángeles", price: "3200" });
    await getProductCard(page, productName).click();
    await expect(page).toHaveURL(DETAIL_URL);

    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Precio de referencia" }),
    });
    await expect(section).toContainText("Carnicería Los Ángeles");
    await expect(section).toContainText(toPricePattern("3", "200"));
    await expect(section.getByText(REFERENCE_PRICE_NOTICE)).toBeVisible();
  });
});
