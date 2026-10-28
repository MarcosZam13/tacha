import { CATALOG_DB, POSTGRES_ERROR_CODE } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import type {
  CatalogProduct,
  CatalogSearchVariantRow,
  CatalogVariantDetail,
  Category,
  PriceRange,
  StorePrice,
} from "@/types/catalog.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { toStorePriceRanges } from "@/utils/toStorePriceRanges";

/**
 * Adapter del jsonb de la RPC: se queda solo con las tiendas que tienen
 * mínimo y máximo, así quien lo use nunca maneja null ni muestra "₡0".
 */
const toPriceRangeByStore = (
  priceRanges: CatalogSearchVariantRow["price_ranges"],
): Record<string, PriceRange> =>
  Object.fromEntries(
    Object.entries(priceRanges ?? {}).flatMap(([storeSlug, { max, min }]): [string, PriceRange][] =>
      max !== null && min !== null ? [[storeSlug, { maxPrice: max, minPrice: min }]] : [],
    ),
  );

/**
 * Mapea la forma de fila que devuelven tanto search_catalog como
 * list_catalog_by_category (mismo contrato de salida) a CatalogProduct[].
 */
const toCatalogProducts = (
  products: ReadonlyArray<{
    category: string;
    name: string;
    product_catalog_id: string;
    variants: unknown;
  }>,
): CatalogProduct[] =>
  products.map((product) => ({
    category: product.category,
    productId: product.product_catalog_id,
    productName: product.name,
    // variants es jsonb: la base no le da tipo, lo fija el contrato de la RPC.
    variants: (product.variants as unknown as CatalogSearchVariantRow[]).map((variant) => ({
      baseQuantity: variant.base_quantity,
      baseUnit: variant.base_unit,
      imageUrl: variant.image_url,
      priceRangeByStore: toPriceRangeByStore(variant.price_ranges),
      variantId: variant.variant_id,
    })),
  }));

/**
 * Busca en el catálogo y devuelve productos madre con sus variantes. No
 * aplana: si la pantalla necesita una fila por variante (lista general) lo
 * hace su feature; recetas usa el producto madre directo.
 */
export const searchCatalog = async (searchTerm: string): Promise<CatalogProduct[]> => {
  const { data: products, error } = await getSupabaseClient().rpc(CATALOG_DB.RPC.SEARCH_CATALOG, {
    search_term: searchTerm,
  });
  if (error) throw error;

  return toCatalogProducts(products);
};

/**
 * Catálogo global, opcionalmente filtrado por categoría (HU-52). A
 * diferencia de searchCatalog(), no hay mínimo de caracteres: es un listado,
 * no una búsqueda por texto. `categoryId: null` trae todo el catálogo.
 */
export const listCatalogByCategory = async (categoryId: string | null): Promise<CatalogProduct[]> => {
  const { data: products, error } = await getSupabaseClient().rpc(CATALOG_DB.RPC.LIST_CATALOG_BY_CATEGORY, {
    filter_category_id: categoryId ?? undefined,
  });
  if (error) throw error;

  return toCatalogProducts(products);
};

/**
 * Categorías del catálogo (HU-52), lectura directa a `categories` (sin RPC:
 * es lectura pública, sin agregación que justifique una función). Las usan
 * los chips de esta pantalla y, más adelante, el selector de SCRUM-87.
 */
export const getCategories = async (): Promise<Category[]> => {
  const { data: categories, error } = await getSupabaseClient()
    .from("categories")
    .select("id, name")
    .order("name");
  if (error) throw error;

  return categories;
};

/**
 * Detalle completo de una variante (SCRUM-85): sus marcas y el precio
 * aproximado por supermercado, lo que la tarjeta de catálogo no muestra.
 * Lectura directa (mismo patrón que getItemDetail de SCRUM-64, sin RPC
 * nueva): no se toca search_catalog ni su contrato (SPEC.md §10).
 *
 * Devuelve null si no se encontró: no existe, se borró, o el id de la URL no
 * es un uuid (mismo patrón que getRecipeForEditing, SCRUM-95) — las tres dan
 * el mismo resultado, que la pantalla traduce al CA-07 "producto no
 * encontrado" sin un error genérico.
 */
export const getCatalogVariantDetail = async (
  variantId: string,
): Promise<NullableRef<CatalogVariantDetail>> => {
  const { data: variant, error } = await getSupabaseClient()
    .from(CATALOG_DB.TABLE.VARIANTS)
    .select(CATALOG_DB.VARIANT_DETAIL_SELECT)
    .eq("id", variantId)
    .maybeSingle();
  if (error?.code === POSTGRES_ERROR_CODE.INVALID_TEXT_REPRESENTATION) return null;
  if (error) throw error;
  if (!variant) return null;

  const storePrices: StorePrice[] = variant.latest_prices.flatMap(({ price, stores }) =>
    price !== null && stores
      ? [{ price, storeName: stores.display_name, storeSlug: stores.slug }]
      : [],
  );

  return {
    brands: variant.product_brands.map((brand) => ({ logoUrl: brand.logo_url, name: brand.name })),
    imageUrl: variant.image_url,
    productName: variant.product_catalog.name,
    // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
    sizeLabel: formatSizeLabel(variant.base_quantity, variant.base_unit as CatalogBaseUnitType),
    storePriceRanges: toStorePriceRanges(storePrices),
    variantId,
  };
};
