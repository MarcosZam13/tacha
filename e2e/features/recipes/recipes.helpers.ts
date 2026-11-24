import type { Locator, Page } from "@playwright/test";

// Cómo encontrar las cosas de recetas. Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md).
export const RECIPES_PATH = "/recetas";
export const UPLOAD_URL = /\/storage\/v1\/object\/recipe-photos\//;

// Una imagen PNG de 1 × 1 válida.
const PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const PHOTO_FILE = {
  buffer: Buffer.from(PIXEL_PNG_BASE64, "base64"),
  mimeType: "image/png",
  name: "foto.png",
};

export const TEXT_FILE = { buffer: Buffer.from("no es una foto"), mimeType: "text/plain", name: "notas.txt" };

export const getPhotoInput = (page: Page): Locator => page.getByLabel(/^(Elegir|Cambiar) foto$/);
export const getPreview = (page: Page): Locator => page.getByRole("img", { name: "Vista previa de la foto" });
export const getSaveButton = (page: Page): Locator => page.getByRole("button", { name: "Guardar receta" });
export const getCardPhoto = (page: Page, recipeName: string): Locator =>
  page.getByRole("img", { exact: true, name: recipeName });
export const getCardHeading = (page: Page, recipeName: string): Locator =>
  page.getByRole("heading", { exact: true, level: 2, name: recipeName });

/** Llena el formulario de una receta nueva con un ingrediente del catálogo. */
export const fillNewRecipe = async (page: Page, recipeName: string): Promise<void> => {
  await page.goto(`${RECIPES_PATH}/nueva`);
  await page.getByRole("textbox", { name: /^Nombre/ }).fill(recipeName);
  await page.getByRole("spinbutton", { name: /^Porciones base/ }).fill("4");
  await page.getByRole("textbox", { name: "Buscar producto" }).fill("leche");
  await page.locator("section ul li button").first().click();
  await page.getByRole("textbox", { name: /^Cantidad/ }).fill("500");
};

/** true si la imagen cargó de verdad y no quedó rota. */
export const hasLoadedImage = (image: Locator): Promise<boolean> =>
  image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0);
