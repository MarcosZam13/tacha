// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasUnsavedChanges } from "@/services/unsaved-changes.service";
import { RECIPE_PHOTO_CHANGE, SAVE_RECIPE_PHOTO_RESULT, SHARE_RECIPE_RESULT } from "../constants/recipes.constants";
import type { SavedRecipePhoto } from "../models/recipe-photo.interfaces";
import { RecipeEditor } from "../RecipeEditor";
import { cleanSavedRecipePhoto, saveRecipePhoto } from "../services/recipe-photos.service";
import { hasHousehold, shareRecipe } from "../services/recipe-sharing.service";
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
vi.mock("../services/recipe-photos.service", () => ({
  cleanSavedRecipePhoto: vi.fn(),
  saveRecipePhoto: vi.fn(),
}));
vi.mock("../services/recipe-sharing.service", () => ({ hasHousehold: vi.fn(), shareRecipe: vi.fn() }));
const cleanPhotoMock = vi.mocked(cleanSavedRecipePhoto);
const hasHouseholdMock = vi.mocked(hasHousehold);
const shareMock = vi.mocked(shareRecipe);
const getRecipeMock = vi.mocked(getRecipeForEditing);
const saveRecipeMock = vi.mocked(saveRecipe);
const savePhotoMock = vi.mocked(saveRecipePhoto);

const renderEditor = async (photo: SavedRecipePhoto | null = null, isShared = false) => {
  getRecipeMock.mockResolvedValue({ isShared, photo, values: createValues() });
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
  cleanPhotoMock.mockResolvedValue(true);
  hasHouseholdMock.mockResolvedValue(false);
  shareMock.mockResolvedValue({ kind: SHARE_RECIPE_RESULT.SHARED });
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

describe("RecipeEditor: who it is for", () => {
  it("does not offer it without a family", async () => {
    const page = await renderEditor();

    await waitFor(() => expect(hasHouseholdMock).toHaveBeenCalled());
    expect(page.queryAudience()).not.toBeInTheDocument();
  });

  it("does not offer it when the family could not be asked, and still saves as personal", async () => {
    hasHouseholdMock.mockRejectedValue(new Error("network"));
    const page = await renderEditor();

    await page.save();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/recetas"));
    expect(page.queryAudience()).not.toBeInTheDocument();
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("is personal by default", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    const page = await renderEditor();

    expect(await page.findAudienceOption("Solo para mí")).toBeChecked();
    await page.save();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/recetas"));
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("explains what sharing means and shares after saving the recipe and cleaning its photo", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    const page = await renderEditor({ url: "https://fotos/flan" });

    await page.chooseAudience("Para mi familia");
    expect(page.getText("Si es para tu familia, podrán verla, editarla y eliminarla. No se puede deshacer.")).toBeInTheDocument();
    await page.save();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/recetas"));
    expect(shareMock).toHaveBeenCalledExactlyOnceWith("flan");
    expect(cleanPhotoMock.mock.invocationCallOrder[0]).toBeLessThan(shareMock.mock.invocationCallOrder[0]);
  });

  it("names the personal products and stays open", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    shareMock.mockResolvedValue({ kind: SHARE_RECIPE_RESULT.PERSONAL_PRODUCTS, productNames: ["Pan", "Miel"] });
    const page = await renderEditor();
    await page.chooseAudience("Para mi familia");

    await page.save();

    expect(await page.findAlert()).toHaveTextContent("cambia estos ingredientes personales: Pan, Miel.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("stops offering it when the user is no longer in a family", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    shareMock.mockResolvedValue({ kind: SHARE_RECIPE_RESULT.NO_HOUSEHOLD });
    const page = await renderEditor();
    await page.chooseAudience("Para mi familia");

    await page.save();

    expect(await page.findAlert()).toHaveTextContent("Ya no formas parte de una familia.");
    expect(page.queryAudience()).not.toBeInTheDocument();
  });

  it("only says it belongs to the family when it already does", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    const page = await renderEditor(null, true);

    expect(page.getText("Esta receta es de tu familia.")).toBeInTheDocument();
    expect(page.queryAudience()).not.toBeInTheDocument();
  });
});
