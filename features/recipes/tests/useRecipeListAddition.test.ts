// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecipeListAddition } from "../hooks/useRecipeListAddition";
import type { AddRecipeToListResponse } from "../models/recipe-list-addition.interfaces";
import { hasAddedRecipe, rememberAddedRecipe } from "../services/added-recipes.storage";
import { addRecipeToList } from "../services/recipes.service";

vi.mock("../services/recipes.service", () => ({ addRecipeToList: vi.fn() }));
vi.mock("../services/added-recipes.storage", () => ({ hasAddedRecipe: vi.fn(), rememberAddedRecipe: vi.fn() }));
const addMock = vi.mocked(addRecipeToList);
const hasAddedMock = vi.mocked(hasAddedRecipe);
const rememberMock = vi.mocked(rememberAddedRecipe);

const FLAN = { id: "recipe-flan", name: "Flan" };
const RICE = { id: "recipe-rice", name: "Arroz con leche" };
const RESPONSE: AddRecipeToListResponse = { addedProductNames: ["Leche"], missingItems: [], skippedProductNames: [] };

beforeEach(() => {
  vi.resetAllMocks();
  addMock.mockResolvedValue(RESPONSE);
  hasAddedMock.mockReturnValue(false);
});

describe("useRecipeListAddition", () => {
  it("adds the recipe, remembers it and leaves the summary only on its card", async () => {
    const { result } = renderHook(() => useRecipeListAddition());

    await act(async () => result.current.onAddRequest(FLAN));

    expect(addMock).toHaveBeenCalledWith({ recipeId: FLAN.id });
    expect(rememberMock).toHaveBeenCalledWith(FLAN.id);
    expect(result.current.getRecipeAddToList(FLAN.id).feedback).toEqual({
      isError: false,
      messages: ["Agregaste la receta a tu lista."],
      recipeId: FLAN.id,
    });
    expect(result.current.getRecipeAddToList(RICE.id).feedback).toBeNull();
  });

  it("adds one recipe at a time", async () => {
    let resolveAdd: (response: AddRecipeToListResponse) => void = () => undefined;
    addMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );
    const { result } = renderHook(() => useRecipeListAddition());
    act(() => result.current.onAddRequest(FLAN));

    expect(result.current.getRecipeAddToList(FLAN.id)).toMatchObject({ isAdding: true, isDisabled: true });
    expect(result.current.getRecipeAddToList(RICE.id)).toMatchObject({ isAdding: false, isDisabled: true });

    act(() => result.current.onAddRequest(RICE));
    expect(addMock).toHaveBeenCalledTimes(1);

    await act(async () => resolveAdd(RESPONSE));
    expect(result.current.getRecipeAddToList(RICE.id).isDisabled).toBe(false);
  });

  it("asks before adding again a recipe already added, and adds when confirmed", async () => {
    hasAddedMock.mockReturnValue(true);
    const { result } = renderHook(() => useRecipeListAddition());
    act(() => result.current.onAddRequest(FLAN));

    expect(result.current.isRepeatDialogOpen).toBe(true);
    expect(result.current.repeatRecipeName).toBe("Flan");
    expect(addMock).not.toHaveBeenCalled();

    await act(async () => result.current.onRepeatConfirm());

    expect(addMock).toHaveBeenCalledTimes(1);
    expect(result.current.isRepeatDialogOpen).toBe(false);
  });

  it("adds nothing when the repetition is cancelled", () => {
    hasAddedMock.mockReturnValue(true);
    const { result } = renderHook(() => useRecipeListAddition());
    act(() => result.current.onAddRequest(FLAN));

    act(() => result.current.onRepeatCancel());

    expect(result.current.isRepeatDialogOpen).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("ignores a confirmation without a question open", () => {
    const { result } = renderHook(() => useRecipeListAddition());

    act(() => result.current.onRepeatConfirm());
    act(() => result.current.onRepeatCancel());

    expect(addMock).not.toHaveBeenCalled();
  });

  it("says when the recipe no longer exists, and does not remember it", async () => {
    addMock.mockResolvedValue(null);
    const { result } = renderHook(() => useRecipeListAddition());

    await act(async () => result.current.onAddRequest(FLAN));

    expect(result.current.getRecipeAddToList(FLAN.id).feedback).toMatchObject({
      isError: true,
      messages: ["No encontramos esa receta."],
    });
    expect(rememberMock).not.toHaveBeenCalled();
  });

  it("shows the error and lets the user try again", async () => {
    addMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useRecipeListAddition());

    await act(async () => result.current.onAddRequest(FLAN));
    expect(result.current.getRecipeAddToList(FLAN.id).feedback).toMatchObject({
      isError: true,
      messages: ["No se pudo agregar la receta a tu lista. Intenta de nuevo."],
    });

    await act(async () => result.current.onAddRequest(FLAN));
    expect(result.current.getRecipeAddToList(FLAN.id).feedback).toMatchObject({ isError: false });
  });
});
