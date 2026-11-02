import type { QueryData } from "@supabase/supabase-js";
import type { CatalogBaseUnitType } from "@/constants";
import { addVariantToGeneralList, changeListItemQuantity } from "@/services/list-items.service";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { LIST_TYPE, SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import type { ItemQuantityStepType } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { ItemCheck } from "../models/ItemCheck.interface";
import type { ItemCheckResult } from "../models/ItemCheckResult.interface";
import type { ItemDetail } from "../models/ItemDetail.interface";
import type { RecipeShortfall } from "../models/RecipeShortfall.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { startOfLocalDay } from "../utils/startOfLocalDay";
import { toRecipeShortfalls } from "../utils/toRecipeShortfalls";

/** Las columnas de tachado de una fila de list_items → su ItemCheck. */
const toItemCheck = (listItem: {
  checked_at: NullableRef<string>;
  purchase_session_id: NullableRef<string>;
  quantity_bought: NullableRef<number>;
}): ItemCheck => ({
  checkedAt: listItem.checked_at,
  purchaseSessionId: listItem.purchase_session_id,
  quantityBought: listItem.quantity_bought,
});

/**
 * Una lista con sus items de hoy: los pendientes y lo tachado desde la
 * medianoche local. Lo tachado otro día va a vivir en Historial de compras
 * (HU-36e CA-05). El filtro aplica a los items embebidos, no a la lista.
 */
const selectListWithTodayItems = () =>
  getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.LISTS)
    .select(SHOPPING_LIST_DB.GENERAL_LIST_SELECT)
    // A diferencia de .eq() y .select(), este texto no lo valida el genérico
    // Database: un typo en "checked_at" solo falla en runtime (lo cubre E2E-LISTA-04).
    .or(`checked_at.is.null,checked_at.gte.${startOfLocalDay(new Date())}`, {
      referencedTable: SHOPPING_LIST_DB.TABLE.LIST_ITEMS,
    })
    .order("created_at", { referencedTable: SHOPPING_LIST_DB.TABLE.LIST_ITEMS });

type ListWithTodayItemsRow = QueryData<ReturnType<typeof selectListWithTodayItems>>[number];

/**
 * Las filas de una lista → ShoppingListItem. Los avisos de faltante vienen
 * aparte (la RPC de 033), por id de fila; una fila sin avisos lleva [].
 */
const toShoppingListItems = (
  list: ListWithTodayItemsRow,
  shortfallsByItemId: Map<string, RecipeShortfall[]> = new Map(),
): ShoppingListItem[] =>
  list.list_items.map((listItem) => {
    const variant = listItem.product_catalog_variants;
    return {
      ...toItemCheck(listItem),
      id: listItem.id,
      productName: variant.product_catalog.name,
      quantity: listItem.quantity_requested,
      recipeShortfalls: shortfallsByItemId.get(listItem.id) ?? [],
      // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
      sizeLabel: formatSizeLabel(variant.base_quantity, variant.base_unit as CatalogBaseUnitType),
      variantId: variant.id,
    };
  });

// El id de la lista general que le toca a quien llama: la de su familia si es
// miembro, si no la personal (SCRUM-59, CA-05). Lo decide la base; null si
// todavía no existe.
const findGeneralListId = async (): Promise<NullableRef<string>> => {
  const { data: generalListId, error } = await getSupabaseClient().rpc(SHOPPING_LIST_DB.RPC.FIND_GENERAL_LIST_ID);
  if (error) throw error;

  return generalListId;
};

/**
 * Los avisos de faltante de receta o plan de la lista general (SCRUM-114),
 * por id de fila. La RPC elige la lista igual que find_general_list_id y ya
 * filtra qué es un aviso (faltante mayor que 0, en ml o g); trae el nombre de
 * la receta aunque sea de otro miembro de la familia (SPEC §16, regla 29).
 */
const getGeneralListShortfalls = async (): Promise<Map<string, RecipeShortfall[]>> => {
  const { data: shortfallRows, error } = await getSupabaseClient().rpc(SHOPPING_LIST_DB.RPC.GET_GENERAL_LIST_SHORTFALLS);
  if (error) throw error;

  return toRecipeShortfalls(shortfallRows);
};

/**
 * Trae la lista general con sus items de hoy: la de la familia si el usuario
 * es miembro de una, si no la personal. Si todavía no existe (nadie añadió
 * nada) devuelve [] — la lista se crea en la base al añadir el primer
 * producto, no al abrir la pantalla. Los avisos de faltante se piden en
 * paralelo; si fallan, falla la carga: sin ellos la pantalla diría que no
 * falta nada sin saberlo (SPEC §16.6).
 */
export const getGeneralList = async (): Promise<ShoppingListItem[]> => {
  await ensureSession();

  const [generalListId, shortfallsByItemId] = await Promise.all([findGeneralListId(), getGeneralListShortfalls()]);
  if (!generalListId) return [];

  const { data: generalList, error } = await selectListWithTodayItems().eq("id", generalListId).maybeSingle();
  if (error) throw error;
  if (!generalList) return [];

  return toShoppingListItems(generalList, shortfallsByItemId);
};

