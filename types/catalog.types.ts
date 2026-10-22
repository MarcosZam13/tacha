import type { CatalogBaseUnitType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Un producto madre del catálogo con sus variantes de tamaño, tal como lo
 * devuelve searchCatalog(). Cada feature lo adapta a lo que necesita: la
 * lista general añade variantes; recetas liga el ingrediente al producto madre.
 */
export interface CatalogProduct {
  /** Nombre de la categoría del producto (HU-52); viene de search_catalog y list_catalog_by_category. */
  category: string;
  productId: string;
  productName: string;
  variants: CatalogProductVariant[];
}

/** Fila de la tabla categories (lectura directa, sin RPC — HU-52). */
export interface Category {
  id: string;
  name: string;
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

/**
 * Una tarjeta lista para dibujar: una variante (producto + tamaño), con los
 * textos ya armados. La devuelve toCatalogCards(); la dibuja CatalogCard.
 */
export interface CatalogCardData {
  /** Etiqueta opcional sobre la tarjeta (ej. "Agregado por mí" en "Mis productos"). */
  badgeLabel?: string;
  /** Id de la variante: es lo que identifica la tarjeta aunque cambie el orden de los resultados. */
  id: string;
  imageUrl: NullableRef<string>;
  /** Letra que se muestra cuando la variante no tiene foto. */
  placeholderInitial: string;
  /** "₡800 – ₡1 200", un solo precio si coinciden, o el aviso de que no hay precio. */
  priceLabel: string;
  /** "Leche — 1000 ml". Sin marca. */
  title: string;
}

/**
 * Último precio de una marca en una tienda, tal como lo devuelve el
 * servicio (lista general y detalle de producto, SCRUM-85).
 */
export interface StorePrice {
  price: number;
  storeName: string;
  /** Slug de la tienda (stores.slug), para elegir su ícono. Falta si quien
   * armó el precio no lo pidió (ej. el detalle de la lista general, que no
   * muestra íconos). */
  storeSlug?: string;
}

/** Precio más bajo y más alto entre las marcas de una tienda. */
export interface StorePriceRange {
  maxPrice: number;
  minPrice: number;
  storeName: string;
  storeSlug?: string;
}

/**
 * Una marca disponible de una variante (detalle de producto, SCRUM-85). Solo
 * informativa (SPEC.md §5.3): no afecta qué se agrega a la lista.
 * `logoUrl` null hoy para todas las marcas del catálogo (ver SPEC.md §15) —
 * se muestra el nombre solo (SPEC.md §5.8).
 */
export interface CatalogBrand {
  logoUrl: NullableRef<string>;
  name: string;
}

/**
 * Todo lo que la tarjeta de catálogo no muestra (SCRUM-85): marcas y precio
 * por supermercado de una variante puntual. La devuelve getCatalogVariantDetail().
 */
export interface CatalogVariantDetail {
  brands: CatalogBrand[];
  imageUrl: NullableRef<string>;
  productName: string;
  sizeLabel: string;
  storePriceRanges: StorePriceRange[];
  variantId: string;
}
