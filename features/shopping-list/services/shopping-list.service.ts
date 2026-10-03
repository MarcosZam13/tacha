import type { CatalogBaseUnitType } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { LIST_TYPE, SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ItemDetail } from "../models/ItemDetail.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";

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

/**
 * Suma o resta 1 a la cantidad de un item. Se manda el delta, no la cantidad
 * final: si llegan dos cambios a la vez (dos pestañas), la base suma los dos
 * en vez de que el segundo pise al primero. Devuelve la cantidad que quedó.
 */
export const changeItemQuantity = async (
  itemId: string,
  quantityStep: ItemQuantityStepType,
): Promise<number> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    SHOPPING_LIST_DB.RPC.CHANGE_ITEM_QUANTITY,
    { quantity_delta: quantityStep, target_item_id: itemId },
  );
  if (error) throw error;

  return listItem.quantity_requested;
};

/**
 * Marcas de la variante y el último precio de cada marca en cada tienda, en
 * una sola petición. No pide sesión: como la búsqueda, lee catálogo público.
 * Los precios vienen de una vista, y la base no garantiza que sus columnas
 * no sean null: se descartan las filas incompletas en vez de mostrar "₡0".
 */
export const getItemDetail = async (variantId: string): Promise<ItemDetail> => {
  const { data: variant, error } = await getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.VARIANTS)
    .select(SHOPPING_LIST_DB.ITEM_DETAIL_SELECT)
    .eq("id", variantId)
    .single();
  if (error) throw error;

  return {
    brands: variant.product_brands.map((brand) => brand.name),
    storePrices: variant.latest_prices.flatMap(({ price, stores }) =>
      price !== null && stores ? [{ price, storeName: stores.display_name }] : [],
    ),
  };
};
