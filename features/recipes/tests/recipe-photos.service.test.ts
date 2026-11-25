import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPE_PHOTO_CHANGE } from "../constants/recipes.constants";
import { cleanSavedRecipePhoto, getRecipePhotoUrls, removeRecipePhotoFile, saveRecipePhoto } from "../services/recipe-photos.service";
import { removePhotoMetadata } from "../utils/removePhotoMetadata";
import { createPhotoFile } from "./recipe.fixtures";

const createSignedUrlsMock = vi.fn();
const downloadMock = vi.fn();
const fromMock = vi.fn();
const removeMock = vi.fn();
const maybeSingleMock = vi.fn();
const rpcMock = vi.fn();
const uploadMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }) }),
    rpc: rpcMock,
    storage: { from: fromMock },
  }),
}));
vi.mock("../utils/removePhotoMetadata", () => ({ removePhotoMetadata: vi.fn() }));
const removeMetadataMock = vi.mocked(removePhotoMetadata);

const PREVIOUS_PATH = "flan/anterior.png";
const NEW_PATH = expect.stringMatching(/^flan\/[0-9a-f-]{36}\.jpg$/);
const CLEAN_FILE = createPhotoFile("image/jpeg", "limpia");
const REPLACE = { file: createPhotoFile(), kind: RECIPE_PHOTO_CHANGE.REPLACE };
const REMOVE = { kind: RECIPE_PHOTO_CHANGE.REMOVE };

const save = (change: Parameters<typeof saveRecipePhoto>[0]["change"]) => saveRecipePhoto({ change, recipeId: "flan" });

beforeEach(() => {
  vi.resetAllMocks();
  fromMock.mockReturnValue({ createSignedUrls: createSignedUrlsMock, download: downloadMock, remove: removeMock, upload: uploadMock });
  removeMetadataMock.mockResolvedValue(CLEAN_FILE);
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
  rpcMock.mockResolvedValue({ data: null, error: null });
});

describe("getRecipePhotoUrls", () => {
  it("asks for all the links at once, for one hour", async () => {
    createSignedUrlsMock.mockResolvedValue({
      data: [
        { error: null, path: "a/1.jpg", signedUrl: "https://a" },
        { error: "not found", path: "b/2.jpg", signedUrl: "" },
      ],
    });

    const urls = await getRecipePhotoUrls(["a/1.jpg", "b/2.jpg"]);

    expect(fromMock).toHaveBeenCalledWith("recipe-photos");
    expect(createSignedUrlsMock).toHaveBeenCalledExactlyOnceWith(["a/1.jpg", "b/2.jpg"], 3600);
    expect([...urls]).toEqual([["a/1.jpg", "https://a"]]);
  });

  it("asks for nothing without photos", async () => {
    expect((await getRecipePhotoUrls([])).size).toBe(0);
    expect(createSignedUrlsMock).not.toHaveBeenCalled();
  });

  it("gives no links, without failing, when Storage answers an error or breaks", async () => {
    createSignedUrlsMock.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect((await getRecipePhotoUrls(["a/1.jpg"])).size).toBe(0);

    createSignedUrlsMock.mockRejectedValueOnce(new Error("network"));
    expect((await getRecipePhotoUrls(["a/1.jpg"])).size).toBe(0);
  });
});

