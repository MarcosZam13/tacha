// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Profile } from "../Profile";
import { PROFILE_ERROR_MESSAGE, SAVE_PROFILE_RESULT } from "../constants/profile.constants";
import { saveProfile } from "../services/profile.service";
import { createProfilePage } from "./Profile.page";

vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: vi.fn() }));
vi.mock("../services/profile.service", () => ({ saveProfile: vi.fn() }));
const useUserProfileMock = vi.mocked(useUserProfile);
const saveProfileMock = vi.mocked(saveProfile);

const AVATAR_URL = "https://proyecto.supabase.co/storage/v1/object/public/avatars/u/foto.png";

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  useUserProfileMock.mockReturnValue({ avatarUrl: null, name: "Ana Pérez" });
  saveProfileMock.mockResolvedValue(SAVE_PROFILE_RESULT.SUCCESS);
  URL.createObjectURL = vi.fn(() => "blob:http://localhost/preview");
  URL.revokeObjectURL = vi.fn();
});

const renderProfile = (): ReturnType<typeof createProfilePage> => {
  render(<Profile />);
  return createProfilePage();
};

describe("Profile", () => {
  // CA-02
  it("shows the current name, ready to edit", () => {
    const page = renderProfile();

    expect(page.getHeading()).toBeInTheDocument();
    expect(page.getNameInput()).toHaveValue("Ana Pérez");
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
  });

  // CA-05
  it("shows the initials instead of a photo when there is none, and no remove button", () => {
    const page = renderProfile();

    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.getAllByText("AP").length).toBeGreaterThan(0);
    expect(page.queryRemovePhotoButton()).not.toBeInTheDocument();
  });

  // CA-02
  it("shows the current photo and lets it be removed", () => {
    useUserProfileMock.mockReturnValue({ avatarUrl: AVATAR_URL, name: "Ana Pérez" });
    const page = renderProfile();

    expect(page.queryRemovePhotoButton()).toBeInTheDocument();
  });

  // SCRUM-54, CA-01
  it("links to the change-password screen", () => {
    const page = renderProfile();

    expect(page.getChangePasswordLink()).toHaveAttribute("href", APP_ROUTE.CHANGE_PASSWORD);
  });

  it("shows a spinner while the session loads, not an empty form", () => {
    useUserProfileMock.mockReturnValue(null);

    renderProfile();

    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  // CA-03
  it("explains the error and blocks saving when the name is cleared", async () => {
    const page = renderProfile();

    await page.replaceName("");

    expect(screen.getByText(PROFILE_ERROR_MESSAGE.NAME_REQUIRED)).toBeInTheDocument();
    expect(page.getSaveButton()).toBeDisabled();
  });

  it("starts with save disabled because nothing changed", () => {
    const page = renderProfile();

    expect(page.getSaveButton()).toBeDisabled();
  });

  // CA-04
  it("saves the new name and confirms it visually", async () => {
    const page = renderProfile();

    await page.replaceName("Ana María");
    await page.save();

    expect(saveProfileMock).toHaveBeenCalledWith(expect.objectContaining({ name: "Ana María" }));
    expect(page.queryConfirmation()).toBeInTheDocument();
  });

  it("rejects a photo that is not allowed and says why", async () => {
    const page = renderProfile();

    await page.choosePhoto(new File(["x"], "doc.pdf", { type: "application/pdf" }));

    expect(screen.getByText(PROFILE_ERROR_MESSAGE.PHOTO_TYPE_NOT_ALLOWED)).toBeInTheDocument();
    expect(page.getSaveButton()).toBeDisabled();
  });

  it("enables saving after choosing a valid photo and lets it be removed again", async () => {
    const page = renderProfile();

    await page.choosePhoto(new File(["x"], "foto.png", { type: "image/png" }));
    expect(page.getSaveButton()).toBeEnabled();

    await page.removePhoto();
    expect(page.getSaveButton()).toBeDisabled();
  });

  it("tells the person nothing was changed when the photo upload fails", async () => {
    saveProfileMock.mockResolvedValue(SAVE_PROFILE_RESULT.PHOTO_ERROR);
    const page = renderProfile();

    await page.choosePhoto(new File(["x"], "foto.png", { type: "image/png" }));
    await page.save();

    expect(page.queryAlert()).toHaveTextContent(PROFILE_ERROR_MESSAGE.PHOTO_UPLOAD_FAILED);
    expect(page.queryConfirmation()).not.toBeInTheDocument();
  });
});
