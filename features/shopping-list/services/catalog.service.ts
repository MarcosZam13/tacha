import { getSupabaseClient } from "@/services/supabase.client";
import { SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import type { CatalogSearchResult } from "../models/CatalogSearchResult.interface";
import type { CatalogSearchVariant } from "../models/CatalogSearchVariant.interface";
import { formatSizeLabel } from "../utils/formatSizeLabel";

/**
 * Busca en el catálogo y aplana la respuesta: la RPC devuelve un producto
 * madre con N variantes, y la pantalla necesita una fila por variante,
 * porque lo que se añade a la lista es la variante (list_items la referencia).
 */
export const searchCatalog = async (searchTerm: string): Promise<CatalogSearchResult[]> => {
  const { data: products, error } = await getSupabaseClient().rpc(SHOPPING_LIST_DB.RPC.SEARCH_CATALOG, {
    search_term: searchTerm,
  });
  if (error) throw error;

  return products.flatMap((product) =>
    // variants es jsonb: la base no le da tipo, lo fija el contrato de la RPC.
    (product.variants as unknown as CatalogSearchVariant[]).map((variant) => ({
      productName: product.name,
      sizeLabel: formatSizeLabel(variant.base_quantity, variant.base_unit),
      variantId: variant.variant_id,
    })),
  );
};
