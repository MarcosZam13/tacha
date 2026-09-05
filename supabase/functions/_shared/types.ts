// Tipos compartidos entre todas las tiendas.
// Responsabilidad única de este archivo: describir la forma de los datos,
// nada de lógica.

export type StoreSlug = "maxipali" | "walmart" | "masxmenos";

export interface StoreConfig {
  id: string; // uuid de la fila en la tabla `stores`
  slug: StoreSlug;
  displayName: string;
  searchBaseUrl: string; // endpoint VTEX legacy Catalog System de esa tienda
}

// --- Forma de la respuesta de VTEX (igual en las 3 tiendas, mismo catálogo) ---

export interface VtexOffer {
  Price: number;
  ListPrice: number;
  IsAvailable: boolean;
  AvailableQuantity: number;
}

export interface VtexSeller {
  sellerId: string;
  sellerDefault: boolean;
  // OJO: el campo real de VTEX es "commertialOffer" (typo de VTEX, no nuestro) —
  // confirmado contra la respuesta real de la API. "commertOffer" (sin la "ial")
  // era un bug del diseño anterior: nunca hacía match y por eso nunca se guardaba
  // ningún precio.
  commertialOffer: VtexOffer;
}

export interface VtexItem {
  itemId: string;
  nameComplete?: string;
  ean?: string;
  images?: { imageUrl: string }[];
  sellers: VtexSeller[];
}

export interface VtexProduct {
  productId: string;
  productName: string;
  brand: string;
  brandId: number;
  linkText: string;
  categories: string[];
  items: VtexItem[];
}

// --- Forma de lo que devolvemos nosotros al frontend ---

export interface IngestResponse {
  source: "cache" | "live" | "stale-cache";
  store: StoreSlug;
  query: string;
  stagedCount: number;
  warning?: string;
}
