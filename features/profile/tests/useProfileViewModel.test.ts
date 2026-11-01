// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  PROFILE_ERROR_MESSAGE,
  PROFILE_PHOTO_CHANGE,
  PROFILE_SAVE_STATUS,
  SAVE_PROFILE_RESULT,
} from "../constants/profile.constants";
import { useProfileViewModel } from "../hooks/useProfileViewModel";
import { saveProfile } from "../services/profile.service";

vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: vi.fn() }));
vi.mock("../services/profile.service", () => ({ saveProfile: vi.fn() }));
const useUserProfileMock = vi.mocked(useUserProfile);
const saveProfileMock = vi.mocked(saveProfile);

const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
const SAVED_AVATAR_URL = "https://proyecto.supabase.co/storage/v1/object/public/avatars/u/vieja.png";
const PREVIEW_URL = "blob:http://localhost/preview";

const png = (size = 1024): File => new File([new Uint8Array(size)], "foto.png", { type: "image/png" });

const mockProfile = (name: string | null, avatarUrl: string | null = null): void => {
  useUserProfileMock.mockReturnValue({ avatarUrl, name });
};

beforeEach(() => {
  vi.resetAllMocks();
  mockProfile("Ana Pérez");
  saveProfileMock.mockResolvedValue(SAVE_PROFILE_RESULT.SUCCESS);
  URL.createObjectURL = vi.fn(() => PREVIEW_URL);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useProfileViewModel", () => {
  it("shows the saved name and initials, with nothing to save yet", () => {
    const { result } = renderHook(() => useProfileViewModel());

    expect(result.current.name).toBe("Ana Pérez");
    expect(result.current.initials).toBe("AP");
    expect(result.current.avatarUrl).toBeNull();
    expect(result.current.nameError).toBeUndefined();
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("is loading until the session arrives", () => {
    useUserProfileMock.mockReturnValue(null);

    const { result } = renderHook(() => useProfileViewModel());

    expect(result.current.isLoading).toBe(true);
  });

  it("requires the name: an empty one shows the error and keeps save disabled", () => {
    const { result } = renderHook(() => useProfileViewModel());

    act(() => result.current.handleNameChange("   "));

    expect(result.current.nameError).toBe(PROFILE_ERROR_MESSAGE.NAME_REQUIRED);
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("does not show the name error when the account simply has no name yet", () => {
    mockProfile(null);

    const { result } = renderHook(() => useProfileViewModel());

    expect(result.current.nameError).toBeUndefined();
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("enables save when the name changes to a valid one", () => {
    const { result } = renderHook(() => useProfileViewModel());

    act(() => result.current.handleNameChange("Ana María"));

    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("keeps save disabled when the name only changes in the spaces around it", () => {
    const { result } = renderHook(() => useProfileViewModel());

    act(() => result.current.handleNameChange("  Ana Pérez "));

    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("rejects a photo of a type that is not allowed, with the reason, and does not stage it", () => {
    const { result } = renderHook(() => useProfileViewModel());

    act(() => result.current.handlePhotoSelect(new File(["x"], "doc.pdf", { type: "application/pdf" })));

    expect(result.current.photoError).toBe(PROFILE_ERROR_MESSAGE.PHOTO_TYPE_NOT_ALLOWED);
    expect(result.current.avatarUrl).toBeNull();
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("stages a valid photo: shows its preview and enables save", () => {
    const { result } = renderHook(() => useProfileViewModel());

    act(() => result.current.handlePhotoSelect(png()));

    expect(result.current.photoError).toBeUndefined();
    expect(result.current.avatarUrl).toBe(PREVIEW_URL);
    expect(result.current.hasPhoto).toBe(true);
    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("releases the preview when it leaves the screen", () => {
    const { result, unmount } = renderHook(() => useProfileViewModel());
    act(() => result.current.handlePhotoSelect(png()));

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(PREVIEW_URL);
  });

  it("discards a staged photo when removing and goes back to the saved one", () => {
    mockProfile("Ana Pérez", SAVED_AVATAR_URL);
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handlePhotoSelect(png()));

    act(() => result.current.handlePhotoRemove());

    expect(result.current.avatarUrl).toBe(SAVED_AVATAR_URL);
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("marks the saved photo to be removed, back to the initials, and enables save", () => {
    mockProfile("Ana Pérez", SAVED_AVATAR_URL);
    const { result } = renderHook(() => useProfileViewModel());

    act(() => result.current.handlePhotoRemove());

    expect(result.current.avatarUrl).toBeNull();
    expect(result.current.hasPhoto).toBe(false);
    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("does not save when the name is invalid", async () => {
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handleNameChange(""));

    await act(() => result.current.handleSubmit(submitEvent));

    expect(saveProfileMock).not.toHaveBeenCalled();
  });

  it("does not save when nothing changed", async () => {
    const { result } = renderHook(() => useProfileViewModel());

    await act(() => result.current.handleSubmit(submitEvent));

    expect(saveProfileMock).not.toHaveBeenCalled();
  });

  it("saves the new name keeping the photo and confirms it", async () => {
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handleNameChange("Ana María"));

    await act(() => result.current.handleSubmit(submitEvent));

    expect(saveProfileMock).toHaveBeenCalledWith({
      name: "Ana María",
      photo: { kind: PROFILE_PHOTO_CHANGE.KEEP },
    });
    expect(result.current.saveStatus).toBe(PROFILE_SAVE_STATUS.SAVED);
    expect(result.current.isSubmitDisabled).toBe(true);
  });

  it("saves the staged photo together with the name", async () => {
    const file = png();
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handlePhotoSelect(file));

    await act(() => result.current.handleSubmit(submitEvent));

    expect(saveProfileMock).toHaveBeenCalledWith({
      name: "Ana Pérez",
      photo: { file, kind: PROFILE_PHOTO_CHANGE.REPLACE },
    });
  });

  it("shows the photo error and keeps the changes so they can be retried", async () => {
    saveProfileMock.mockResolvedValue(SAVE_PROFILE_RESULT.PHOTO_ERROR);
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handlePhotoSelect(png()));

    await act(() => result.current.handleSubmit(submitEvent));

    expect(result.current.saveStatus).toBe(PROFILE_SAVE_STATUS.ERROR);
    expect(result.current.saveError).toBe(PROFILE_ERROR_MESSAGE.PHOTO_UPLOAD_FAILED);
    expect(result.current.isSubmitDisabled).toBe(false);
  });

  it("shows the generic error when saving fails", async () => {
    saveProfileMock.mockResolvedValue(SAVE_PROFILE_RESULT.ERROR);
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handleNameChange("Ana María"));

    await act(() => result.current.handleSubmit(submitEvent));

    expect(result.current.saveError).toBe(PROFILE_ERROR_MESSAGE.UNEXPECTED);
  });

  it("clears the confirmation as soon as the person edits again", async () => {
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handleNameChange("Ana María"));
    await act(() => result.current.handleSubmit(submitEvent));

    act(() => result.current.handleNameChange("Ana María P"));

    expect(result.current.saveStatus).toBe(PROFILE_SAVE_STATUS.IDLE);
  });

  it("does not send a second save while one is in progress", async () => {
    let finishSave: (result: typeof SAVE_PROFILE_RESULT.SUCCESS) => void = () => undefined;
    saveProfileMock.mockReturnValue(new Promise((resolve) => (finishSave = resolve)));
    const { result } = renderHook(() => useProfileViewModel());
    act(() => result.current.handleNameChange("Ana María"));

    await act(async () => {
      void result.current.handleSubmit(submitEvent);
    });
    await act(() => result.current.handleSubmit(submitEvent));

    expect(saveProfileMock).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitDisabled).toBe(true);
    await act(async () => finishSave(SAVE_PROFILE_RESULT.SUCCESS));
  });
});
