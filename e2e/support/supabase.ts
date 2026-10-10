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

/** El token de la sesión que `page` abrió; null si nunca se abrió una. */
const getOwnAccessToken = (page: Page, supabaseUrl: string): Promise<string | null> =>
  page.evaluate((storageKey) => {
    const storedSession = window.localStorage.getItem(storageKey);
    return storedSession ? (JSON.parse(storedSession).access_token as string) : null;
  }, getAuthStorageKey(supabaseUrl));

const getApiHeaders = (anonKey: string, accessToken: string): Record<string, string> => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken}`,
});

/**
 * Borra todos los items de las listas del usuario con sesión en `page`.
 * Usa su propio token: RLS solo le deja borrar lo suyo, así que no puede
 * tocar datos de otra persona aunque el filtro sea "todos".
 */
export const deleteOwnListItems = async (page: Page, request: APIRequestContext): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const accessToken = await getOwnAccessToken(page, supabaseUrl);
  // Si nunca se abrió sesión, no hay nada que limpiar.
  if (!accessToken) return;

  // PostgREST no acepta un delete sin filtro; "id no es null" es "todas las filas visibles".
  const response = await request.delete(`${supabaseUrl}/rest/v1/list_items?id=not.is.null`, {
    headers: getApiHeaders(anonKey, accessToken),
  });
  if (!response.ok()) {
    throw new Error(`No se pudo limpiar la lista de prueba: ${response.status()} ${await response.text()}`);
  }
};

/**
 * Crea una receta propia del usuario con sesión en `page`, con un solo
 * ingrediente (el primer producto del catálogo), llamando a `save_recipe` con
 * su token. Devuelve el id. La página ya tiene que haber abierto sesión (la app
 * la abre al cargar una pantalla que lee la base).
 *
 * Supuesto: el catálogo de la base compartida tiene al menos un producto. Si
 * no, la falla es de **entorno / datos de prueba**.
 */
export const createOwnRecipe = async (
  page: Page,
  request: APIRequestContext,
  recipeName: string,
  baseServings: number,
): Promise<string> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const accessToken = await getOwnAccessToken(page, supabaseUrl);
  if (!accessToken) throw new Error("No hay sesión abierta para crear la receta de prueba");
  const headers = getApiHeaders(anonKey, accessToken);

  const productResponse = await request.get(`${supabaseUrl}/rest/v1/product_catalog?select=id&limit=1`, { headers });
  const [product] = (await productResponse.json()) as { id: string }[];
  if (!product) throw new Error("El catálogo no tiene ningún producto para armar la receta de prueba");

  const recipeResponse = await request.post(`${supabaseUrl}/rest/v1/rpc/save_recipe`, {
    headers,
    data: {
      ingredient_list: [{ product_catalog_id: product.id, quantity_unit: "ml", quantity_value: 100 }],
      recipe_base_servings: baseServings,
      recipe_name: recipeName,
      target_recipe_id: null,
    },
  });
  if (!recipeResponse.ok()) {
    throw new Error(`No se pudo crear la receta de prueba: ${recipeResponse.status()} ${await recipeResponse.text()}`);
  }
  return (await recipeResponse.json()) as string;
};

/**
 * Borra todas las recetas del usuario con sesión en `page`. Sus espacios del
 * plan se van con ellas (on delete cascade), así que también limpia el plan. Usa
 * su propio token: RLS solo le deja borrar lo suyo.
 */
export const deleteOwnRecipes = async (page: Page, request: APIRequestContext): Promise<void> => {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const accessToken = await getOwnAccessToken(page, supabaseUrl);
  if (!accessToken) return;

  const response = await request.delete(`${supabaseUrl}/rest/v1/recipes?id=not.is.null`, {
    headers: getApiHeaders(anonKey, accessToken),
  });
  if (!response.ok()) {
    throw new Error(`No se pudieron limpiar las recetas de prueba: ${response.status()} ${await response.text()}`);
  }
};