/**
 * La lista personal que el usuario eligió mantener al unirse a una familia
 * (SCRUM-59, D4): solo si existe y no es la lista que ya muestra la pantalla.
 * Sin familia, la lista general es la personal, así que devuelve []. Sus
 * filas no llevan avisos de faltante (SPEC §16, regla 30).
 */
export const getKeptPersonalList = async (): Promise<ShoppingListItem[]> => {
  const session = await ensureSession();

  const generalListId = await findGeneralListId();

  const { data: personalList, error } = await selectListWithTodayItems()
    .eq("owner_id", session.user.id)
    .eq("type", LIST_TYPE.GENERAL)
    .is("household_id", null)
    .maybeSingle();
  if (error) throw error;
  if (!personalList || personalList.id === generalListId) return [];

  return toShoppingListItems(personalList);
};

/**
 * Añade la variante a la lista general. Delega en el servicio compartido
 * (services/list-items.service.ts, SCRUM-85): la RPC y su mapeo viven ahí,
 * aquí solo se completan los datos que esta feature ya tenía (nombre y
 * presentación) porque la fila que devuelve la RPC no los trae.
 */
export const addItemToGeneralList = async (
  searchResult: CatalogSearchResult,
): Promise<ShoppingListItem> => {
  const listItem = await addVariantToGeneralList(searchResult.variantId);

  return {
    checkedAt: listItem.checkedAt,
    id: listItem.id,
    productName: searchResult.productName,
    purchaseSessionId: listItem.purchaseSessionId,
    quantity: listItem.quantity,
    quantityBought: listItem.quantityBought,
    // Añadir desde el buscador nunca deja aviso; si la fila ya tenía, el reducer los conserva.
    recipeShortfalls: [],
    sizeLabel: searchResult.sizeLabel,
    variantId: listItem.variantId,
  };
};

/**
 * Suma o resta 1 a la cantidad de un item. Delega en el servicio compartido
 * (SCRUM-85): misma RPC que usa catalog-product-detail, sin lógica propia
 * que mantener en dos lugares.
 */
export const changeItemQuantity: (itemId: string, quantityStep: ItemQuantityStepType) => Promise<number> =
  changeListItemQuantity;

/**
 * Tacha o destacha un item. Se manda el estado deseado, no "invertir": si dos
 * pestañas mandan "tachar", el resultado es el mismo. La hora y el usuario los
 * pone la base (trigger de la migración 015). Destachar también borra la
 * compra y lo comprado (trigger extendido en 016). Si al destachar ya hay una
 * pendiente de la misma presentación, la base las junta y devuelve la
 * pendiente (035, SCRUM-156): por eso devuelve también el id y la cantidad.
 */
export const setItemChecked = async (itemId: string, isChecked: boolean): Promise<ItemCheckResult> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    SHOPPING_LIST_DB.RPC.SET_LIST_ITEM_CHECKED,
    { is_checked: isChecked, target_item_id: itemId },
  );
  if (error) throw error;

  return { check: toItemCheck(listItem), itemId: listItem.id, quantity: listItem.quantity_requested };
};

/**
 * Tacha un item dentro de una compra (modo compra, SCRUM-67). La base le pone
 * la compra y lo comprado arranca igual a lo pedido; si la compra no es del
 * usuario o ya está cerrada, la rechaza (trigger de 016).
 */
export const checkItemInSession = async (itemId: string, sessionId: string): Promise<ItemCheck> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    SHOPPING_LIST_DB.RPC.CHECK_LIST_ITEM_IN_SESSION,
    { target_item_id: itemId, target_session_id: sessionId },
  );
  if (error) throw error;

  return toItemCheck(listItem);
};

/**
 * Suma o resta 1 a lo comprado de un item (modo compra). Igual que la cantidad
 * pedida: se manda el delta y la base devuelve lo que quedó. Solo funciona
 * mientras la compra de la fila sigue abierta.
 */
export const changeItemBoughtQuantity = async (
  itemId: string,
  quantityStep: ItemQuantityStepType,
): Promise<number> => {
  await ensureSession();

  const { data: listItem, error } = await getSupabaseClient().rpc(
    SHOPPING_LIST_DB.RPC.CHANGE_BOUGHT_QUANTITY,
    { quantity_delta: quantityStep, target_item_id: itemId },
  );
  if (error) throw error;
  // La RPC solo toca filas de una compra, que siempre tienen lo comprado (check de 016).
  if (listItem.quantity_bought === null) {
    throw new Error(`${SHOPPING_LIST_DB.RPC.CHANGE_BOUGHT_QUANTITY} devolvió una fila sin lo comprado`);
  }

  return listItem.quantity_bought;
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
