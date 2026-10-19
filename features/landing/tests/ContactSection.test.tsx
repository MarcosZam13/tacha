// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecaptchaWidgetProps } from "@/components/recaptcha-widget/models/RecaptchaWidgetProps.interface";
import { ContactSection } from "../components/ContactSection";
import { CONTACT_RESULT, CONTACT_SOURCE } from "../constants/contact.constants";
import { submitContactMessage } from "../services/contact.service";
import { createContactSectionPage } from "./ContactSection.page";

// reCAPTCHA es de Google: acá se reemplaza por un botón que entrega un token, como la casilla real.
vi.mock("@/components/recaptcha-widget/RecaptchaWidget", () => ({
  RecaptchaWidget: ({ onTokenChange }: RecaptchaWidgetProps) => (
    <button type="button" onClick={() => onTokenChange("captcha-token")}>
      Resolver reCAPTCHA
    </button>
  ),
}));
vi.mock("../services/contact.service", () => ({ submitContactMessage: vi.fn() }));
const submitContactMessageMock = vi.mocked(submitContactMessage);

const VALID_FORM = {
  email: "ana@correo.com",
  message: "Hola, quiero saber más de Tacha.",
  name: "Ana",
};

const renderSection = (): ReturnType<typeof createContactSectionPage> => {
  render(<ContactSection source={CONTACT_SOURCE.LANDING} />);
  return createContactSectionPage();
};

afterEach(cleanup);
beforeEach(() => {
  submitContactMessageMock.mockReset();
});

describe("ContactSection", () => {
  // CA-01, CA-02, CA-04
  it("shows the required name, email and message fields, the reCAPTCHA and the send button", () => {
    const page = renderSection();

    expect(page.getNameField()).toBeRequired();
    expect(page.getEmailField()).toBeRequired();
    expect(page.getMessageField()).toBeRequired();
    expect(page.getRecaptcha()).toBeInTheDocument();
    expect(page.getSubmitButton()).toBeEnabled();
  });

  // CA-03
  it("does not send and marks every required field when the form is empty", async () => {
    const page = renderSection();
    await page.solveRecaptcha();

    await page.submit();

    expect(page.getText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(page.getText("El correo es obligatorio.")).toBeInTheDocument();
    expect(page.getText("El mensaje es obligatorio.")).toBeInTheDocument();
    expect(submitContactMessageMock).not.toHaveBeenCalled();
  });

  // CA-05
  it("does not send without the reCAPTCHA and asks the visitor to complete it", async () => {
    const page = renderSection();
    await page.fillForm(VALID_FORM);

    await page.submit();

    expect(page.getAlerts()[0]).toHaveTextContent("Confirmá que no sos un robot.");
    expect(submitContactMessageMock).not.toHaveBeenCalled();
  });

  // CA-06
  it("rejects an email with an invalid format", async () => {
    const page = renderSection();
    await page.fillForm({ ...VALID_FORM, email: "ana@" });
    await page.solveRecaptcha();

    await page.submit();

    expect(page.getText("Ingresá un correo válido.")).toBeInTheDocument();
    expect(submitContactMessageMock).not.toHaveBeenCalled();
  });

  // CA-07
  it("confirms the message was received after a successful send", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.SUCCESS);
    const page = renderSection();
    await page.fillForm(VALID_FORM);
    await page.solveRecaptcha();

    await page.submit();

    expect(page.getSuccessMessage()).toHaveTextContent("¡Gracias! Recibimos tu mensaje");
  });

  // CA-08
  it("shows a clear error and keeps the text when the send fails", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.ERROR);
    const page = renderSection();
    await page.fillForm(VALID_FORM);
    await page.solveRecaptcha();

    await page.submit();

    expect(page.getAlerts()[0]).toHaveTextContent("No pudimos enviar tu mensaje.");
    expect(page.getNameField()).toHaveValue("Ana");
  });

  // CA-05: Google rechaza el token
  it("asks to redo the reCAPTCHA when the server rejects it", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.CAPTCHA_FAILED);
    const page = renderSection();
    await page.fillForm(VALID_FORM);
    await page.solveRecaptcha();

    await page.submit();

    expect(page.getAlerts()[0]).toHaveTextContent("No pudimos validar el reCAPTCHA.");
  });
});
