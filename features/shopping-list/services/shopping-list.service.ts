import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { LIST_TYPE, SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import type { CatalogBaseUnitType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { formatSizeLabel } from "../utils/formatSizeLabel";

/**
 * Trae la lista general del usuario con sus items. Si todavía no tiene lista
 * (nunca añadió nada) devuelve [] — la lista se crea en la base al añadir el
 * primer producto, no al abrir la pantalla.
 */
export const getGeneralList = async (): Promise<ShoppingListItem[]> => {
  const session = await ensureSession();

  const { data: generalList, error } = await getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.LISTS)
    .select(SHOPPING_LIST_DB.GENERAL_LIST_SELECT)
    .eq("owner_id", session.user.id)
    .eq("type", LIST_TYPE.GENERAL)
    .is("household_id", null)
    .order("created_at", { referencedTable: SHOPPING_LIST_DB.TABLE.LIST_ITEMS })
    .maybeSingle();
  if (error) throw error;
  if (!generalList) return [];

  return generalList.list_items.map((listItem) => {
    const variant = listItem.product_catalog_variants;
    return {
      id: listItem.id,
      productName: variant.product_catalog.name,
      quantity: listItem.quantity_requested,
      // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
      sizeLabel: formatSizeLabel(variant.base_quantity, variant.base_unit as CatalogBaseUnitType),
      variantId: variant.id,
    };
  });
};

/**
 * Añade la variante a la lista general. La RPC decide si es fila nueva o si
 * suma 1 a la existente, y devuelve la fila con la cantidad final: la
 * pantalla muestra lo que quedó en la base, no lo que supuso el cliente.
 */
export const addItemToGeneralList = async (
  searchResult: CatalogSearchResult,
): Promise<ShoppingListItem> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    SHOPPING_LIST_DB.RPC.ADD_ITEM_TO_GENERAL_LIST,
    { target_variant_id: searchResult.variantId },
  );
  if (error) throw error;

  return {
    id: listItem.id,
    productName: searchResult.productName,
    quantity: listItem.quantity_requested,
    sizeLabel: searchResult.sizeLabel,
    variantId: listItem.product_catalog_variant_id,
  };
};
