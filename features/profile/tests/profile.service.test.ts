import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILE_PHOTO_CHANGE, SAVE_PROFILE_RESULT } from "../constants/profile.constants";
import { saveProfile } from "../services/profile.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con los métodos que se usan.
const getUserMock = vi.fn();
const updateUserMock = vi.fn();
const uploadMock = vi.fn();
const removeMock = vi.fn();
const getPublicUrlMock = vi.fn();
const fromMock = vi.fn();
const getSupabaseClientMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const USER_ID = "user-1";
const BASE_URL = "https://proyecto.supabase.co/storage/v1/object/public/avatars";
const OLD_AVATAR_URL = `${BASE_URL}/${USER_ID}/vieja.png`;
const NEW_FILE = new File(["x"], "nueva.png", { type: "image/png" });

const KEEP = { kind: PROFILE_PHOTO_CHANGE.KEEP } as const;
const REMOVE = { kind: PROFILE_PHOTO_CHANGE.REMOVE } as const;
const REPLACE = { file: NEW_FILE, kind: PROFILE_PHOTO_CHANGE.REPLACE } as const;

const mockSessionUser = (metadata: Record<string, unknown>): void => {
  getUserMock.mockResolvedValue({ data: { user: { id: USER_ID, user_metadata: metadata } }, error: null });
};

beforeEach(() => {
  vi.resetAllMocks();
  fromMock.mockReturnValue({ getPublicUrl: getPublicUrlMock, remove: removeMock, upload: uploadMock });
  getPublicUrlMock.mockImplementation((path: string) => ({ data: { publicUrl: `${BASE_URL}/${path}` } }));
  getSupabaseClientMock.mockReturnValue({
    auth: { getUser: getUserMock, updateUser: updateUserMock },
    storage: { from: fromMock },
  });
  uploadMock.mockResolvedValue({ data: {}, error: null });
  updateUserMock.mockResolvedValue({ data: {}, error: null });
  removeMock.mockResolvedValue({ data: [], error: null });
  mockSessionUser({ avatar_url: OLD_AVATAR_URL, name: "Ana" });
});

describe("saveProfile", () => {
  it("saves only the trimmed name when the photo is kept, without touching storage", async () => {
    const result = await saveProfile({ name: "  Ana María ", photo: KEEP });

    expect(result).toBe(SAVE_PROFILE_RESULT.SUCCESS);
    expect(updateUserMock).toHaveBeenCalledWith({ data: { name: "Ana María" } });
    expect(uploadMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("uploads the new photo to the user's own folder and saves its public URL", async () => {
    await saveProfile({ name: "Ana", photo: REPLACE });

    const [uploadedPath, uploadedFile, options] = uploadMock.mock.calls[0];
    expect(uploadedPath).toMatch(new RegExp(`^${USER_ID}/[0-9a-f-]{36}\\.png$`));
    expect(uploadedFile).toBe(NEW_FILE);
    expect(options).toMatchObject({ contentType: "image/png", upsert: false });
    expect(updateUserMock).toHaveBeenCalledWith({
      data: { avatar_url: `${BASE_URL}/${uploadedPath}`, name: "Ana" },
    });
  });

  it("deletes the previous photo once the profile is saved", async () => {
    await saveProfile({ name: "Ana", photo: REPLACE });

    expect(removeMock).toHaveBeenCalledWith([`${USER_ID}/vieja.png`]);
  });

  it("clears the photo and deletes the previous object when it is removed", async () => {
    const result = await saveProfile({ name: "Ana", photo: REMOVE });

    expect(result).toBe(SAVE_PROFILE_RESULT.SUCCESS);
    expect(updateUserMock).toHaveBeenCalledWith({ data: { avatar_url: null, name: "Ana" } });
    expect(removeMock).toHaveBeenCalledWith([`${USER_ID}/vieja.png`]);
  });

  it("changes nothing when the upload fails", async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: "too large" } });

    const result = await saveProfile({ name: "Otro nombre", photo: REPLACE });

    expect(result).toBe(SAVE_PROFILE_RESULT.PHOTO_ERROR);
    expect(updateUserMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("deletes the photo it just uploaded when saving the profile fails, and keeps the old one", async () => {
    updateUserMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    const result = await saveProfile({ name: "Ana", photo: REPLACE });

    const [uploadedPath] = uploadMock.mock.calls[0];
    expect(result).toBe(SAVE_PROFILE_RESULT.ERROR);
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledWith([uploadedPath]);
  });

  it("does not delete anything for a previous avatar_url that is not from the bucket", async () => {
    mockSessionUser({ avatar_url: "https://otro-sitio.com/foto.png", name: "Ana" });

    await saveProfile({ name: "Ana", photo: REMOVE });

    expect(removeMock).not.toHaveBeenCalled();
  });

  it("still reports success when deleting the previous photo throws", async () => {
    removeMock.mockRejectedValue(new Error("network"));

    expect(await saveProfile({ name: "Ana", photo: REPLACE })).toBe(SAVE_PROFILE_RESULT.SUCCESS);
  });

  it("reports an error when there is no session user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });

    expect(await saveProfile({ name: "Ana", photo: KEEP })).toBe(SAVE_PROFILE_RESULT.ERROR);
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("does not throw when Supabase is not available", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Faltan las variables");
    });

    expect(await saveProfile({ name: "Ana", photo: KEEP })).toBe(SAVE_PROFILE_RESULT.ERROR);
  });
});
