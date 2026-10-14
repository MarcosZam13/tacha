import type { Session } from "@supabase/supabase-js";
import type { CatalogBaseUnitType } from "@/constants";
import { CATALOG_SOURCE } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { CatalogProduct } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCTS_DB } from "../constants/my-products.constants";

// Consulta propia y mínima a household_members: no se reutiliza
// getHouseholdMembership() de features/household porque esa función expone
// householdName/role, no el id que esta pantalla necesita para filtrar
// product_catalog (ver plan.md, decisión 4).
const getStoredSession = async (): Promise<NullableRef<Session>> => {
  const { data: sessionData, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;

  return sessionData.session;
};

/** household_id del usuario actual, o null si no tiene sesión o no pertenece a ninguno. */
const getCurrentHouseholdId = async (): Promise<NullableRef<string>> => {
  const session = await getStoredSession();
  if (!session) return null;

  const { data: membershipRow, error } = await getSupabaseClient()
    .from(MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS)
    .select(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID)
    .eq(MY_PRODUCTS_DB.COLUMN.USER_ID, session.user.id)
    .maybeSingle();
  if (error) throw error;

  return membershipRow?.household_id ?? null;
};

/**
 * Los productos `source = 'manual'` del household del usuario actual,
 * adaptados a `CatalogProduct` (mismo tipo que usa "Buscar"). Sin household
 * no hay dónde buscar (SPEC.md §5): se resuelve a lista vacía sin consultar
 * product_catalog.
 *
 * No se filtra solo por `source = 'manual'`: eso traería también los
 * productos madre curados globalmente en SCRUM-131 (`household_id = null`),
 * que no son de ningún usuario.
 */
export const listMyProducts = async (): Promise<CatalogProduct[]> => {
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return [];

  const { data: productRows, error } = await getSupabaseClient()
    .from(MY_PRODUCTS_DB.TABLE.PRODUCT_CATALOG)
    .select(MY_PRODUCTS_DB.SELECT)
    .eq(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL)
    .eq(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID, householdId)
    .order(MY_PRODUCTS_DB.COLUMN.NAME);
  if (error) throw error;

  return productRows.map((productRow): CatalogProduct => ({
    productId: productRow.id,
    productName: productRow.name,
    variants: productRow.product_catalog_variants.map((variantRow) => ({
      baseQuantity: variantRow.base_quantity,
      // base_unit es text en la base; el check de la migración garantiza que es uno de los valores de CATALOG_BASE_UNIT.
      baseUnit: variantRow.base_unit as CatalogBaseUnitType,
      imageUrl: variantRow.image_url,
      // Sin RPC de precio para productos manuales todavía (HU-57): toCatalogCards
      // ya sabe mostrar "Sin precio disponible" cuando el rango viene vacío.
      priceRangeByStore: {},
      variantId: variantRow.id,
    })),
  }));
};
