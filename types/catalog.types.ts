import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

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
  imageUrl: NullableRef<string>;
  /** Rango de precio por tienda (clave: slug de la tienda). Solo trae tiendas con precio. */
  priceRangeByStore: Record<string, PriceRange>;
  variantId: string;
}

/**
 * Forma de cada elemento de `variants` (jsonb) que devuelve la RPC
 * search_catalog. Solo los campos que se usan; se ignora brands.
 */
export interface CatalogSearchVariantRow {
  base_quantity: number;
  base_unit: CatalogBaseUnitType;
  image_url: NullableRef<string>;
  /** Mínimo y máximo por tienda; null si la variante no tiene tiendas visibles. */
  price_ranges: NullableRef<Record<string, CatalogSearchPriceRangeRow>>;
  variant_id: string;
}

/** Precio mínimo y máximo de una variante en una tienda; null si no hay precio. */
export interface CatalogSearchPriceRangeRow {
  max: NullableRef<number>;
  min: NullableRef<number>;
}

/** Rango de precio en colones, del más barato al más caro. */
export interface PriceRange {
  maxPrice: number;
  minPrice: number;
}
