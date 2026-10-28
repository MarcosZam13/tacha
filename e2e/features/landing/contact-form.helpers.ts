import type { Locator, Page, Request } from "@playwright/test";
import { getRequiredEnv } from "../../support/supabase";

// Cómo preparar y usar el formulario de contacto. Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md).
export const HOME_PATH = "/";
export const ABOUT_PATH = "/nosotros";


const RECAPTCHA_SCRIPT_URL = "https://www.google.com/recaptcha/api.js**";
const CONTACT_FUNCTION_PATH = "/functions/v1/submit-contact-message";
export const FAKE_CAPTCHA_LABEL = "No soy un robot (E2E)";
export const FAKE_CAPTCHA_TOKEN = "e2e-captcha-token";

// reCAPTCHA es UI de terceros (standards.md, "External boundaries"): se reemplaza el script de
// Google por un grecaptcha que dibuja un botón y entrega un token al tocarlo.
const FAKE_RECAPTCHA_SCRIPT = `
  window.grecaptcha = {
    ready: (callback) => callback(),
    render: (container, options) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "${FAKE_CAPTCHA_LABEL}";
      button.addEventListener("click", () => options.callback("${FAKE_CAPTCHA_TOKEN}"));
      container.appendChild(button);
      return 0;
    },
    reset: () => undefined,
  };
`;

export const stubRecaptcha = async (page: Page): Promise<void> => {
  await page.route(RECAPTCHA_SCRIPT_URL, (route) =>
    route.fulfill({ body: FAKE_RECAPTCHA_SCRIPT, contentType: "application/javascript" }),
  );
};

/** Responde la Edge Function desde el test (no escribe en la base) y guarda lo que la app le mandó. */
export const stubContactFunction = async (
  page: Page,
  response: { body: Record<string, unknown>; status: number },
): Promise<Request[]> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const requests: Request[] = [];

  await page.route(`${supabaseUrl}${CONTACT_FUNCTION_PATH}`, (route) => {
    requests.push(route.request());
    return route.fulfill({
      body: JSON.stringify(response.body),
      contentType: "application/json",
      status: response.status,
    });
  });
  return requests;
};

export const getContactRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Contactanos" });

export const fillContactForm = async (
  page: Page,
  { email, message, name }: { email: string; message: string; name: string },
): Promise<void> => {
  const region = getContactRegion(page);
  await region.getByLabel("Nombre").fill(name);
  await region.getByLabel("Correo electrónico").fill(email);
  await region.getByLabel("Mensaje").fill(message);
};
