import type { CatalogBaseUnitType } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { LIST_TYPE, SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ItemDetail } from "../models/ItemDetail.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { startOfLocalDay } from "../utils/startOfLocalDay";

/**
 * Trae la lista general del usuario con sus items. Si todavía no tiene lista
 * (nunca añadió nada) devuelve [] — la lista se crea en la base al añadir el
 * primer producto, no al abrir la pantalla.
 *
 * Solo trae los pendientes y lo tachado desde la medianoche local: lo tachado
 * otro día va a vivir en Historial de compras (HU-36e CA-05). El filtro aplica
 * a los items embebidos, no a la lista.
 */
export const getGeneralList = async (): Promise<ShoppingListItem[]> => {
  const session = await ensureSession();

  const { data: generalList, error } = await getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.LISTS)
    .select(SHOPPING_LIST_DB.GENERAL_LIST_SELECT)
    .eq("owner_id", session.user.id)
    .eq("type", LIST_TYPE.GENERAL)
    .is("household_id", null)
    .or(`checked_at.is.null,checked_at.gte.${startOfLocalDay(new Date())}`, {
      referencedTable: SHOPPING_LIST_DB.TABLE.LIST_ITEMS,
    })
    .order("created_at", { referencedTable: SHOPPING_LIST_DB.TABLE.LIST_ITEMS })
    .maybeSingle();
  if (error) throw error;
  if (!generalList) return [];

  return generalList.list_items.map((listItem) => {
    const variant = listItem.product_catalog_variants;
    return {
      checkedAt: listItem.checked_at,
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
 * Añade la variante a la lista general. La RPC decide si es fila nueva, si
 * suma 1 a la existente o si reabre una tachada (con cantidad 1), y devuelve
 * la fila final: la pantalla muestra lo que quedó en la base, no lo que
 * supuso el cliente.
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
    checkedAt: listItem.checked_at,
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
 * Tacha o destacha un item. Se manda el estado deseado, no "invertir": si dos
 * pestañas mandan "tachar", el resultado es el mismo. La hora y el usuario los
 * pone la base (trigger de la migración 015). Devuelve cuándo quedó tachado,
 * o null si quedó pendiente.
 */
export const setItemChecked = async (
  itemId: string,
  isChecked: boolean,
): Promise<NullableRef<string>> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    SHOPPING_LIST_DB.RPC.SET_LIST_ITEM_CHECKED,
    { is_checked: isChecked, target_item_id: itemId },
  );
  if (error) throw error;

  return listItem.checked_at;
};

/**
 * Borra un item de la lista general. Si ya no existe (otra pestaña lo
 * borró) o no es del usuario, RLS no lo ve: se borran 0 filas sin error, y se
 * trata igual que un borrado correcto. Para quien lo pidió el producto ya no
 * está, y así no se revela si existe un item ajeno.
 */
export const deleteListItem = async (itemId: string): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.LIST_ITEMS)
    .delete()
    .eq("id", itemId);
  if (error) throw error;
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
