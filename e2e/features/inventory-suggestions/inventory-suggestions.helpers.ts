import type { Locator, Page } from "@playwright/test";
import { signInAsFakeUser, stubSupabaseApi } from "../../support/fake-session";

// Cómo encontrar las cosas y cómo simular la base en /lista. Sin aserciones:
// eso es del test (playwright-e2e, references/standards.md).
//
// Todo lo de Supabase se responde desde el test: la sesión es la registrada
// falsa de e2e/support y cualquier otra petición responde [] (lista vacía).
// Estos escenarios validan la pantalla, no el cálculo de la base: ese se
// prueba en el SQL Editor (features/inventory-suggestions/specs/E2E.md).
const LIST_PATH = "/lista";

const SUGGESTIONS_RPC = "**/rest/v1/rpc/get_inventory_suggestions";

// Los mensajes de error de la lista (role="alert"), no el anunciador de rutas de Next.
export const getListErrors = (page: Page): Locator => page.getByRole("alert").filter({ hasText: /No se pudo/u });

export interface SuggestionRow {
  base_quantity: number;
  base_unit: string;
  expected_out_at: string;
  last_purchased_at: string;
  product_catalog_variant_id: string;
  product_name: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Una fila como la devuelve la RPC: comprada hace `daysAgo` días. */
export const createSuggestionRow = (productName: string, daysAgo: number): SuggestionRow => ({
  base_quantity: 1000,
  base_unit: "ml",
  expected_out_at: new Date(Date.now() - DAY_MS).toISOString(),
  last_purchased_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
  product_catalog_variant_id: `e2e-variant-${productName}`,
  product_name: productName,
});

/**
 * Abre /lista con la sesión falsa y la RPC de sugerencias respondida desde el
 * test: con `rows`, devuelve esas filas; con null, falla con 500 (CA-03).
 * La ruta de la RPC se registra después de la general: Playwright prueba
 * primero la última que se registró.
 */
export const openListWithSuggestions = async (page: Page, rows: SuggestionRow[] | null): Promise<void> => {
  await stubSupabaseApi(page);
  await page.route(SUGGESTIONS_RPC, (route) =>
    rows ? route.fulfill({ json: rows }) : route.fulfill({ status: 500, json: { message: "Error simulado" } }),
  );
  await signInAsFakeUser(page);
  // Se espera la respuesta de la RPC: así las aserciones de "no aparece" miran
  // la pantalla después de la respuesta, no antes.
  const suggestionsResponse = page.waitForResponse(SUGGESTIONS_RPC);
  await page.goto(LIST_PATH);
  await suggestionsResponse;
};

export const getSuggestionsRegion = (page: Page): Locator => page.getByRole("region", { name: "¿Se te acabó?" });

export const getSearchBox = (page: Page): Locator => page.getByRole("combobox", { name: "Buscar producto" });

export const getEmptyListMessage = (page: Page): Locator =>
  page.getByText("Tu lista está vacía. Busca un producto para empezar.");
