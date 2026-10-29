import type { Session } from "@supabase/supabase-js";
import type { CatalogBaseUnitType } from "@/constants";
import { CATALOG_CATEGORY_TEXT, CATALOG_SOURCE } from "@/constants";
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

/** household_id del usuario de esta sesión, o null si no pertenece a ninguno. */
const getHouseholdIdOf = async (session: Session): Promise<NullableRef<string>> => {
  const { data: membershipRow, error } = await getSupabaseClient()
    .from(MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS)
    .select(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID)
    .eq(MY_PRODUCTS_DB.COLUMN.USER_ID, session.user.id)
    .maybeSingle();
  if (error) throw error;

  return membershipRow?.household_id ?? null;
};

// Fila de product_catalog con sus variantes embebidas (MY_PRODUCTS_DB.SELECT), ya adaptada.
const toCatalogProduct = (productRow: {
  id: string;
  name: string;
  product_catalog_variants: {
    id: string;
    base_unit: string;
    base_quantity: number;
    image_url: NullableRef<string>;
  }[];
}): CatalogProduct => ({
  // "Mis productos" todavía no asigna categoría (HU-55; el selector es
  // SCRUM-87) ni la muestra en esta pantalla: category queda sin asignar,
  // sin consultar categories, hasta que haga falta de verdad (HU-52 solo
  // agregó el campo a CatalogProduct para "Buscar").
  category: CATALOG_CATEGORY_TEXT.UNASSIGNED,
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
});

/** Productos `source = 'manual'` donde `column = value` (household_id u owner_id). */
const queryManualProductsBy = async (column: string, value: string): Promise<CatalogProduct[]> => {
  const { data: productRows, error } = await getSupabaseClient()
    .from(MY_PRODUCTS_DB.TABLE.PRODUCT_CATALOG)
    .select(MY_PRODUCTS_DB.SELECT)
    .eq(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL)
    .eq(column, value)
    .order(MY_PRODUCTS_DB.COLUMN.NAME);
  if (error) throw error;

  return productRows.map(toCatalogProduct);
};

/**
 * Los productos `source = 'manual'` del usuario actual, adaptados a
 * `CatalogProduct` (mismo tipo que usa "Buscar"). Sin sesión no hay dónde
 * buscar (SPEC.md §5): se resuelve a lista vacía sin consultar product_catalog.
 *
 * Extendido en HU-56 (SCRUM-87, de forma aditiva, SPEC.md §5 y §15): ya no
 * se corta a `[]` cuando no hay household. Se consulta siempre por
 * `owner_id` (los productos personales que el usuario nunca compartió,
 * `create_personal_product`) y, si además pertenece a un household, también
 * por `household_id` — un producto nunca tiene los dos a la vez (lo decide
 * la RPC), así que la unión no tiene duplicados que filtrar.
 *
 * No se filtra solo por `source = 'manual'`: eso traería también los
 * productos madre curados globalmente en SCRUM-131 (`household_id = null`,
 * `owner_id = null`), que no son de ningún usuario.
 */
export const listMyProducts = async (): Promise<CatalogProduct[]> => {
  const session = await getStoredSession();
  if (!session) return [];

  const householdId = await getHouseholdIdOf(session);

  const [byHousehold, byOwner] = await Promise.all([
    householdId
      ? queryManualProductsBy(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID, householdId)
      : Promise.resolve<CatalogProduct[]>([]),
    queryManualProductsBy(MY_PRODUCTS_DB.COLUMN.OWNER_ID, session.user.id),
  ]);

  return [...byHousehold, ...byOwner].sort((productA, productB) =>
    productA.productName.localeCompare(productB.productName),
  );
};
