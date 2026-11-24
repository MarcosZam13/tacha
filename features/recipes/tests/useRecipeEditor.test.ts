// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPE_PHOTO_CHANGE, SAVE_RECIPE_PHOTO_RESULT } from "../constants/recipes.constants";
import { useRecipeEditor } from "../hooks/useRecipeEditor";
import type { RecipePhotoChange } from "../models/recipe-photo.types";
import { saveRecipePhoto } from "../services/recipe-photos.service";
import { saveRecipe } from "../services/recipes.service";
import { MILK, createPhotoFile } from "./recipe.fixtures";

vi.mock("../services/recipes.service", () => ({ getRecipeForEditing: vi.fn(), saveRecipe: vi.fn() }));
vi.mock("../services/recipe-photos.service", () => ({ saveRecipePhoto: vi.fn() }));
const saveRecipeMock = vi.mocked(saveRecipe);
const savePhotoMock = vi.mocked(saveRecipePhoto);

const REPLACE: RecipePhotoChange = { file: createPhotoFile(), kind: RECIPE_PHOTO_CHANGE.REPLACE };

const renderNewRecipe = () => {
  const { result } = renderHook(() => useRecipeEditor(undefined));
  act(() => {
    result.current.changeName("Flan");
    result.current.changeBaseServings("4");
    result.current.addIngredient(MILK);
  });
  return result;
};

beforeEach(() => {
  vi.resetAllMocks();
  saveRecipeMock.mockResolvedValue({ recipeId: "new-flan" });
  savePhotoMock.mockResolvedValue(SAVE_RECIPE_PHOTO_RESULT.SAVED);
});

describe("useRecipeEditor: saving a new recipe with its photo", () => {
  it("saves the photo in the recipe that was just created", async () => {
    const result = renderNewRecipe();

    await act(async () => expect(await result.current.save(REPLACE)).toBe(true));

    expect(savePhotoMock).toHaveBeenCalledWith({ change: REPLACE, recipeId: "new-flan" });
  });

  it("does not create the recipe again when the photo is retried", async () => {
    savePhotoMock.mockResolvedValueOnce(SAVE_RECIPE_PHOTO_RESULT.FAILED);
    const result = renderNewRecipe();

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));
    await act(async () => expect(await result.current.save(REPLACE)).toBe(true));

    expect(saveRecipeMock.mock.calls.map(([payload]) => payload.recipeId)).toEqual([undefined, "new-flan"]);
  });

  it("sends nothing when the form has errors", async () => {
    const { result } = renderHook(() => useRecipeEditor(undefined));

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));

    expect(saveRecipeMock).not.toHaveBeenCalled();
    expect(savePhotoMock).not.toHaveBeenCalled();
  });

  it("sends one request when it is called twice in a row", async () => {
    const result = renderNewRecipe();

    await act(async () => {
      await Promise.all([result.current.save(REPLACE), result.current.save(REPLACE)]);
    });

    expect(saveRecipeMock).toHaveBeenCalledTimes(1);
  });
});
