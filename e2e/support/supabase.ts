import type { APIRequestContext, Page } from "@playwright/test";

// Soporte fuera del navegador: hablar con la API de Supabase para preparar o
// limpiar datos. Next carga .env.local para la app, pero no para los tests.
const LOCAL_ENV_FILE = ".env.local";

const loadLocalEnv = (): void => {
  try {
    process.loadEnvFile(LOCAL_ENV_FILE);
  } catch {
    // Sin .env.local (ej. en un CI) las variables tienen que venir del entorno.
  }
};

loadLocalEnv();

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env.local para las pruebas E2E`);
  return value;
};

// supabase-js guarda la sesión en localStorage con esta clave.
export const getAuthStorageKey = (supabaseUrl: string): string =>
  `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

/**
 * Borra todos los items de las listas del usuario con sesión en `page`.
 * Usa su propio token: RLS solo le deja borrar lo suyo, así que no puede
 * tocar datos de otra persona aunque el filtro sea "todos".
 */
export const deleteOwnListItems = async (page: Page, request: APIRequestContext): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const accessToken = await page.evaluate((storageKey) => {
    const storedSession = window.localStorage.getItem(storageKey);
    return storedSession ? (JSON.parse(storedSession).access_token as string) : null;
  }, getAuthStorageKey(supabaseUrl));
  // Si nunca se abrió sesión, no hay nada que limpiar.
  if (!accessToken) return;

  // PostgREST no acepta un delete sin filtro; "id no es null" es "todas las filas visibles".
  const response = await request.delete(`${supabaseUrl}/rest/v1/list_items?id=not.is.null`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok()) {
    throw new Error(`No se pudo limpiar la lista de prueba: ${response.status()} ${await response.text()}`);
  }
};
