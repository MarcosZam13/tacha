import { expect } from "@playwright/test";
import type { APIRequestContext, Locator, Page, Request, Route } from "@playwright/test";
import { getRequiredEnv } from "../../support/supabase";

// Cómo preparar y encontrar las cosas de la recuperación de contraseña. Sin aserciones: eso es del
// test (playwright-e2e, references/standards.md). Los textos que son contrato del escenario no viven
// acá: se escriben en el spec.
export const LOGIN_PATH = "/login";
export const FORGOT_PASSWORD_PATH = "/recuperar-contrasena";

// Con el servidor de desarrollo en frío, compilar las rutas por primera vez tarda ~40 s con varios
// tests en paralelo. El límite por defecto (30 s) no alcanza ni para el calentamiento ni para los tests.
export const COLD_START_TEST_TIMEOUT_MS = 90_000;

// Navegar entre páginas en desarrollo, con varios tests en paralelo contra el mismo servidor, pasa de
// los 5 s del `expect` por defecto.
export const NAVIGATION_TIMEOUT_MS = 20_000;

// Lo que responde Supabase Auth a la solicitud de recuperación.
const SUCCESS_STATUS = 200;
const RATE_LIMIT_STATUS = 429;
const SERVER_ERROR_STATUS = 500;
const RATE_LIMIT_BODY = {
  code: RATE_LIMIT_STATUS,
  error_code: "over_email_send_rate_limit",
  msg: "For security purposes, you can only request this after 60 seconds.",
};
const SERVER_ERROR_BODY = {
  code: SERVER_ERROR_STATUS,
  error_code: "unexpected_failure",
  msg: "Error sending recovery email",
};

/**
 * Pide las páginas que usan los escenarios antes de empezar. En desarrollo Next compila cada ruta
 * la primera vez que se pide y, al terminar, puede recargar la página abierta y descartar lo escrito.
 */
export const warmUpRoutes = async (request: APIRequestContext): Promise<void> => {
  for (const path of [LOGIN_PATH, FORGOT_PASSWORD_PATH]) {
    await request.get(path);
  }
};

const getRecoverUrl = (): string => `${getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/recover**`;

export const RECOVER_RESPONSE = {
  NETWORK_FAILURE: "network-failure",
  RATE_LIMIT: "rate-limit",
  SERVER_ERROR: "server-error",
  SUCCESS: "success",
} as const;

export type RecoverResponse = (typeof RECOVER_RESPONSE)[keyof typeof RECOVER_RESPONSE];

const RESPONSE_BY_KIND: Record<Exclude<RecoverResponse, "network-failure">, { body: unknown; status: number }> = {
  [RECOVER_RESPONSE.RATE_LIMIT]: { body: RATE_LIMIT_BODY, status: RATE_LIMIT_STATUS },
  [RECOVER_RESPONSE.SERVER_ERROR]: { body: SERVER_ERROR_BODY, status: SERVER_ERROR_STATUS },
  [RECOVER_RESPONSE.SUCCESS]: { body: {}, status: SUCCESS_STATUS },
};

const respondTo = (route: Route, response: RecoverResponse): Promise<void> =>
  response === RECOVER_RESPONSE.NETWORK_FAILURE
    ? route.abort("failed")
    : route.fulfill({
        status: RESPONSE_BY_KIND[response].status,
        contentType: "application/json",
        body: JSON.stringify(RESPONSE_BY_KIND[response].body),
      });

/**
 * Responde desde el test la solicitud de recuperación de Supabase: no se envía ningún correo. Cada
 * llamada usa la siguiente respuesta de la lista (la última se repite). Devuelve las peticiones
 * recibidas, para comprobar qué se mandó.
 */
export const stubRecoverRequests = async (page: Page, responses: RecoverResponse[]): Promise<Request[]> => {
  const received: Request[] = [];

  await page.route(getRecoverUrl(), (route) => {
    const response = responses[Math.min(received.length, responses.length - 1)];
    received.push(route.request());
    return respondTo(route, response);
  });

  return received;
};

export const getEmailField = (page: Page): Locator => page.getByLabel("Correo electrónico");

export const getSubmitButton = (page: Page): Locator => page.getByRole("button", { name: "Enviar enlace" });

/** Escribe un correo y pide el enlace. */
export const requestResetLink = async (page: Page, email: string): Promise<void> => {
  await getEmailField(page).fill(email);
  await getSubmitButton(page).click();
};

// Cuánto se espera a que un clic navegue antes de volver a hacerlo.
const CLICK_RETRY_WAIT_MS = 3_000;

/**
 * Toca un enlace y espera a que la URL cambie, volviendo a tocarlo si no cambió. En desarrollo, una
 * recarga del servidor justo después de cargar la página puede perder el primer clic (el enlace se
 * toca antes de que la página termine de arrancar); un usuario simplemente lo tocaría otra vez.
 */
export const clickLinkUntilNavigated = async (link: Locator, page: Page, path: string): Promise<void> => {
  await expect(async () => {
    await link.click();
    await expect(page).toHaveURL(path, { timeout: CLICK_RETRY_WAIT_MS });
  }).toPass({ timeout: NAVIGATION_TIMEOUT_MS });
};
