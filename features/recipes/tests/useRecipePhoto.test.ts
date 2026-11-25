// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPE_PHOTO_CHANGE } from "../constants/recipes.constants";
import { useRecipePhoto } from "../hooks/useRecipePhoto";
import type { SavedRecipePhoto } from "../models/recipe-photo.interfaces";
import { createPhotoFile } from "./recipe.fixtures";

const SAVED: SavedRecipePhoto = { url: "https://flan" };
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();

const renderPhoto = (savedPhoto: SavedRecipePhoto | null) => renderHook(() => useRecipePhoto(savedPhoto));

beforeEach(() => {
  vi.resetAllMocks();
  createObjectUrlMock.mockReturnValueOnce("blob:1").mockReturnValueOnce("blob:2");
  // jsdom no trae estas dos funciones.
  URL.createObjectURL = createObjectUrlMock;
  URL.revokeObjectURL = revokeObjectUrlMock;
});

describe("useRecipePhoto", () => {
  it("keeps the saved photo until something is chosen", () => {
    const { result } = renderPhoto(SAVED);

    expect(result.current).toMatchObject({
      change: { kind: RECIPE_PHOTO_CHANGE.KEEP },
      hasPendingChange: false,
      hasPhoto: true,
      photoUrl: "https://flan",
    });
  });

  it("has no photo for a new recipe", () => {
    expect(renderPhoto(null).result.current).toMatchObject({ hasPhoto: false, photoUrl: null });
  });

  it("can change or remove a saved photo whose link did not load", () => {
    expect(renderPhoto({ url: null }).result.current).toMatchObject({ hasPhoto: true, photoUrl: null });
  });

  it("previews the chosen file", () => {
    const file = createPhotoFile();
    const { result } = renderPhoto(null);

    act(() => result.current.onPhotoSelect(file));

    expect(result.current).toMatchObject({
      change: { file, kind: RECIPE_PHOTO_CHANGE.REPLACE },
      hasPendingChange: true,
      hasPhoto: true,
      isPreview: true,
      photoUrl: "blob:1",
    });
  });

  it("keeps what was chosen when the next file is not valid, and says why", () => {
    const { result } = renderPhoto(null);
    act(() => result.current.onPhotoSelect(createPhotoFile()));

    act(() => result.current.onPhotoSelect(createPhotoFile("image/gif")));

    expect(result.current.errorMessage).toBe("Elige una foto JPG, PNG o WebP.");
    expect(result.current.photoUrl).toBe("blob:1");

    act(() => result.current.onPhotoSelect(createPhotoFile("image/png")));
    expect(result.current.errorMessage).toBeUndefined();
  });

  it("goes back to the saved photo when the chosen one is removed", () => {
    const { result } = renderPhoto(SAVED);
    act(() => result.current.onPhotoSelect(createPhotoFile()));

    act(() => result.current.onPhotoRemove());

    expect(result.current).toMatchObject({ hasPendingChange: false, photoUrl: "https://flan" });
  });

  it("marks the saved photo to be removed, and another one can still be chosen", () => {
    const { result } = renderPhoto(SAVED);

    act(() => result.current.onPhotoRemove());
    expect(result.current).toMatchObject({
      change: { kind: RECIPE_PHOTO_CHANGE.REMOVE },
      hasPendingChange: true,
      hasPhoto: false,
      photoUrl: null,
    });

    act(() => result.current.onPhotoSelect(createPhotoFile()));
    expect(result.current.photoUrl).toBe("blob:1");
  });

  it("frees the preview when it changes and when the screen closes", () => {
    const { result, unmount } = renderPhoto(null);
    act(() => result.current.onPhotoSelect(createPhotoFile()));
    act(() => result.current.onPhotoSelect(createPhotoFile()));
    expect(revokeObjectUrlMock).toHaveBeenCalledExactlyOnceWith("blob:1");

    unmount();

    expect(revokeObjectUrlMock).toHaveBeenLastCalledWith("blob:2");
  });
});
