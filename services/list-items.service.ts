import { LIST_ITEMS_DB } from "@/constants/list-items.constants";
import type { ItemQuantityStepType } from "@/constants/list-items.constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Fila de list_items como la devuelven add_item_to_general_list y
 * change_item_quantity, ya mapeada.
 */
export interface ListItemRow {
  checkedAt: NullableRef<string>;
  id: string;
  purchaseSessionId: NullableRef<string>;
  quantity: number;
  quantityBought: NullableRef<number>;
  variantId: string;
}

/**
 * Añade la variante a la lista general. La RPC decide si es fila nueva, si
 * suma 1 a la existente o si reabre una tachada (con cantidad 1), y devuelve
 * la fila final: quien llama muestra lo que quedó en la base, no lo que
 * supuso el cliente. Promovida desde shopping-list (SCRUM-85):
 * catalog-product-detail también agrega productos a la lista general.
 */
export const addVariantToGeneralList = async (variantId: string): Promise<ListItemRow> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    LIST_ITEMS_DB.RPC.ADD_VARIANT_TO_GENERAL_LIST,
    { target_variant_id: variantId },
  );
  if (error) throw error;

  return {
    checkedAt: listItem.checked_at,
    id: listItem.id,
    purchaseSessionId: listItem.purchase_session_id,
    quantity: listItem.quantity_requested,
    quantityBought: listItem.quantity_bought,
    variantId: listItem.product_catalog_variant_id,
  };
};

/**
 * Suma o resta 1 a la cantidad de un item. Se manda el delta, no la cantidad
 * final: si llegan dos cambios a la vez (dos pestañas), la base suma los dos
 * en vez de que el segundo pise al primero (migración 005: el delta solo
 * puede ser -1 o 1, la base lo rechaza si no). Devuelve la cantidad que
 * quedó. Promovida desde shopping-list (SCRUM-85).
 */
export const changeListItemQuantity = async (
  itemId: string,
  quantityStep: ItemQuantityStepType,
): Promise<number> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    LIST_ITEMS_DB.RPC.CHANGE_ITEM_QUANTITY,
    { quantity_delta: quantityStep, target_item_id: itemId },
  );
  if (error) throw error;

  return listItem.quantity_requested;
};
