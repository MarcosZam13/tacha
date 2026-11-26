import type { Locator, Page } from "@playwright/test";
import { signInAsFakeUser, stubSupabaseApi } from "../../support/fake-session";

// Cómo encontrar las cosas y cómo simular la base en "Mi inventario". Sin
// aserciones: eso es del test (playwright-e2e, references/standards.md).
//
// Todo lo de Supabase se responde desde el test: la sesión es la registrada
// falsa de e2e/support y cualquier otra petición responde [] (lista vacía, sin
// sugerencias). Cambian get_my_inventory y, en E2E-MINV-04, las sugerencias. El cálculo real
// se prueba en el SQL Editor (features/my-inventory/specs/E2E.md).
export const LIST_PATH = "/lista";
export const INVENTORY_PATH = "/lista/inventario";

const INVENTORY_RPC = "**/rest/v1/rpc/get_my_inventory";
const SUGGESTIONS_RPC = "**/rest/v1/rpc/get_inventory_suggestions";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface InventoryRow {
  base_quantity: number;
  base_unit: string;
  expected_out_at: string | null;
  last_purchased_at: string;
  product_catalog_variant_id: string;
  product_name: string;
}

/** Una fila como la devuelve la RPC: se acaba en `daysLeft` días (null = sin fecha). */
export const createInventoryRow = (productName: string, daysLeft: number | null): InventoryRow => ({
  base_quantity: 1000,
  base_unit: "ml",
  // A mediodía: lejos de la medianoche, el día no cambia según la zona del navegador.
  expected_out_at:
    daysLeft === null ? null : new Date(new Date().setHours(12, 0, 0, 0) + daysLeft * DAY_MS).toISOString(),
  last_purchased_at: new Date(Date.now() - 5 * DAY_MS).toISOString(),
  product_catalog_variant_id: `e2e-variant-${productName}`,
  product_name: productName,
});

/**
 * Sesión falsa, base simulada y get_my_inventory con estas filas. Con
 * `suggestionRows`, get_inventory_suggestions también devuelve algo, así la
 * fila "¿Se te acabó?" aparece en /lista (E2E-MINV-04).
 */
export const stubInventory = async (
  page: Page,
  rows: InventoryRow[],
  suggestionRows: InventoryRow[] = [],
): Promise<void> => {
  await stubSupabaseApi(page);
  await page.route(INVENTORY_RPC, (route) => route.fulfill({ json: rows }));
  await page.route(SUGGESTIONS_RPC, (route) => route.fulfill({ json: suggestionRows }));
  await signInAsFakeUser(page);
};

/** Un grupo de la pantalla ("Vence pronto", "Este mes"...), por su título. */
export const getGroup = (page: Page, title: string): Locator => page.getByRole("region", { name: title });

export const getGroupTitles = (page: Page): Locator => page.getByRole("region").getByRole("heading", { level: 2 });
