import { APP_ROUTE } from "@/constants/routes.constants";
import { STORE_NAMES } from "@/constants/stores.constants";
import type { StoreSlug } from "@/constants/stores.constants";

// Constantes del catálogo compartidas entre features (hoy: lista general, recetas y catálogo).

// MIN_QUERY_LENGTH tiene que coincidir con min_search_length de la RPC
// search_catalog: por debajo la base devuelve 0 filas y no vale la pena llamarla.
// MAX_QUERY_LENGTH evita mandarle a la búsqueda por similitud un texto enorme.
export const PRODUCT_SEARCH = {
  DEBOUNCE_MS: 300,
  MAX_QUERY_LENGTH: 80,
  MIN_QUERY_LENGTH: 2,
} as const;

// Espejo del check de product_catalog_variants.base_unit en la base.
export const CATALOG_BASE_UNIT = {
  GRAMS: "g",
  MILLILITERS: "ml",
  UNIT: "unidad",
} as const;

export type CatalogBaseUnitType =
  (typeof CATALOG_BASE_UNIT)[keyof typeof CATALOG_BASE_UNIT];

// satisfies Record<CatalogBaseUnitType, ...> obliga a tener una etiqueta por
// cada unidad (si se agrega una unidad arriba, esto deja de compilar) sin
// perder los tipos literales de as const.
export const CATALOG_BASE_UNIT_LABEL = {
  [CATALOG_BASE_UNIT.GRAMS]: "g",
  [CATALOG_BASE_UNIT.MILLILITERS]: "ml",
  [CATALOG_BASE_UNIT.UNIT]: "u",
} as const satisfies Record<CatalogBaseUnitType, string>;

// Precios del catálogo: colones, sin decimales (los súper no cobran céntimos).
export const PRICE_FORMAT = {
  CURRENCY: "CRC",
  LOCALE: "es-CR",
  MAX_FRACTION_DIGITS: 0,
  RANGE_SEPARATOR: " – ",
} as const;

export const CATALOG_DB = {
  RPC: {
    LIST_CATALOG_BY_CATEGORY: "list_catalog_by_category",
    SEARCH_CATALOG: "search_catalog",
  },
  TABLE: {
    VARIANTS: "product_catalog_variants",
  },
  // Detalle de una variante (SCRUM-85): su producto madre, sus marcas y el
  // último precio de cada marca en cada tienda — mismo patrón que
  // SHOPPING_LIST_DB.ITEM_DETAIL_SELECT, con el slug de tienda agregado
  // (catalog-product-detail sí necesita elegir el ícono por tienda).
  VARIANT_DETAIL_SELECT:
    "base_quantity, base_unit, image_url, product_catalog(name), product_brands(name, logo_url), latest_prices(price, stores(slug, display_name))",
} as const;

// Espejo del check de product_catalog.source: "manual" son los productos que
// cargó un household (SCRUM-86); "scraped" los que trae el scraping.
export const CATALOG_SOURCE = {
  MANUAL: "manual",
  SCRAPED: "scraped",
} as const;

export type CatalogSourceType = (typeof CATALOG_SOURCE)[keyof typeof CATALOG_SOURCE];

// CatalogProduct.category (HU-52) cuando el producto no tiene categoría
// asignada todavía (hoy solo "Mis productos", SCRUM-86): no hay fila de
// categories para "sin categoría", así que no se inventa un nombre.
export const CATALOG_CATEGORY_TEXT = {
  UNASSIGNED: "",
} as const;

// "Leche — 1L": producto y tamaño, sin marca (documento-proyecto §4.5). Se
// promovió aquí en SCRUM-86, cuando "Mis productos" se volvió el segundo
// consumidor de CatalogCard.
export const CATALOG_CARD = {
  TITLE_SEPARATOR: " — ",
} as const;

// Ruta del detalle de un producto (SCRUM-85, plan.md §1.4): la usan
// CatalogCard (envuelta en Link) y la propia ruta app/(app)/catalogo/producto/[variantId]/.
export const CATALOG_PRODUCT_DETAIL_ROUTE = (variantId: string): string =>
  `${APP_ROUTE.CATALOG}/producto/${variantId}`;

export const CATALOG_CARD_TEXT = {
  NO_PRICE: "Sin precio disponible",
} as const;

export const PRODUCT_SEARCH_TEXT = {
  LABEL: "Buscar producto",
  NO_RESULTS: "No encontramos productos con ese nombre.",
  PLACEHOLDER: "Busca un producto, ej. leche",
  SEARCH_ERROR: "No se pudo buscar en el catálogo. Intenta de nuevo.",
} as const;

// Los 3 SVG de tienda ya comiteados en public/store-icons/ (SCRUM-85): solo
// 3 tiendas fijas y conocidas, cero necesidad de columna en la base (plan.md §4).
export const STORE_ICON_PATH_BY_SLUG = {
  [STORE_NAMES.MASXMENOS]: "/store-icons/masxmenos.svg",
  [STORE_NAMES.MAXIPALI]: "/store-icons/maxipali.svg",
  [STORE_NAMES.WALMART]: "/store-icons/walmart.svg",
} as const satisfies Record<StoreSlug, string>;
