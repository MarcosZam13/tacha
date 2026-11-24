import type { Session } from "@supabase/supabase-js";
import type { CatalogBaseUnitType } from "@/constants";
import { CATALOG_CATEGORY_TEXT, CATALOG_SOURCE } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCTS_DB } from "../constants/my-products.constants";
import type { MyProduct } from "../models/my-products.interfaces";

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
    reference_price: NullableRef<number>;
    reference_store_name: NullableRef<string>;
    stores: NullableRef<{ display_name: string }>;
  }[];
}): Omit<MyProduct, "editable"> => ({
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
    // Un producto personal nunca tiene precios del scraping: su único precio
    // es el de referencia que anotó el usuario (HU-57), que va aparte (CA-03).
    priceRangeByStore: {},
    referencePrice: variantRow.reference_price ?? undefined,
    // La tienda es una u otra, nunca las dos (check de la migración 051).
    referenceStoreName: variantRow.reference_store_name ?? variantRow.stores?.display_name ?? undefined,
    variantId: variantRow.id,
  })),
});

// HU-58 (SCRUM-89): además, los datos para abrir el formulario de edición.
// Un producto personalizado tiene una sola variante (create_personal_product
// crea las dos filas en la misma transacción): de ella salen el tamaño y la
// marca. Si faltara, no se inventan datos: el producto no se lista (null).
const toMyProduct = (productRow: {
  category_id: NullableRef<string>;
  id: string;
  name: string;
  product_catalog_variants: {
    id: string;
    base_unit: string;
    base_quantity: number;
    image_url: NullableRef<string>;
    product_brands: { name: string }[];
    reference_price: NullableRef<number>;
    reference_store_name: NullableRef<string>;
    stores: NullableRef<{ display_name: string }>;
  }[];
}): NullableRef<MyProduct> => {
  const [firstVariant] = productRow.product_catalog_variants;
  if (!firstVariant || productRow.category_id === null) return null;

  return {
    ...toCatalogProduct(productRow),
    editable: {
      baseQuantity: firstVariant.base_quantity,
      // base_unit es text en la base; el check de la migración garantiza que es uno de los valores de CATALOG_BASE_UNIT.
      baseUnit: firstVariant.base_unit as CatalogBaseUnitType,
      brandName: firstVariant.product_brands[0]?.name ?? null,
      categoryId: productRow.category_id,
      name: productRow.name,
      productId: productRow.id,
    },
  };
};

/** Productos `source = 'manual'` donde `column = value` (household_id u owner_id). */
const queryManualProductsBy = async (
  column: typeof MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID | typeof MY_PRODUCTS_DB.COLUMN.OWNER_ID,
  value: string,
): Promise<MyProduct[]> => {
  const { data: productRows, error } = await getSupabaseClient()
    .from(MY_PRODUCTS_DB.TABLE.PRODUCT_CATALOG)
    .select(MY_PRODUCTS_DB.SELECT)
    .eq(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL)
    .eq(column, value)
    // HU-58: un producto eliminado que seguía en uso queda archivado y ya no se lista.
    .is(MY_PRODUCTS_DB.COLUMN.ARCHIVED_AT, null)
    .order(MY_PRODUCTS_DB.COLUMN.NAME);
  if (error) throw error;

  return productRows.map(toMyProduct).filter((product): product is MyProduct => product !== null);
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
export const listMyProducts = async (): Promise<MyProduct[]> => {
  const session = await getStoredSession();
  if (!session) return [];

  const householdId = await getHouseholdIdOf(session);

  const [byHousehold, byOwner] = await Promise.all([
    householdId
      ? queryManualProductsBy(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID, householdId)
      : Promise.resolve<MyProduct[]>([]),
    queryManualProductsBy(MY_PRODUCTS_DB.COLUMN.OWNER_ID, session.user.id),
  ]);

  return [...byHousehold, ...byOwner].sort((productA, productB) =>
    productA.productName.localeCompare(productB.productName),
  );
};
