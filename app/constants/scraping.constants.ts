export const SCRAPING_SOURCE = {
  CACHE: "cache",
  LIVE: "live",
  STALE_CACHE: "stale-cache",
} as const;

export const SCRAPING_SOURCE_DISPLAY = {
  cache: "📦 Cache (sin llamar VTEX)",
  live: "🌐 En vivo (consultó VTEX)",
  "stale-cache": "⚠️ Cache antiguo (VTEX no respondió)",
} as const;

export const SCRAPING_SOURCE_COLOR = {
  cache: "bg-blue-100 text-blue-900 border-blue-300",
  live: "bg-green-100 text-green-900 border-green-300",
  "stale-cache": "bg-yellow-100 text-yellow-900 border-yellow-300",
} as const;

// FIX QA bug #5 (2026-09-04): la URL estaba hardcodeada acá y en otros 2
// archivos (useHouseholdStorePreferences.ts, y el GET directo a staging que
// ahora ya no existe, ver bug #4) en vez de usar la env var —
// contradice constants-standards ("zero magic strings"). Se centraliza en
// SUPABASE_URL, derivada de NEXT_PUBLIC_SUPABASE_URL, y las otras 2
// ubicaciones deben importar desde acá, no repetir el valor.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ifvwumejbfpowxlkjfiu.supabase.co";

export const EDGE_FUNCTION = {
  BASE_URL: `${SUPABASE_URL}/functions/v1`,
} as const;

export const SUPABASE_REST = {
  BASE_URL: `${SUPABASE_URL}/rest/v1`,
} as const;

export const SCRAPING_DEMO = {
  QUERY_MIN_LENGTH: 2,
  STAGING_TABLE_ROWS_LIMIT: 20,
} as const;

export type ScrapingSourceType =
  (typeof SCRAPING_SOURCE)[keyof typeof SCRAPING_SOURCE];
