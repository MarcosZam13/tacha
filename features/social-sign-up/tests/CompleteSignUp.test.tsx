// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE, AUTH_ROUTE, TERMS_ROUTE } from "@/constants";
import { CompleteSignUp } from "../CompleteSignUp";
import {
  COMPLETE_SIGN_UP_ACCOUNT_STATUS,
  COMPLETE_SIGN_UP_ERROR,
  COMPLETE_SIGN_UP_LABEL,
  COMPLETE_SIGN_UP_SAVE_RESULT,
} from "../constants/complete-sign-up.constants";
import { getCompleteSignUpAccount, saveCompletedSignUp } from "../services/complete-sign-up.service";
import { createCompleteSignUpPage } from "./CompleteSignUp.page";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../services/complete-sign-up.service", () => ({
  getCompleteSignUpAccount: vi.fn(),
  saveCompletedSignUp: vi.fn(),
}));
const getAccountMock = vi.mocked(getCompleteSignUpAccount);
const saveMock = vi.mocked(saveCompletedSignUp);

const renderPage = (): ReturnType<typeof createCompleteSignUpPage> => {
  render(<CompleteSignUp />);
  return createCompleteSignUpPage();
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  getAccountMock.mockResolvedValue({ name: "Ana Pérez", status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING });
  saveMock.mockResolvedValue(COMPLETE_SIGN_UP_SAVE_RESULT.SUCCESS);
});

describe("CompleteSignUp", () => {
  // SCRUM-43, CA-01
  it("shows the name field with the name from the provider", async () => {
    const page = renderPage();

    expect(await page.findNameInput()).toHaveValue("Ana Pérez");
  });

  // SCRUM-44, CA-01
  it("shows the terms checkbox unchecked by default", async () => {
    const page = renderPage();
    await page.findNameInput();

    expect(page.getTermsCheckbox()).toHaveAttribute("aria-checked", "false");
  });

  // SCRUM-44, CA-02
  it("does not let the person continue without accepting the terms", async () => {
    const page = renderPage();
    await page.findNameInput();

    expect(page.getSubmitButton()).toBeDisabled();
  });

  // SCRUM-44, CA-02
  it("enables the button once the terms are accepted", async () => {
    const page = renderPage();

    await page.acceptTerms();

    expect(page.getTermsCheckbox()).toHaveAttribute("aria-checked", "true");
    expect(page.getSubmitButton()).toBeEnabled();
  });

  // SCRUM-44, CA-03
  // En la misma pestaña: así el botón "Volver" de /terminos regresa a este formulario.
  it("links to the full terms in the same tab", async () => {
    const page = renderPage();
    await page.findNameInput();

    expect(page.getTermsLink()).toHaveAttribute("href", TERMS_ROUTE);
    expect(page.getTermsLink()).not.toHaveAttribute("target");
  });

  // SCRUM-44, CA-02 (límite)
  it("disables the button again when the terms are unchecked", async () => {
    const page = renderPage();
    await page.acceptTerms();

    await page.toggleTerms();

    expect(page.getTermsCheckbox()).toHaveAttribute("aria-checked", "false");
    expect(page.getSubmitButton()).toBeDisabled();
  });

  // SCRUM-44, CA-02: aunque el formulario se envíe sin pasar por el botón, no se guarda.
  it("does not save when the form is sent without accepting the terms", async () => {
    const page = renderPage();
    await page.findNameInput();

    await page.submitForm();

    expect(saveMock).not.toHaveBeenCalled();
  });

  // SCRUM-43, CA-02
  it("does not save an empty name and shows the required error", async () => {
    const page = renderPage();
    await page.acceptTerms();
    await page.replaceName("");

    await page.submit();

    expect(await page.findText(COMPLETE_SIGN_UP_ERROR.NAME_REQUIRED)).toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("clears the required error as soon as the person types again", async () => {
    const page = renderPage();
    await page.acceptTerms();
    await page.replaceName("");
    await page.submit();
    await page.findText(COMPLETE_SIGN_UP_ERROR.NAME_REQUIRED);

    await page.typeInName("A");

    expect(page.queryText(COMPLETE_SIGN_UP_ERROR.NAME_REQUIRED)).not.toBeInTheDocument();
  });

  // SCRUM-43, CA-03 y SCRUM-44, CA-02
  it("saves the name and enters the app once the terms are accepted", async () => {
    const page = renderPage();
    await page.replaceName("Ana María");
    await page.acceptTerms();

    await page.submit();

    expect(saveMock).toHaveBeenCalledWith("Ana María");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(APP_ROUTE.LIST));
  });

  // SCRUM-43, CA-03
  it("disables the button while saving, so a double click saves once", async () => {
    saveMock.mockReturnValue(new Promise(() => undefined));
    const page = renderPage();
    await page.acceptTerms();

    await page.submit();

    expect(await page.findSavingButton()).toBeDisabled();
    expect(saveMock).toHaveBeenCalledOnce();
  });

  // SCRUM-43, CA-03
  it("keeps the form and shows an error when the name cannot be saved", async () => {
    saveMock.mockResolvedValue(COMPLETE_SIGN_UP_SAVE_RESULT.ERROR);
    const page = renderPage();
    await page.acceptTerms();

    await page.submit();

    expect(await page.findAlert()).toHaveTextContent(COMPLETE_SIGN_UP_ERROR.SAVE_FAILED);
    expect(page.getSubmitButton()).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows the save error when there is no network", async () => {
    saveMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const page = renderPage();
    await page.acceptTerms();

    await page.submit();

    expect(await page.findAlert()).toHaveTextContent(COMPLETE_SIGN_UP_ERROR.SAVE_FAILED);
  });

  // SCRUM-43, CA-04
  it("sends an account with nothing to complete into the app", async () => {
    getAccountMock.mockResolvedValue({ name: "Ana", status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED });

    renderPage();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(APP_ROUTE.LIST));
  });

  it("explains that there is nothing to complete without a sign up in progress", async () => {
    getAccountMock.mockResolvedValue({ name: "", status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.NO_ACCOUNT });
    const page = renderPage();

    expect(await page.findAlert()).toHaveTextContent(COMPLETE_SIGN_UP_LABEL.NO_ACCOUNT_MESSAGE);
    expect(page.getLink(COMPLETE_SIGN_UP_LABEL.NO_ACCOUNT_LINK)).toHaveAttribute("href", AUTH_ROUTE.REGISTER);
  });

  it("shows the no-account notice when the account cannot be read", async () => {
    getAccountMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const page = renderPage();

    expect(await page.findAlert()).toHaveTextContent(COMPLETE_SIGN_UP_LABEL.NO_ACCOUNT_MESSAGE);
  });
});
