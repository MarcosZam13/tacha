// Responsabilidad única: saber qué tiendas soporta el pipeline y su URL base
// de VTEX. Alcance confirmado: exactamente estas 3, sin altas dinámicas
// (ver reporte AI-Generated Report/reporte-catalogo-scraping.md, sección 5.3).
// Los uuid de `id` deben coincidir con las filas sembradas por schema.sql.

import type { StoreConfig, StoreSlug } from "./types.ts";

// Los ids reales se resuelven en runtime contra la tabla `stores`
// (ver catalogRepository.getStoreBySlug) — este mapa solo trae el resto
// de la config estática por slug.
export const STORE_STATIC_CONFIG: Record<StoreSlug, Omit<StoreConfig, "id">> = {
  maxipali: {
    slug: "maxipali",
    displayName: "MaxiPali",
    searchBaseUrl: "https://www.maxipali.co.cr/api/catalog_system/pub/products/search",
  },
  walmart: {
    slug: "walmart",
    displayName: "Walmart Costa Rica",
    searchBaseUrl: "https://www.walmart.co.cr/api/catalog_system/pub/products/search",
  },
  masxmenos: {
    slug: "masxmenos",
    displayName: "MasXMenos",
    searchBaseUrl: "https://www.masxmenos.cr/api/catalog_system/pub/products/search",
  },
};
