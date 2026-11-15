import type { CatalogBaseUnitType } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { DATE_LIST_DB } from "../constants/date-lists.constants";
import type { DateListStatusType } from "../constants/date-lists.constants";
import type { DateList, DateListDetail } from "../models/DateList.interface";

interface DateListRow {
  event_date: NullableRef<string>;
  id: string;
  name: NullableRef<string>;
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
  status: row.status as DateListStatusType,
});

/** Las sublistas que ve quien llama (las suyas y las de su familia, por RLS), de la más próxima a la más lejana. */
export const getDateLists = async (): Promise<DateList[]> => {
  await ensureSession();

  const { data, error } = await getSupabaseClient()
    .from(DATE_LIST_DB.TABLE.LISTS)
    .select(DATE_LIST_DB.LIST_SELECT)
    .eq("type", DATE_LIST_DB.LIST_TYPE)
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

/** Una sublista con sus productos pendientes; null si no existe o quien llama no la ve. */
export const getDateListDetail = async (listId: string): Promise<NullableRef<DateListDetail>> => {
  await ensureSession();

  const { data, error } = await getSupabaseClient()
    .from(DATE_LIST_DB.TABLE.LISTS)
    .select(DATE_LIST_DB.DETAIL_SELECT)
    .eq("id", listId)
    .eq("type", DATE_LIST_DB.LIST_TYPE)
    .is("list_items.checked_at", null)
    .order("created_at", { referencedTable: DATE_LIST_DB.TABLE.LIST_ITEMS })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...toDateList(data),
    items: data.list_items.map((listItem) => {
      const variant = listItem.product_catalog_variants;
      return {
        id: listItem.id,
        productName: variant.product_catalog.name,
        quantity: listItem.quantity_requested,
        // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
        sizeLabel: formatSizeLabel(variant.base_quantity, variant.base_unit as CatalogBaseUnitType),
        variantId: variant.id,
      };
    }),
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
