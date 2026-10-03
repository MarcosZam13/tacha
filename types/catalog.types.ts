import type { CatalogBaseUnitType } from "@/constants";

/**
 * Un producto madre del catálogo con sus variantes de tamaño, tal como lo
 * devuelve searchCatalog(). Cada feature lo adapta a lo que necesita: la
 * lista general añade variantes; recetas liga el ingrediente al producto madre.
 */
export interface CatalogProduct {
  productId: string;
  productName: string;
  variants: CatalogProductVariant[];
}

export interface CatalogProductVariant {
  baseQuantity: number;
  baseUnit: CatalogBaseUnitType;
  variantId: string;
}

/**
 * Forma de cada elemento de `variants` (jsonb) que devuelve la RPC
 * search_catalog. Solo los campos que se usan; se ignoran brands y price_ranges.
 */
export interface CatalogSearchVariantRow {
  base_quantity: number;
  base_unit: CatalogBaseUnitType;
  variant_id: string;
}

/** Rango de precio en colones, del más barato al más caro. */
export interface PriceRange {
  maxPrice: number;
  minPrice: number;
}
