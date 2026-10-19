// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { FormEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_FIELD, CONTACT_RESULT, CONTACT_SOURCE } from "../constants/contact.constants";
import { useContactFormViewModel } from "../hooks/useContactFormViewModel";
import type { ContactFormViewModel } from "../models/ContactFormViewModel.interface";
import { submitContactMessage } from "../services/contact.service";

vi.mock("../services/contact.service", () => ({ submitContactMessage: vi.fn() }));
const submitContactMessageMock = vi.mocked(submitContactMessage);

const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;

const renderFilledForm = (): ReturnType<typeof renderHook<ContactFormViewModel, unknown>> => {
  const hook = renderHook(() => useContactFormViewModel(CONTACT_SOURCE.LANDING));
  act(() => {
    hook.result.current.handleChange(CONTACT_FIELD.NAME)("  Ana  ");
    hook.result.current.handleChange(CONTACT_FIELD.EMAIL)(" Ana@Correo.COM ");
    hook.result.current.handleChange(CONTACT_FIELD.MESSAGE)("  Hola, quiero saber más de Tacha.  ");
    hook.result.current.handleCaptchaTokenChange("captcha-token");
  });
  return hook;
};

beforeEach(() => {
  submitContactMessageMock.mockReset();
});

describe("useContactFormViewModel", () => {
  it("sends the trimmed values, the lowercased email, the token and the page the message comes from", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.SUCCESS);
    const { result } = renderFilledForm();

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(submitContactMessageMock).toHaveBeenCalledWith({
      captchaToken: "captcha-token",
      email: "ana@correo.com",
      message: "Hola, quiero saber más de Tacha.",
      name: "Ana",
      source: "landing",
    });
  });

  it("empties the form and reports success after a successful send", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.SUCCESS);
    const { result } = renderFilledForm();

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.values).toEqual({ email: "", message: "", name: "" });
  });

  it("discards the used token: a second send needs a new reCAPTCHA", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.ERROR);
    const { result } = renderFilledForm();
    await act(async () => result.current.handleSubmit(submitEvent));

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(submitContactMessageMock).toHaveBeenCalledTimes(1);
    expect(result.current.captchaResetCount).toBe(1);
    expect(result.current.captchaError).toBe("Confirmá que no sos un robot.");
  });

  it("does not send twice while the first send is in flight", async () => {
    let resolveSend: (value: typeof CONTACT_RESULT.SUCCESS) => void = () => undefined;
    submitContactMessageMock.mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
    const { result } = renderFilledForm();
    act(() => {
      void result.current.handleSubmit(submitEvent);
    });

    await act(async () => result.current.handleSubmit(submitEvent));

    expect(result.current.isSubmitting).toBe(true);
    expect(submitContactMessageMock).toHaveBeenCalledTimes(1);
    await act(async () => resolveSend(CONTACT_RESULT.SUCCESS));
  });

  it("hides the reCAPTCHA error as soon as the visitor completes it", async () => {
    const { result } = renderHook(() => useContactFormViewModel(CONTACT_SOURCE.LANDING));
    await act(async () => result.current.handleSubmit(submitEvent));

    act(() => result.current.handleCaptchaTokenChange("captcha-token"));

    expect(result.current.captchaError).toBeUndefined();
  });

  it("goes back to the form when the visitor wants to send another message", async () => {
    submitContactMessageMock.mockResolvedValue(CONTACT_RESULT.SUCCESS);
    const { result } = renderFilledForm();
    await act(async () => result.current.handleSubmit(submitEvent));

    act(() => result.current.handleSendAnother());

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.captchaError).toBeUndefined();
  });
});
