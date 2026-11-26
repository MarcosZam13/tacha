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

// JPEG de 16 × 8 con orientación girada (se ve 8 × 16) y una ubicación GPS en sus metadatos.
const LOCATED_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/4QCURXhpZgAATU0AKgAAAAgAAgESAAMAAAABAAYAAIglAAQAAAABAAAAJgAAAAAABAABAAIAAAACTgAAAAACAAUAAAADAAAAXAADAAIAAAACVwAAAAAEAAUAAAADAAAAdAAAAAAAAAAJAAAAAQAAADcAAAABAAAAKAAAAAEAAABUAAAAAQAAAAUAAAABAAAACgAAAAH/2wBDACgcHiMeGSgjISMtKygwPGRBPDc3PHtYXUlkkYCZlo+AjIqgtObDoKrarYqMyP/L2u71////m8H////6/+b9//j/2wBDASstLTw1PHZBQXb4pYyl+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj/wAARCAAIABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBlFFFYHYf/2Q==";

export const LOCATED_PHOTO_FILE = {
  buffer: Buffer.from(LOCATED_JPEG_BASE64, "base64"),
  mimeType: "image/jpeg",
  name: "ubicacion.jpg",
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
  await page.getByRole("combobox", { name: "Buscar producto" }).fill("leche");
  await page.getByRole("option").first().click();
  await page.getByRole("textbox", { name: /^Cantidad/ }).fill("500");
};

/** true si la imagen cargó de verdad y no quedó rota. */
export const hasLoadedImage = (image: Locator): Promise<boolean> =>
  image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0);

/** El ancho y el alto con que se ve una imagen ya cargada. */
export const getImageSize = (image: Locator): Promise<{ height: number; width: number }> =>
  image.evaluate((element) =>
    element instanceof HTMLImageElement
      ? { height: element.naturalHeight, width: element.naturalWidth }
      : { height: 0, width: 0 },
  );
