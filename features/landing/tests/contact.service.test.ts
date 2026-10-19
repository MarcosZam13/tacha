import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT_RESULT, CONTACT_SOURCE } from "../constants/contact.constants";
import { submitContactMessage } from "../services/contact.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con el único método que se usa.
const invokeMock = vi.fn();
const getSupabaseClientMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));

const PAYLOAD = {
  captchaToken: "captcha-token",
  email: "ana@correo.com",
  message: "Hola, quiero saber más de Tacha.",
  name: "Ana",
  source: CONTACT_SOURCE.LANDING,
};

// Así entrega supabase-js un 4xx/5xx de la función: la respuesta cruda en `context`.
const buildHttpError = (status: number, code: string): FunctionsHttpError =>
  new FunctionsHttpError(new Response(JSON.stringify({ code }), { status }));

beforeEach(() => {
  vi.resetAllMocks();
  getSupabaseClientMock.mockReturnValue({ functions: { invoke: invokeMock } });
});

describe("submitContactMessage", () => {
  it("sends the payload to the submit-contact-message function", async () => {
    invokeMock.mockResolvedValue({ data: { received: true }, error: null });

    await submitContactMessage(PAYLOAD);

    expect(invokeMock).toHaveBeenCalledWith("submit-contact-message", { body: PAYLOAD });
  });

  it("reports success when the function saves the message", async () => {
    invokeMock.mockResolvedValue({ data: { received: true }, error: null });

    expect(await submitContactMessage(PAYLOAD)).toBe(CONTACT_RESULT.SUCCESS);
  });

  it.each([
    ["captcha_failed", 400, CONTACT_RESULT.CAPTCHA_FAILED],
    ["rate_limited", 429, CONTACT_RESULT.RATE_LIMITED],
    ["invalid_request", 400, CONTACT_RESULT.ERROR],
    ["server_error", 500, CONTACT_RESULT.ERROR],
  ])("translates the %s code (status %i) into its result", async (code, status, expected) => {
    invokeMock.mockResolvedValue({ data: null, error: buildHttpError(status, code) });

    expect(await submitContactMessage(PAYLOAD)).toBe(expected);
  });

  it("reports an error, and does not throw, when the request never reaches the function", async () => {
    invokeMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await submitContactMessage(PAYLOAD)).toBe(CONTACT_RESULT.ERROR);
  });

  it("reports an error, and does not throw, when the Supabase client cannot be created", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
    });

    expect(await submitContactMessage(PAYLOAD)).toBe(CONTACT_RESULT.ERROR);
  });
});
