import { CATALOG_DB } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { CatalogProduct, CatalogSearchVariantRow } from "@/types/catalog.types";

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
      variantId: variant.variant_id,
    })),
  }));
};
