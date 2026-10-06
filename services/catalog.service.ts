import { CATALOG_DB } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { CatalogProduct, CatalogSearchVariantRow, PriceRange } from "@/types/catalog.types";

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
 * Busca en el catálogo y devuelve productos madre con sus variantes. No
 * aplana: si la pantalla necesita una fila por variante (lista general) lo
 * hace su feature; recetas usa el producto madre directo.
 */
export const searchCatalog = async (searchTerm: string): Promise<CatalogProduct[]> => {
  const { data: products, error } = await getSupabaseClient().rpc(CATALOG_DB.RPC.SEARCH_CATALOG, {
    search_term: searchTerm,
  });
  if (error) throw error;

  return products.map((product) => ({
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
};
