import type { NullableRef } from "@/types/nullable.types";
import type { PurchasedProduct } from "./PurchasedProduct.interface";

// La lectura get_purchased_products (049, SPEC §12): lo que devuelve la base y
// lo que reciben los hooks. El adapter (utils/toPurchasedProductsPage.ts)
// convierte una en la otra.

// ----------------------------------------------------------------------------
// Lo que devuelve la RPC, tal cual. Es jsonb: la base no le da tipo, lo fija el
// contrato de la 049. Solo lo conoce el adapter.
// ----------------------------------------------------------------------------

export interface PurchasedProductRow {
  appearance_count: number;
  last_purchased_at: string;
  /** Solo si no está disponible (regla 96); si no, null. */
  product_catalog_variant_id: NullableRef<string>;
  /** El nombre normalizado (D39 y D40); null si no está disponible. */
  product_key: NullableRef<string>;
  /** D43; null si no está disponible. */
  product_name: NullableRef<string>;
}

export interface PurchasedProductsResponse {
  products: PurchasedProductRow[];
  /** Los productos que coinciden con la búsqueda, no solo los del bloque. */
  total_count: number;
}

// ----------------------------------------------------------------------------
// Lo que piden y reciben los hooks.
// ----------------------------------------------------------------------------

/** Un bloque de la lista (D35). El tamaño es fijo: PRODUCT_HISTORY.PAGE_SIZE. */
export interface PurchasedProductsQuery {
  /** Cuántos productos ya se cargaron: 0 para el primer bloque. */
  offset: number;
  /** Lo que escribió la persona. El servicio lo recorta (regla 93 y §7). */
  search: string;
}

export interface PurchasedProductsPage {
  /** En el orden de D33. */
  products: PurchasedProduct[];
  /** Los que coinciden con la búsqueda: "Cargar más" desaparece al llegar a este número. */
  totalCount: number;
}
