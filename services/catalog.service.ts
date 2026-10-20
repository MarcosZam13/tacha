import { CATALOG_DB } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { CatalogProduct, CatalogSearchVariantRow, Category, PriceRange } from "@/types/catalog.types";

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
