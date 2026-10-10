import type { Page } from "@playwright/test";
import { getAuthStorageKey, getRequiredEnv } from "./supabase";

// Una sesión "real" (usuario no anónimo) fabricada para las pruebas que solo miden sesiones reales,
// como el cierre por inactividad. No existe en la base: nada de lo que se hace con ella escribe datos.
// supabase-js la lee de localStorage y no valida la firma del token, así que la toma como sesión vigente.
const FAKE_USER_ID = "00000000-0000-4000-8000-000000000001";
const FAKE_USER_EMAIL = "e2e-inactivity@example.test";
const FAKE_ACCESS_TOKEN = "fake-access-token";
const FAKE_REFRESH_TOKEN = "fake-refresh-token";
const FAKE_TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const MS_PER_SECOND = 1000;

// Cualquier ruta pública sirve para tener un origen donde escribir en localStorage.
export const PUBLIC_ORIGIN_PATH = "/terminos";

const LOGOUT_URL_FRAGMENT = "/auth/v1/logout";
const NO_CONTENT_STATUS = 204;

const buildFakeSession = (): string => {
  const expiresAt = Math.floor(Date.now() / MS_PER_SECOND) + FAKE_TOKEN_LIFETIME_SECONDS;

  return JSON.stringify({
    access_token: FAKE_ACCESS_TOKEN,
    token_type: "bearer",
    expires_in: FAKE_TOKEN_LIFETIME_SECONDS,
    expires_at: expiresAt,
    refresh_token: FAKE_REFRESH_TOKEN,
    user: {
      id: FAKE_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: FAKE_USER_EMAIL,
      is_anonymous: false,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  });
};

/**
 * Responde desde el test las llamadas a Supabase (datos y auth): la sesión es falsa y no hay nada
 * que pedirle al servidor. El cierre de sesión devuelve 204, como el real.
 */
export const stubSupabaseApi = async (page: Page): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");

  await page.route(`${supabaseUrl}/**`, (route) =>
    route.request().url().includes(LOGOUT_URL_FRAGMENT)
      ? route.fulfill({ status: NO_CONTENT_STATUS })
      : route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
};

/**
 * Deja la sesión falsa guardada en el navegador. Se escribe desde una página pública ya cargada
 * (no con un script de inicio): así, tras el cierre de sesión, abrir otra página no la vuelve a poner.
 */
export const signInAsFakeUser = async (page: Page): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");

  await page.goto(PUBLIC_ORIGIN_PATH);
  await page.evaluate(
    ([storageKey, session]) => window.localStorage.setItem(storageKey, session),
    [getAuthStorageKey(supabaseUrl), buildFakeSession()],
  );
};
