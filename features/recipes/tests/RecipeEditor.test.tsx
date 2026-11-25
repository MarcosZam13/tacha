// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasUnsavedChanges } from "@/services/unsaved-changes.service";
import { RECIPE_PHOTO_CHANGE, SAVE_RECIPE_PHOTO_RESULT } from "../constants/recipes.constants";
import type { SavedRecipePhoto } from "../models/recipe-photo.interfaces";
import { RecipeEditor } from "../RecipeEditor";
import { saveRecipePhoto } from "../services/recipe-photos.service";
import { getRecipeForEditing, saveRecipe } from "../services/recipes.service";
import { createRecipeEditorPage } from "./RecipeEditor.page";
import { createPhotoFile, createValues } from "./recipe.fixtures";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/hooks/useProductSearch", () => ({
  useProductSearch: () => ({
    clearQuery: vi.fn(),
    errorMessage: null,
    hasNoResults: false,
    isSearching: false,
    query: "",
    results: [],
    setQuery: vi.fn(),
  }),
}));
vi.mock("../services/recipes.service", () => ({ getRecipeForEditing: vi.fn(), saveRecipe: vi.fn() }));
vi.mock("../services/recipe-photos.service", () => ({ saveRecipePhoto: vi.fn() }));
const getRecipeMock = vi.mocked(getRecipeForEditing);
const saveRecipeMock = vi.mocked(saveRecipe);
const savePhotoMock = vi.mocked(saveRecipePhoto);

const renderEditor = async (photo: SavedRecipePhoto | null = null) => {
  getRecipeMock.mockResolvedValue({ photo, values: createValues() });
  render(<RecipeEditor recipeId="flan" />);
  const page = createRecipeEditorPage();
  await page.findPhotoInput();
  return page;
};

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  saveRecipeMock.mockResolvedValue({ recipeId: "flan" });
  savePhotoMock.mockResolvedValue(SAVE_RECIPE_PHOTO_RESULT.SAVED);
});

describe("RecipeEditor: photo", () => {
  it("shows the saved photo and lets the user change or remove it", async () => {
    const page = await renderEditor({ url: "https://fotos/flan" });

    expect(page.getPhoto("Foto de Flan")).toHaveAttribute("src", "https://fotos/flan");
    expect(page.queryRemoveButton()).toBeInTheDocument();
  });

  it("has no photo to remove without one", async () => {
    const page = await renderEditor();

    expect(page.queryPhoto()).not.toBeInTheDocument();
    expect(page.queryRemoveButton()).not.toBeInTheDocument();
  });

  it("previews the chosen photo and saves nothing yet", async () => {
    const page = await renderEditor();

    await page.choosePhoto(createPhotoFile());

    expect(page.getPhoto("Vista previa de la foto")).toHaveAttribute("src", "blob:preview");
    expect(savePhotoMock).not.toHaveBeenCalled();
    expect(hasUnsavedChanges()).toBe(true);
  });

  it("says why a file is not valid, next to the field", async () => {
    const page = await renderEditor();

    await page.choosePhoto(createPhotoFile("image/gif"));

    expect(await page.findAlert()).toHaveTextContent("Elige una foto JPG, PNG o WebP.");
    expect(page.getPhotoInput()).toHaveAccessibleDescription("Elige una foto JPG, PNG o WebP.");
    expect(page.queryPhoto()).not.toBeInTheDocument();
  });

  it("saves the recipe first, then its photo, and goes to the catalog", async () => {
    const file = createPhotoFile();
    const page = await renderEditor();
    await page.choosePhoto(file);

    await page.save();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/recetas"));
    expect(savePhotoMock).toHaveBeenCalledExactlyOnceWith({
      change: { file, kind: RECIPE_PHOTO_CHANGE.REPLACE },
      recipeId: "flan",
    });
    expect(saveRecipeMock.mock.invocationCallOrder[0]).toBeLessThan(savePhotoMock.mock.invocationCallOrder[0]);
  });

  it("removes the saved photo when saving", async () => {
    const page = await renderEditor({ url: "https://fotos/flan" });
    await page.removePhoto();
    expect(page.queryPhoto()).not.toBeInTheDocument();

    await page.save();

    await waitFor(() =>
      expect(savePhotoMock).toHaveBeenCalledWith({ change: { kind: RECIPE_PHOTO_CHANGE.REMOVE }, recipeId: "flan" }),
    );
  });

  it("keeps the photo when it was not touched", async () => {
    const page = await renderEditor({ url: "https://fotos/flan" });

    await page.save();

    await waitFor(() =>
      expect(savePhotoMock).toHaveBeenCalledWith({ change: { kind: RECIPE_PHOTO_CHANGE.KEEP }, recipeId: "flan" }),
    );
  });

  it("does not save the photo when the recipe could not be saved", async () => {
    saveRecipeMock.mockRejectedValue(new Error("network"));
    const page = await renderEditor();
    await page.choosePhoto(createPhotoFile());

    await page.save();

    expect(await page.findAlert()).toHaveTextContent("No se pudo guardar la receta. Intenta de nuevo.");
    expect(savePhotoMock).not.toHaveBeenCalled();
    expect(page.getPhoto("Vista previa de la foto")).toBeInTheDocument();
  });

  it("stays open with the photo and what was written when only the photo fails, and saves on retry", async () => {
    savePhotoMock.mockResolvedValueOnce(SAVE_RECIPE_PHOTO_RESULT.FAILED);
    const page = await renderEditor();
    await page.choosePhoto(createPhotoFile());

    await page.save();

    expect(await page.findAlert()).toHaveTextContent("La receta se guardó, pero la foto no.");
    expect(pushMock).not.toHaveBeenCalled();
    expect(page.getNameInput()).toHaveValue("Flan");
    expect(page.getPhoto("Vista previa de la foto")).toBeInTheDocument();

    await page.save();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/recetas"));
    expect(savePhotoMock).toHaveBeenCalledTimes(2);
  });

  it("says the recipe no longer exists when it is gone before saving its photo", async () => {
    savePhotoMock.mockResolvedValue(SAVE_RECIPE_PHOTO_RESULT.NOT_FOUND);
    const page = await renderEditor();
    await page.choosePhoto(createPhotoFile());

    await page.save();

    expect(await page.findNotFound()).toBeInTheDocument();
  });

  it("blocks the photo while saving and sends one request on a double click", async () => {
    let finish: (value: { recipeId: string }) => void = () => undefined;
    saveRecipeMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const page = await renderEditor({ url: "https://fotos/flan" });

    await page.doubleSave();

    expect(saveRecipeMock).toHaveBeenCalledTimes(1);
    expect(page.getPhotoInput()).toBeDisabled();
    expect(page.queryRemoveButton()).toBeDisabled();

    finish({ recipeId: "flan" });
    await waitFor(() => expect(savePhotoMock).toHaveBeenCalledTimes(1));
  });
});
