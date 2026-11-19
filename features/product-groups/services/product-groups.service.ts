import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { PRODUCT_GROUPS_DB } from "../constants/product-groups.constants";
import type { ProductGroupSummary } from "../models/product-groups.interfaces";

/** Forma de cada fila que devuelve PRODUCT_GROUPS_DB.SELECT. */
interface ProductGroupRow {
  household_id: NullableRef<string>;
  id: string;
  name: string;
  // El count embebido de PostgREST llega como un arreglo de un solo elemento.
  product_group_items: { count: number }[];
}

const toProductGroupSummary = (groupRow: ProductGroupRow): ProductGroupSummary => ({
  id: groupRow.id,
  isShared: groupRow.household_id !== null,
  name: groupRow.name,
  productCount: groupRow.product_group_items[0]?.count ?? 0,
});

/**
 * Los grupos que el usuario puede ver: sus personales y los compartidos con
 * su familia. No se filtra nada acá: la RLS de product_groups (054) ya
 * decide qué filas llegan. El último modificado primero (SPEC.md §5).
 *
 * ensureSession() primero: entrando directo a /lista/grupos todavía puede no
 * haber sesión, y sin ella la consulta saldría como anon y no vería nada.
 */
export const listProductGroups = async (): Promise<ProductGroupSummary[]> => {
  await ensureSession();

  const { data: groupRows, error } = await getSupabaseClient()
    .from(PRODUCT_GROUPS_DB.TABLE.PRODUCT_GROUPS)
    .select(PRODUCT_GROUPS_DB.SELECT)
    .order(PRODUCT_GROUPS_DB.COLUMN.UPDATED_AT, { ascending: false });
  if (error) throw error;

  return groupRows.map(toProductGroupSummary);
};
