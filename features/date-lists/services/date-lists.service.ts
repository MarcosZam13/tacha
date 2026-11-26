import { DATE_LIST_TYPE, LIST_ITEM_TEXT } from "@/constants";
import type { CatalogBaseUnitType, DateListStatusType } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { DATE_LIST_DB } from "../constants/date-lists.constants";
import type { DateList, DateListDetail } from "../models/DateList.interface";
import { sortPendingFirst } from "../utils/sortPendingFirst";

interface DateListRow {
  event_date: NullableRef<string>;
  id: string;
  name: NullableRef<string>;
  spent_total: NullableRef<number>;
  status: string;
}

/**
 * Fila de lists → DateList. name y event_date son nullable en el tipo porque
 * la columna lo es para los otros tipos de lista; en una de tipo date el check
 * de 038 garantiza que están. status lo garantiza el check de 004.
 */
const toDateList = (row: DateListRow): DateList => ({
  eventDate: row.event_date ?? "",
  id: row.id,
  name: row.name ?? "",
  spentTotal: row.spent_total,
  status: row.status as DateListStatusType,
});

/** Las sublistas que ve quien llama (las suyas y las de su familia, por RLS), de la más próxima a la más lejana. */
export const getDateLists = async (): Promise<DateList[]> => {
  await ensureSession();

  const { data, error } = await getSupabaseClient()
    .from(DATE_LIST_DB.TABLE.LISTS)
    .select(DATE_LIST_DB.LIST_SELECT)
    .eq("type", DATE_LIST_TYPE)
    .order("event_date")
    .order("created_at");
  if (error) throw error;

  return data.map(toDateList);
};

/** Crea la sublista. Dueño y familia los decide la base (SPEC §5, regla 3). */
export const createDateList = async (name: string, eventDate: string): Promise<DateList> => {
  await ensureSession();

  const { data, error } = await getSupabaseClient().rpc(DATE_LIST_DB.RPC.CREATE, {
    list_event_date: eventDate,
    list_name: name,
  });
  if (error) throw error;

  return toDateList(data);
};

/** Una sublista con sus productos, primero los pendientes; null si no existe o quien llama no la ve. */
export const getDateListDetail = async (listId: string): Promise<NullableRef<DateListDetail>> => {
  await ensureSession();

  const { data, error } = await getSupabaseClient()
    .from(DATE_LIST_DB.TABLE.LISTS)
    .select(DATE_LIST_DB.DETAIL_SELECT)
    .eq("id", listId)
    .eq("type", DATE_LIST_TYPE)
    .order("created_at", { referencedTable: DATE_LIST_DB.TABLE.LIST_ITEMS })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...toDateList(data),
    items: sortPendingFirst(data.list_items.map((listItem) => {
      // SCRUM-163: la RLS de la 032 devuelve la presentación en null si quien
      // mira no puede ver el producto (personal de otro miembro). Hoy la app no
      // deja llegar a ese caso en una sublista, pero si pasa, la fila sale "no
      // disponible" en vez de tumbar la sublista (misma guarda que la lista general).
      const variant: NullableRef<typeof listItem.product_catalog_variants> = listItem.product_catalog_variants;
      return {
        id: listItem.id,
        isChecked: listItem.checked_at !== null,
        productName: variant ? variant.product_catalog.name : LIST_ITEM_TEXT.UNAVAILABLE_PRODUCT,
        quantity: listItem.quantity_requested,
        // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
        // Sin presentación legible no hay tamaño que mostrar.
        sizeLabel: variant ? formatSizeLabel(variant.base_quantity, variant.base_unit as CatalogBaseUnitType) : "",
        variantId: listItem.product_catalog_variant_id,
      };
    })),
  };
};

/** Suma 1 si ya está pendiente o crea la fila (SPEC §5, regla 6). */
export const addItemToDateList = async (listId: string, variantId: string): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(DATE_LIST_DB.RPC.ADD_ITEM, {
    target_list_id: listId,
    target_variant_id: variantId,
  });
  if (error) throw error;
};

export const removeDateListItem = async (itemId: string): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().from(DATE_LIST_DB.TABLE.LIST_ITEMS).delete().eq("id", itemId);
  if (error) throw error;
};

/** Tachar o destachar. El estado de la sublista lo actualiza un trigger de la base (SPEC §9, regla 1). */
export const setDateListItemChecked = async (itemId: string, isChecked: boolean): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(DATE_LIST_DB.RPC.SET_ITEM_CHECKED, {
    is_checked: isChecked,
    target_item_id: itemId,
  });
  if (error) throw error;
};

/** Cancela sin borrar, o reactiva y la base recalcula el estado (SPEC §9, reglas 3 y 5). */
export const setDateListCancelled = async (listId: string, isCancelled: boolean): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(DATE_LIST_DB.RPC.SET_CANCELLED, {
    is_cancelled: isCancelled,
    target_list_id: listId,
  });
  if (error) throw error;
};

/**
 * Agrega o cambia el total gastado (SPEC §10). La base rechaza un monto inválido (22023), una
 * sublista ajena o inexistente (P0002) y una cancelada (55000); para la pantalla todos son "no se guardó".
 */
export const setDateListTotal = async (listId: string, total: number): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(DATE_LIST_DB.RPC.SET_TOTAL, {
    new_total: total,
    target_list_id: listId,
  });
  if (error) throw error;
};
