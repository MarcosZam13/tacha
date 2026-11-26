import type { CatalogBaseUnitType } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { MY_INVENTORY_DB } from "../constants/my-inventory.constants";
import type { InventoryItem } from "../models/InventoryItem.interface";

/**
 * Lo que la app cree que hay en casa, en el orden de la base: lo que se acaba
 * antes primero y lo que no tiene fecha al final. La base hace todo el
 * cálculo (el mismo que las sugerencias, migración 065).
 */
export const getMyInventory = async (): Promise<InventoryItem[]> => {
  await ensureSession();

  const { data: inventoryRows, error } = await getSupabaseClient().rpc(MY_INVENTORY_DB.RPC.GET_MY_INVENTORY);
  if (error) throw error;

  return inventoryRows.map((row) => ({
    expectedOutAt: row.expected_out_at,
    productName: row.product_name,
    // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
    sizeLabel: formatSizeLabel(row.base_quantity, row.base_unit as CatalogBaseUnitType),
    variantId: row.product_catalog_variant_id,
  }));
};
