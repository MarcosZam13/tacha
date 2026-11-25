// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPE_AUDIENCE, RECIPE_EDITOR_STATUS, RECIPE_PHOTO_CHANGE, SAVE_RECIPE_OUTCOME } from "../constants/recipes.constants";
import { useRecipeEditor } from "../hooks/useRecipeEditor";
import type { SaveRecipeOutcome } from "../models/recipe-editor.types";
import type { RecipePhotoChange } from "../models/recipe-photo.types";
import { saveRecipeWithExtras } from "../services/recipe-save.service";
import { getRecipeForEditing } from "../services/recipes.service";
import { MILK, createPhotoFile, createValues } from "./recipe.fixtures";

vi.mock("../services/recipes.service", () => ({ getRecipeForEditing: vi.fn() }));
vi.mock("../services/recipe-save.service", () => ({ saveRecipeWithExtras: vi.fn() }));
const getRecipeMock = vi.mocked(getRecipeForEditing);
const saveMock = vi.mocked(saveRecipeWithExtras);

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
  saveMock.mockResolvedValue({ kind: SAVE_RECIPE_OUTCOME.SAVED });
});

describe("useRecipeEditor: saving", () => {
  it("saves a personal recipe with its photo", async () => {
    const result = renderNewRecipe();

    await act(async () => expect(await result.current.save(REPLACE)).toBe(true));

    expect(saveMock).toHaveBeenCalledExactlyOnceWith({
      photoChange: REPLACE,
      recipe: expect.objectContaining({ name: "Flan", recipeId: undefined }),
      shouldShare: false,
    });
  });

  it("shares it when the user chose the family", async () => {
    const result = renderNewRecipe();
    act(() => result.current.changeAudience(RECIPE_AUDIENCE.FAMILY));

    await act(async () => expect(await result.current.save(REPLACE)).toBe(true));

    expect(saveMock.mock.calls[0][0].shouldShare).toBe(true);
  });

  it("does not share again a recipe that already belongs to the family", async () => {
    getRecipeMock.mockResolvedValue({ isShared: true, photo: null, values: createValues() });
    const { result } = renderHook(() => useRecipeEditor("flan"));
    await waitFor(() => expect(result.current.state.isShared).toBe(true));

    await act(async () => expect(await result.current.save(REPLACE)).toBe(true));

    expect(saveMock.mock.calls[0][0].shouldShare).toBe(false);
  });

  it.each<SaveRecipeOutcome>([
    { kind: SAVE_RECIPE_OUTCOME.PHOTO_FAILED, recipeId: "new-flan" },
    { kind: SAVE_RECIPE_OUTCOME.SHARE_FAILED, recipeId: "new-flan" },
    { kind: SAVE_RECIPE_OUTCOME.PERSONAL_PRODUCTS, productNames: ["Pan"], recipeId: "new-flan" },
  ])("does not create the recipe again when retrying after $kind", async (outcome) => {
    saveMock.mockResolvedValueOnce(outcome);
    const result = renderNewRecipe();

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));
    expect(result.current.state.saveErrorMessage).not.toBeNull();
    await act(async () => expect(await result.current.save(REPLACE)).toBe(true));

    expect(saveMock.mock.calls.map(([payload]) => payload.recipe.recipeId)).toEqual([undefined, "new-flan"]);
  });

  it("goes back to personal when the user is no longer in a family", async () => {
    saveMock.mockResolvedValueOnce({ kind: SAVE_RECIPE_OUTCOME.NO_HOUSEHOLD, recipeId: "new-flan" });
    const result = renderNewRecipe();
    act(() => result.current.changeAudience(RECIPE_AUDIENCE.FAMILY));

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));

    expect(result.current.state.audience).toBe(RECIPE_AUDIENCE.PERSONAL);
  });

  it("stays on editing, without an id, when the recipe was not saved", async () => {
    saveMock.mockResolvedValueOnce({ kind: SAVE_RECIPE_OUTCOME.SAVE_FAILED });
    const result = renderNewRecipe();

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));

    expect(result.current.state).toMatchObject({ savedRecipeId: null, status: RECIPE_EDITOR_STATUS.EDITING });
  });

  it("says the recipe is gone", async () => {
    saveMock.mockResolvedValueOnce({ kind: SAVE_RECIPE_OUTCOME.NOT_FOUND });
    const result = renderNewRecipe();

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));

    expect(result.current.state.status).toBe(RECIPE_EDITOR_STATUS.NOT_FOUND);
  });

  it("sends nothing when the form has errors", async () => {
    const { result } = renderHook(() => useRecipeEditor(undefined));

    await act(async () => expect(await result.current.save(REPLACE)).toBe(false));

    expect(saveMock).not.toHaveBeenCalled();
  });

  it("sends one request when it is called twice in a row", async () => {
    const result = renderNewRecipe();

    await act(async () => {
      await Promise.all([result.current.save(REPLACE), result.current.save(REPLACE)]);
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
