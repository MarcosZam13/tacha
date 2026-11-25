import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPE_PHOTO_CHANGE, SAVE_RECIPE_OUTCOME, SAVE_RECIPE_PHOTO_RESULT, SHARE_RECIPE_RESULT } from "../constants/recipes.constants";
import type { RecipePhotoChange } from "../models/recipe-photo.types";
import { cleanSavedRecipePhoto, saveRecipePhoto } from "../services/recipe-photos.service";
import { saveRecipeWithExtras } from "../services/recipe-save.service";
import { shareRecipe } from "../services/recipe-sharing.service";
import { saveRecipe } from "../services/recipes.service";
import { createPhotoFile } from "./recipe.fixtures";

vi.mock("../services/recipe-photos.service", () => ({ cleanSavedRecipePhoto: vi.fn(), saveRecipePhoto: vi.fn() }));
vi.mock("../services/recipe-sharing.service", () => ({ shareRecipe: vi.fn() }));
vi.mock("../services/recipes.service", () => ({ saveRecipe: vi.fn() }));
const cleanMock = vi.mocked(cleanSavedRecipePhoto);
const photoMock = vi.mocked(saveRecipePhoto);
const recipeMock = vi.mocked(saveRecipe);
const shareMock = vi.mocked(shareRecipe);

const KEEP: RecipePhotoChange = { kind: RECIPE_PHOTO_CHANGE.KEEP };
const REPLACE: RecipePhotoChange = { file: createPhotoFile(), kind: RECIPE_PHOTO_CHANGE.REPLACE };
const recipe = { baseServings: 4, ingredients: [], name: "Flan", recipeId: undefined };

const save = (photoChange: RecipePhotoChange = KEEP, shouldShare = true) => saveRecipeWithExtras({ photoChange, recipe, shouldShare });

beforeEach(() => {
  vi.resetAllMocks();
  cleanMock.mockResolvedValue(true);
  photoMock.mockResolvedValue(SAVE_RECIPE_PHOTO_RESULT.SAVED);
  recipeMock.mockResolvedValue({ recipeId: "flan" });
  shareMock.mockResolvedValue({ kind: SHARE_RECIPE_RESULT.SHARED });
});

describe("saveRecipeWithExtras", () => {
  it("saves the recipe, its photo and shares it, in that order", async () => {
    await expect(save(REPLACE)).resolves.toEqual({ kind: SAVE_RECIPE_OUTCOME.SAVED });

    expect(photoMock).toHaveBeenCalledWith({ change: REPLACE, recipeId: "flan" });
    expect(recipeMock.mock.invocationCallOrder[0]).toBeLessThan(photoMock.mock.invocationCallOrder[0]);
    expect(photoMock.mock.invocationCallOrder[0]).toBeLessThan(shareMock.mock.invocationCallOrder[0]);
  });

  it("does not share a personal recipe", async () => {
    await expect(save(KEEP, false)).resolves.toEqual({ kind: SAVE_RECIPE_OUTCOME.SAVED });

    expect(shareMock).not.toHaveBeenCalled();
    expect(cleanMock).not.toHaveBeenCalled();
  });

  it("cleans only a photo that was already there", async () => {
    await save(REPLACE);
    await save({ kind: RECIPE_PHOTO_CHANGE.REMOVE });
    expect(cleanMock).not.toHaveBeenCalled();

    await save(KEEP);
    expect(cleanMock).toHaveBeenCalledExactlyOnceWith("flan");
  });

  it("does not share when that photo could not be cleaned", async () => {
    cleanMock.mockResolvedValue(false);

    await expect(save()).resolves.toEqual({ kind: SAVE_RECIPE_OUTCOME.SHARE_FAILED, recipeId: "flan" });
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("stops when the recipe was not saved", async () => {
    recipeMock.mockRejectedValueOnce(new Error("network"));
    await expect(save()).resolves.toEqual({ kind: SAVE_RECIPE_OUTCOME.SAVE_FAILED });

    recipeMock.mockResolvedValueOnce(null);
    await expect(save()).resolves.toEqual({ kind: SAVE_RECIPE_OUTCOME.NOT_FOUND });

    expect(photoMock).not.toHaveBeenCalled();
    expect(shareMock).not.toHaveBeenCalled();
  });

  it("names the personal products that a family recipe cannot have", async () => {
    recipeMock.mockRejectedValue({ code: "22023", details: '["Pan"]', hint: "recipe_personal_products" });

    await expect(save()).resolves.toEqual({ kind: SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS, productNames: ["Pan"] });
  });

  it.each([
    [SAVE_RECIPE_PHOTO_RESULT.FAILED, { kind: SAVE_RECIPE_OUTCOME.PHOTO_FAILED, recipeId: "flan" }],
    [SAVE_RECIPE_PHOTO_RESULT.NOT_FOUND, { kind: SAVE_RECIPE_OUTCOME.NOT_FOUND }],
  ])("does not share when the photo ends as %s", async (photoResult, outcome) => {
    photoMock.mockResolvedValue(photoResult);

    await expect(save(REPLACE)).resolves.toEqual(outcome);
    expect(shareMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ kind: SHARE_RECIPE_RESULT.FAILED }, { kind: SAVE_RECIPE_OUTCOME.SHARE_FAILED, recipeId: "flan" }],
    [{ kind: SHARE_RECIPE_RESULT.NO_HOUSEHOLD }, { kind: SAVE_RECIPE_OUTCOME.NO_HOUSEHOLD, recipeId: "flan" }],
    [{ kind: SHARE_RECIPE_RESULT.HOUSEHOLD_LIMIT }, { kind: SAVE_RECIPE_OUTCOME.HOUSEHOLD_LIMIT, recipeId: "flan" }],
    [{ kind: SHARE_RECIPE_RESULT.NOT_FOUND }, { kind: SAVE_RECIPE_OUTCOME.NOT_FOUND }],
    [
      { kind: SHARE_RECIPE_RESULT.PERSONAL_PRODUCTS, productNames: ["Pan"] },
      { kind: SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS, productNames: ["Pan"], recipeId: "flan" },
    ],
  ] as const)("tells how sharing ended: %j", async (shareResult, outcome) => {
    shareMock.mockResolvedValue(
      "productNames" in shareResult ? { ...shareResult, productNames: [...shareResult.productNames] } : shareResult,
    );

    await expect(save()).resolves.toEqual(outcome);
  });
});
