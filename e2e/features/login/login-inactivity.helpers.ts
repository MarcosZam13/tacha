import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { PUBLIC_ORIGIN_PATH, signInAsFakeUser, stubSupabaseApi } from "../../support/fake-session";

// Cómo preparar y encontrar las cosas del cierre por inactividad. Sin aserciones: eso es del test
// (playwright-e2e, references/standards.md).
export const LIST_PATH = "/lista";
export const LOGIN_PATH = "/login";

// Tras adelantar el reloj, el cierre es una cadena real: la llamada de logout, la navegación y,
// en desarrollo, compilar /login. Con varios tests en paralelo, 5 segundos (el valor por defecto) no alcanzan.
export const AFTER_EXPIRY_TIMEOUT_MS = 20_000;

// Con el servidor de desarrollo en frío, compilar las rutas por primera vez tarda ~40 s con varios
// tests en paralelo. El límite por defecto (30 s) no alcanza ni para el calentamiento ni para los tests.
export const COLD_START_TEST_TIMEOUT_MS = 90_000;

/**
 * Pide las páginas que usan los escenarios antes de empezar. En desarrollo Next compila cada ruta
 * la primera vez que se pide y, al terminar, puede recargar la página abierta: una recarga en medio
 * del test descarta el reloj ya adelantado y la sesión no se cierra nunca. Calentadas, no hay recarga.
 */
export const warmUpRoutes = async (request: APIRequestContext): Promise<void> => {
  for (const path of [PUBLIC_ORIGIN_PATH, LIST_PATH, LOGIN_PATH]) {
    await request.get(path);
  }
};

// El texto del aviso es parte del contrato del escenario (E2E.md): se escribe acá, no se importa.
const INACTIVITY_NOTICE_TEXT = "Tu sesión se cerró por inactividad. Iniciá sesión de nuevo.";

export const getInactivityNotice = (page: Page): Locator => page.getByText(INACTIVITY_NOTICE_TEXT);

/** Reloj controlado y Supabase simulado. Va antes de abrir cualquier página. */
export const prepareControlledSession = async (page: Page): Promise<void> => {
  await page.clock.install();
  await stubSupabaseApi(page);
};

// Clave donde la app guarda la última actividad (infraestructura, no oráculo: no es lo que se verifica).
const LAST_ACTIVITY_STORAGE_KEY = "tacha:last-activity";

/**
 * Inicia con la sesión falsa y abre /lista: desde acá corre el conteo de inactividad.
 * Espera a que la app haya reconocido la sesión y armado su temporizador (deja la marca de
 * actividad): `goto` termina al cargar la página, y si el reloj se adelanta antes no hay
 * ningún temporizador que disparar.
 */
export const openListWithSession = async (page: Page): Promise<void> => {
  await signInAsFakeUser(page);
  await page.goto(LIST_PATH);
  await page.waitForFunction(
    (storageKey) => window.localStorage.getItem(storageKey) !== null,
    LAST_ACTIVITY_STORAGE_KEY,
  );
};
