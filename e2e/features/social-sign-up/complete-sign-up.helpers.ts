import type { Page, Request } from "@playwright/test";
import { PUBLIC_ORIGIN_PATH, buildFakeUser } from "../../support/fake-session";
import { getAuthStorageKey, getRequiredEnv } from "../../support/supabase";

// Cómo preparar el formulario de completar registro. Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md). Todo lo de Supabase se responde desde el test:
// valida la interfaz, no la autenticación real (features/social-sign-up/specs/E2E.md).
export const COMPLETE_SIGN_UP_PATH = "/registro/completar";
export const LIST_PATH = "/lista";

const AUTH_USER_PATH = "/auth/v1/user";
const LOGOUT_PATH = "/auth/v1/logout";
const NO_CONTENT_STATUS = 204;
const OK_STATUS = 200;
const FAKE_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const MS_PER_SECOND = 1000;

/** Una cuenta recién creada con Google, todavía sin la marca de registro completado. */
const buildNewSocialUser = (name: string, savedMetadata: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...buildFakeUser(),
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: { name, ...savedMetadata },
});

/**
 * Responde Supabase desde el test: la cuenta social (GET /auth/v1/user), el guardado
 * (PUT /auth/v1/user, que devuelve la cuenta con lo guardado, como el real) y lo demás
 * vacío. Devuelve las peticiones de guardado.
 */
export const stubNewSocialAccount = async (page: Page, providerName: string): Promise<Request[]> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const saveRequests: Request[] = [];

  await page.route(`${supabaseUrl}/**`, (route) => {
    const request = route.request();
    const url = request.url();

    if (url.includes(LOGOUT_PATH)) return route.fulfill({ status: NO_CONTENT_STATUS });

    if (url.includes(AUTH_USER_PATH) && request.method() === "PUT") {
      saveRequests.push(request);
      const savedMetadata = request.postDataJSON().data;
      return route.fulfill({ json: buildNewSocialUser(providerName, savedMetadata), status: OK_STATUS });
    }

    if (url.includes(AUTH_USER_PATH)) {
      return route.fulfill({ json: buildNewSocialUser(providerName), status: OK_STATUS });
    }

    return route.fulfill({ json: [], status: OK_STATUS });
  });

  return saveRequests;
};

/** Deja guardada en el navegador la sesión de una cuenta de Google que no completó el registro. */
export const signInAsNewSocialUser = async (page: Page, providerName: string): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const session = JSON.stringify({
    access_token: "fake-social-access-token",
    expires_at: Math.floor(Date.now() / MS_PER_SECOND) + FAKE_TOKEN_LIFETIME_SECONDS,
    expires_in: FAKE_TOKEN_LIFETIME_SECONDS,
    refresh_token: "fake-social-refresh-token",
    token_type: "bearer",
    user: buildNewSocialUser(providerName),
  });

  await page.goto(PUBLIC_ORIGIN_PATH);
  await page.evaluate(([storageKey, value]) => window.localStorage.setItem(storageKey, value), [
    getAuthStorageKey(supabaseUrl),
    session,
  ]);
};
