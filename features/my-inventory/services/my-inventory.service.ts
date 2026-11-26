import type { CatalogBaseUnitType } from "@/constants";
import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
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

/**
 * "Ya se acabó" (SCRUM-106, CA-01): el producto de esa presentación sale del
 * inventario y pasa a "¿Se te acabó?". No toca las compras (CA-03).
 */
export const markInventoryItemUsedUp = async (variantId: string): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(MY_INVENTORY_DB.RPC.MARK_INVENTORY_ITEM_USED_UP, {
    target_variant_id: variantId,
  });
  if (error) throw error;
};

/**
 * "+ Agregar a mi inventario" (SCRUM-107, CA-01): algo que ya había en casa,
 * con el chip opcional de HU-70b (cuenta desde ahora). No es una compra: no
 * toca la lista, el historial ni Finanzas.
 */
export const addInventoryItem = async (
  variantId: string,
  choice: NullableRef<ShelfLifeChoiceType>,
): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(MY_INVENTORY_DB.RPC.ADD_INVENTORY_ITEM, {
    // Sin chip no se manda (undefined no viaja en el JSON): la base usa null por defecto.
    target_choice: choice ?? undefined,
    target_variant_id: variantId,
  });
  if (error) throw error;
};

/**
 * Ajusta la fecha con un chip de HU-70b (SCRUM-106, CA-02), contando desde
 * ahora. No toca las compras (CA-03).
 */
export const adjustInventoryItem = async (variantId: string, choice: ShelfLifeChoiceType): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(MY_INVENTORY_DB.RPC.ADJUST_INVENTORY_ITEM, {
    target_choice: choice,
    target_variant_id: variantId,
  });
  if (error) throw error;
};
