import { expect, test } from "@playwright/test";
import {
  countOwnRecipePhotoFiles,
  createOwnRecipe,
  deleteOwnRecipePhotos,
  deleteOwnRecipes,
} from "../../support/supabase";
import {
  LOCATED_PHOTO_FILE,
  PHOTO_FILE,
  RECIPES_PATH,
  TEXT_FILE,
  UPLOAD_URL,
  fillNewRecipe,
  getCardHeading,
  getCardPhoto,
  getImageSize,
  getPhotoInput,
  getPreview,
  getSaveButton,
  hasLoadedImage,
} from "./recipes.helpers";

// Escenarios: features/recipes/specs/E2E.md. Los textos se escriben acá a
// propósito (oráculo independiente del código, playwright-e2e).
const FLAN = "E2E Flan con foto";
const BASE_SERVINGS = 4;
// Abrir la pantalla crea una sesión anónima y lee la base compartida, y en
// `npm run dev` la primera visita a una ruta espera a que se compile.
const SESSION_TIMEOUT_MS = 15_000;

test.describe("Foto de una receta", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(RECIPES_PATH);
    await expect(page.getByText("Todavía no tienes recetas.")).toBeVisible({ timeout: SESSION_TIMEOUT_MS });
  });

  test.afterEach(async ({ page, request }) => {
    await deleteOwnRecipePhotos(page, request);
    await deleteOwnRecipes(page, request);
  });

  test("E2E-RECETAS-01 — Crear una receta con foto y verla después de recargar", async ({ page }) => {
    await fillNewRecipe(page, FLAN);
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);
    await expect(getPreview(page)).toBeVisible();

    await getSaveButton(page).click();

    await expect(page).toHaveURL(RECIPES_PATH, { timeout: SESSION_TIMEOUT_MS });
    await expect(getCardPhoto(page, FLAN)).toBeVisible();

    await page.reload();

    await expect(getCardPhoto(page, FLAN)).toBeVisible();
    await expect.poll(() => hasLoadedImage(getCardPhoto(page, FLAN))).toBe(true);
  });

  test("E2E-RECETAS-02 — Cambiar, quitar y eliminar borra el archivo anterior", async ({ page, request }) => {
    const recipeId = await createOwnRecipe(page, request, FLAN, BASE_SERVINGS);
    const editPath = `${RECIPES_PATH}/${recipeId}/editar`;
    await page.goto(editPath);
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);
    await getSaveButton(page).click();
    await expect(getCardPhoto(page, FLAN)).toBeVisible({ timeout: SESSION_TIMEOUT_MS });

    await page.goto(editPath);
    await expect(page.getByRole("img", { name: `Foto de ${FLAN}` })).toBeVisible();
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);
    await getSaveButton(page).click();
    await expect(getCardPhoto(page, FLAN)).toBeVisible();
    await expect.poll(() => countOwnRecipePhotoFiles(page, request, recipeId)).toBe(1);

    await page.goto(editPath);
    await page.getByRole("button", { name: "Quitar foto" }).click();
    await getSaveButton(page).click();
    await expect(getCardHeading(page, FLAN)).toBeVisible();
    await expect(getCardPhoto(page, FLAN)).toHaveCount(0);
    await expect.poll(() => countOwnRecipePhotoFiles(page, request, recipeId)).toBe(0);

    await page.goto(editPath);
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);
    await getSaveButton(page).click();
    await expect(getCardPhoto(page, FLAN)).toBeVisible();

    await page.getByRole("button", { name: `Eliminar ${FLAN}` }).click();
    await page
      .getByRole("dialog", { name: "¿Eliminar esta receta?" })
      .getByRole("button", { exact: true, name: "Eliminar" })
      .click();
    await expect(getCardHeading(page, FLAN)).toHaveCount(0);
    await expect.poll(() => countOwnRecipePhotoFiles(page, request, recipeId)).toBe(0);
  });

  test("E2E-RECETAS-03 — Un archivo que no es una foto se rechaza y no reemplaza la elegida", async ({ page }) => {
    await fillNewRecipe(page, FLAN);
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);
    await expect(getPreview(page)).toBeVisible();

    await getPhotoInput(page).setInputFiles(TEXT_FILE);

    await expect(page.getByText("Elige una foto JPG, PNG o WebP.")).toBeVisible();
    await expect(getPreview(page)).toBeVisible();
  });

  test("E2E-RECETAS-04 — Si la foto falla, la receta se guarda y reintentar no la duplica", async ({ page }) => {
    await page.route(UPLOAD_URL, (route) => route.fulfill({ json: { message: "falla de prueba" }, status: 500 }));
    await fillNewRecipe(page, FLAN);
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);

    await getSaveButton(page).click();

    await expect(
      page.getByText("La receta se guardó, pero la foto no. Intenta de nuevo o quítala."),
    ).toBeVisible({ timeout: SESSION_TIMEOUT_MS });
    await expect(getPreview(page)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^Nombre/ })).toHaveValue(FLAN);

    await page.unroute(UPLOAD_URL);
    await getSaveButton(page).click();

    await expect(page).toHaveURL(RECIPES_PATH, { timeout: SESSION_TIMEOUT_MS });
    await expect(getCardPhoto(page, FLAN)).toBeVisible();
    await expect(getCardHeading(page, FLAN)).toHaveCount(1);
  });

  test("E2E-RECETAS-06 — La foto se guarda sin ubicación y con su orientación", async ({ page, request }) => {
    expect(LOCATED_PHOTO_FILE.buffer.includes("Exif")).toBe(true);
    await fillNewRecipe(page, FLAN);
    await getPhotoInput(page).setInputFiles(LOCATED_PHOTO_FILE);
    await getSaveButton(page).click();
    await expect(getCardPhoto(page, FLAN)).toBeVisible({ timeout: SESSION_TIMEOUT_MS });
    await expect.poll(() => hasLoadedImage(getCardPhoto(page, FLAN))).toBe(true);

    const photoUrl = await getCardPhoto(page, FLAN).getAttribute("src");
    const savedPhoto = await (await request.get(photoUrl ?? "")).body();

    expect(savedPhoto.length).toBeGreaterThan(0);
    expect(savedPhoto.includes("Exif")).toBe(false);
    expect(await getImageSize(getCardPhoto(page, FLAN))).toEqual({ height: 16, width: 8 });
  });

  test("E2E-RECETAS-07 — Sin familia no se ofrece compartir", async ({ page }) => {
    const householdResponse = page.waitForResponse(/\/rpc\/current_household_id/);
    await page.goto(`${RECIPES_PATH}/nueva`);
    expect((await householdResponse).ok()).toBe(true);

    await expect(getSaveButton(page)).toBeVisible();
    await expect(page.getByRole("group", { name: "¿Para quién es?" })).toHaveCount(0);
  });

  test("E2E-RECETAS-05 — Cancelar no sube la foto elegida", async ({ page, request }) => {
    const recipeId = await createOwnRecipe(page, request, FLAN, BASE_SERVINGS);
    await page.goto(`${RECIPES_PATH}/${recipeId}/editar`);
    await getPhotoInput(page).setInputFiles(PHOTO_FILE);
    await expect(getPreview(page)).toBeVisible();

    await page.getByRole("link", { name: "Cancelar" }).click();

    await expect(getCardHeading(page, FLAN)).toBeVisible();
    await expect(getCardPhoto(page, FLAN)).toHaveCount(0);
    expect(await countOwnRecipePhotoFiles(page, request, recipeId)).toBe(0);
  });
});
