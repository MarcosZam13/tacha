// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE, NEW_PASSWORD_ERROR_MESSAGE } from "@/constants";
import { ChangePassword } from "../ChangePassword";
import {
  CHANGE_PASSWORD_ERROR_MESSAGE,
  CHANGE_PASSWORD_RESULT,
} from "../constants/change-password.constants";
import { changePassword } from "../services/change-password.service";
import { createChangePasswordPage } from "./ChangePassword.page";

vi.mock("../services/change-password.service", () => ({ changePassword: vi.fn() }));
const changePasswordMock = vi.mocked(changePassword);

const CURRENT = "Actual123!";
const NEW = "Tacha2026!";

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  changePasswordMock.mockResolvedValue(CHANGE_PASSWORD_RESULT.SUCCESS);
});

const renderScreen = (): ReturnType<typeof createChangePasswordPage> => {
  render(<ChangePassword />);
  return createChangePasswordPage();
};

const fillValidForm = async (page: ReturnType<typeof createChangePasswordPage>): Promise<void> => {
  await page.fillCurrent(CURRENT);
  await page.fillNew(NEW);
  await page.fillConfirm(NEW);
};

describe("ChangePassword", () => {
  // CA-02
  it("asks for the current, the new and the repeated new password", () => {
    const page = renderScreen();

    expect(page.getCurrentField()).toHaveAttribute("autocomplete", "current-password");
    expect(page.getNewField()).toHaveAttribute("autocomplete", "new-password");
    expect(page.getConfirmField()).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getAllByRole("button", { name: "Mostrar contraseña" })).toHaveLength(3);
  });

  it("puts the focus on the title and links back to the profile", () => {
    const page = renderScreen();

    expect(page.getTitle()).toHaveFocus();
    expect(page.getBackLink()).toHaveAttribute("href", APP_ROUTE.PROFILE);
  });

  // CA-03
  it("shows the strength meter once the new password is typed, and not before", async () => {
    const page = renderScreen();
    expect(page.queryMeter()).not.toBeInTheDocument();

    await page.fillNew(NEW);

    expect(page.queryMeter()).toBeInTheDocument();
  });

  // CA-04
  it("keeps save disabled until the new password and its repeat match", async () => {
    const page = renderScreen();
    await page.fillCurrent(CURRENT);
    await page.fillNew(NEW);
    await page.fillConfirm("Otra2027#");

    expect(screen.getByText(NEW_PASSWORD_ERROR_MESSAGE.PASSWORDS_MISMATCH)).toBeInTheDocument();
    expect(page.getSaveButton()).toBeDisabled();
  });

  it("enables save with a valid form", async () => {
    const page = renderScreen();

    await fillValidForm(page);

    expect(page.getSaveButton()).toBeEnabled();
  });

  it("rejects a new password equal to the current one", async () => {
    const page = renderScreen();
    await page.fillCurrent(CURRENT);
    await page.fillNew(CURRENT);

    expect(screen.getByText(NEW_PASSWORD_ERROR_MESSAGE.SAME_PASSWORD)).toBeInTheDocument();
    expect(page.getSaveButton()).toBeDisabled();
  });

  // CA-05
  it("shows a specific error under the current password when it is wrong, without changing anything", async () => {
    changePasswordMock.mockResolvedValue(CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD);
    const page = renderScreen();
    await fillValidForm(page);

    await page.save();

    expect(screen.getByText(CHANGE_PASSWORD_ERROR_MESSAGE.WRONG_CURRENT_PASSWORD)).toBeInTheDocument();
    expect(page.getCurrentField()).toHaveAttribute("aria-invalid", "true");
    expect(page.queryConfirmation()).not.toBeInTheDocument();
  });

  // CA-06
  it("confirms the change and empties the fields, staying on the screen", async () => {
    const page = renderScreen();
    await fillValidForm(page);

    await page.save();

    expect(changePasswordMock).toHaveBeenCalledWith({ currentPassword: CURRENT, newPassword: NEW });
    expect(page.queryConfirmation()).toBeInTheDocument();
    expect(page.getNewField()).toHaveValue("");
    expect(page.getTitle()).toBeInTheDocument();
  });

  it("shows a general alert when the change fails for another reason", async () => {
    changePasswordMock.mockResolvedValue(CHANGE_PASSWORD_RESULT.ERROR);
    const page = renderScreen();
    await fillValidForm(page);

    await page.save();

    expect(page.queryAlert()).toHaveTextContent(NEW_PASSWORD_ERROR_MESSAGE.UNEXPECTED);
    expect(page.queryConfirmation()).not.toBeInTheDocument();
  });
});