describe("saveRecipePhoto", () => {
  it("touches nothing when the photo is kept", async () => {
    await expect(save({ kind: RECIPE_PHOTO_CHANGE.KEEP })).resolves.toBe("saved");

    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("uploads to the folder of the recipe, saves the path and deletes the previous file, in that order", async () => {
    rpcMock.mockResolvedValue({ data: PREVIOUS_PATH, error: null });

    await expect(save(REPLACE)).resolves.toBe("saved");

    expect(uploadMock).toHaveBeenCalledWith(NEW_PATH, CLEAN_FILE, { contentType: "image/jpeg", upsert: false });
    expect(rpcMock).toHaveBeenCalledWith("set_recipe_photo", { new_photo_path: NEW_PATH, target_recipe_id: "flan" });
    expect(removeMock).toHaveBeenCalledExactlyOnceWith([PREVIOUS_PATH]);
    expect(uploadMock.mock.invocationCallOrder[0]).toBeLessThan(rpcMock.mock.invocationCallOrder[0]);
    expect(rpcMock.mock.invocationCallOrder[0]).toBeLessThan(removeMock.mock.invocationCallOrder[0]);
  });

  it("removes the photo without uploading", async () => {
    rpcMock.mockResolvedValue({ data: PREVIOUS_PATH, error: null });

    await expect(save(REMOVE)).resolves.toBe("saved");

    expect(uploadMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("set_recipe_photo", { new_photo_path: undefined, target_recipe_id: "flan" });
    expect(removeMock).toHaveBeenCalledWith([PREVIOUS_PATH]);
  });

  it("deletes nothing when there was no previous photo", async () => {
    await save(REPLACE);

    expect(removeMock).not.toHaveBeenCalled();
  });

  it("does not touch the recipe when the upload fails", async () => {
    uploadMock.mockResolvedValue({ error: { message: "too big" } });

    await expect(save(REPLACE)).resolves.toBe("failed");

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("uploads nothing when the metadata could not be removed", async () => {
    removeMetadataMock.mockRejectedValue(new Error("canvas"));

    await expect(save(REPLACE)).resolves.toBe("failed");

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("uses the type the browser produced", async () => {
    removeMetadataMock.mockResolvedValue(createPhotoFile("image/png"));

    await save({ ...REPLACE, file: createPhotoFile("image/webp") });

    expect(uploadMock.mock.calls[0][0]).toMatch(/\.png$/);
    expect(uploadMock.mock.calls[0][2]).toMatchObject({ contentType: "image/png" });
  });

  it("does not upload a file of another type", async () => {
    removeMetadataMock.mockResolvedValue(createPhotoFile("image/gif"));
    await expect(save({ ...REPLACE, file: createPhotoFile("image/gif") })).resolves.toBe("failed");

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("deletes the uploaded file when the database rejects the path", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "23514" } });

    await expect(save(REPLACE)).resolves.toBe("failed");

    expect(removeMock).toHaveBeenCalledExactlyOnceWith([NEW_PATH]);
  });

  it("says the recipe no longer exists", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "P0002" } });

    await expect(save(REPLACE)).resolves.toBe("notFound");

    expect(removeMock).toHaveBeenCalledWith([NEW_PATH]);
  });

  it.each(["", "57014", "PGRST003"])("keeps the uploaded file with the error %j: the path may have been saved", async (code) => {
    rpcMock.mockResolvedValue({ data: null, error: { code, message: "x" } });

    await expect(save(REPLACE)).resolves.toBe("failed");

    expect(removeMock).not.toHaveBeenCalled();
  });

  it("does not throw when something breaks", async () => {
    uploadMock.mockRejectedValue(new Error("network"));

    await expect(save(REPLACE)).resolves.toBe("failed");
  });

  it("is saved even if deleting the previous file fails", async () => {
    rpcMock.mockResolvedValue({ data: PREVIOUS_PATH, error: null });
    removeMock.mockRejectedValue(new Error("network"));

    await expect(save(REPLACE)).resolves.toBe("saved");
  });
});

describe("removeRecipePhotoFile", () => {
  it("does nothing without a path and never throws", async () => {
    await removeRecipePhotoFile(null);
    expect(removeMock).not.toHaveBeenCalled();

    removeMock.mockRejectedValue(new Error("network"));
    await expect(removeRecipePhotoFile("a/1.jpg")).resolves.toBeUndefined();
  });
});

describe("cleanSavedRecipePhoto", () => {
  const savedPhoto = new Blob(["con ubicación"], { type: "image/jpeg" });

  beforeEach(() => {
    maybeSingleMock.mockResolvedValue({ data: { photo_path: PREVIOUS_PATH }, error: null });
    downloadMock.mockResolvedValue({ data: savedPhoto, error: null });
    rpcMock.mockResolvedValue({ data: PREVIOUS_PATH, error: null });
  });

  it("replaces the current photo with a clean one", async () => {
    await expect(cleanSavedRecipePhoto("flan")).resolves.toBe(true);

    expect(downloadMock).toHaveBeenCalledWith(PREVIOUS_PATH);
    expect(uploadMock).toHaveBeenCalledWith(NEW_PATH, CLEAN_FILE, expect.anything());
    expect(removeMock).toHaveBeenCalledWith([PREVIOUS_PATH]);
  });

  it("has nothing to clean without a photo", async () => {
    maybeSingleMock.mockResolvedValue({ data: { photo_path: null }, error: null });

    await expect(cleanSavedRecipePhoto("flan")).resolves.toBe(true);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it.each([
    ["the recipe cannot be read", () => maybeSingleMock.mockResolvedValue({ data: null, error: { code: "x" } })],
    ["the recipe is gone", () => maybeSingleMock.mockResolvedValue({ data: null, error: null })],
    ["the photo cannot be downloaded", () => downloadMock.mockResolvedValue({ data: null, error: { message: "x" } })],
    ["the photo cannot be cleaned", () => removeMetadataMock.mockRejectedValue(new Error("canvas"))],
    ["something breaks", () => downloadMock.mockRejectedValue(new Error("network"))],
  ])("is not ready when %s", async (_case, arrange) => {
    arrange();

    await expect(cleanSavedRecipePhoto("flan")).resolves.toBe(false);
  });
});
