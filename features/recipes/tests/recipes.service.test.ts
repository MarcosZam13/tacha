import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecipePhotoUrls, removeRecipePhotoFile } from "../services/recipe-photos.service";
import { deleteRecipe, getRecipeForEditing, getRecipeSummaries } from "../services/recipes.service";

// La consulta encadenada responde lo que el test decide, sin Supabase real.
const query = { delete: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), order: vi.fn(), select: vi.fn() };

vi.mock("@/services/supabase.client", () => ({
  ensureSession: vi.fn().mockResolvedValue(undefined),
  getSupabaseClient: () => ({ from: () => query }),
}));
vi.mock("../services/recipe-photos.service", () => ({ getRecipePhotoUrls: vi.fn(), removeRecipePhotoFile: vi.fn() }));
const getUrlsMock = vi.mocked(getRecipePhotoUrls);
const removeFileMock = vi.mocked(removeRecipePhotoFile);

const createRow = (id: string, photoPath: string | null) => ({
  base_servings: 4,
  id,
  name: id,
  photo_path: photoPath,
  recipe_ingredients: [],
});

beforeEach(() => {
  vi.resetAllMocks();
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  getUrlsMock.mockResolvedValue(new Map());
});

describe("getRecipeSummaries", () => {
  it("asks for the links of the recipes that have a photo, in one request", async () => {
    query.order.mockResolvedValue({ data: [createRow("flan", "flan/1.jpg"), createRow("arroz", null)], error: null });
    getUrlsMock.mockResolvedValue(new Map([["flan/1.jpg", "https://flan"]]));

    const recipes = await getRecipeSummaries();

    expect(getUrlsMock).toHaveBeenCalledExactlyOnceWith(["flan/1.jpg"]);
    expect(recipes.map((recipe) => recipe.photoUrl)).toEqual(["https://flan", null]);
  });

  it("shows the recipes without photo when there are no links", async () => {
    query.order.mockResolvedValue({ data: [createRow("flan", "flan/1.jpg")], error: null });

    expect((await getRecipeSummaries())[0].photoUrl).toBeNull();
  });
});

describe("getRecipeForEditing", () => {
  it("brings the photo with its link", async () => {
    query.maybeSingle.mockResolvedValue({ data: createRow("flan", "flan/1.jpg"), error: null });
    getUrlsMock.mockResolvedValue(new Map([["flan/1.jpg", "https://flan"]]));

    expect((await getRecipeForEditing("flan"))?.photo).toEqual({ url: "https://flan" });
  });

  it("still has a photo when its link could not be asked, and none when it has no path", async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: createRow("flan", "flan/1.jpg"), error: null });
    expect((await getRecipeForEditing("flan"))?.photo).toEqual({ url: null });

    query.maybeSingle.mockResolvedValueOnce({ data: createRow("flan", null), error: null });
    expect((await getRecipeForEditing("flan"))?.photo).toBeNull();
  });

  it("is null when the recipe is not found", async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getRecipeForEditing("flan")).resolves.toBeNull();
  });
});

describe("deleteRecipe", () => {
  it("deletes the file of the recipe that was deleted", async () => {
    query.select.mockResolvedValue({ data: [{ photo_path: "flan/1.jpg" }], error: null });

    await deleteRecipe({ recipeId: "flan" });

    expect(query.select).toHaveBeenCalledWith("photo_path");
    expect(removeFileMock).toHaveBeenCalledExactlyOnceWith("flan/1.jpg");
  });

  it("deletes no file when the recipe was already gone", async () => {
    query.select.mockResolvedValue({ data: [], error: null });

    await expect(deleteRecipe({ recipeId: "flan" })).resolves.toEqual({ recipeId: "flan" });
    expect(removeFileMock).not.toHaveBeenCalled();
  });

  it("deletes no file when the recipe could not be deleted", async () => {
    const databaseError = { code: "42501" };
    query.select.mockResolvedValue({ data: null, error: databaseError });

    await expect(deleteRecipe({ recipeId: "flan" })).rejects.toBe(databaseError);
    expect(removeFileMock).not.toHaveBeenCalled();
  });
});
