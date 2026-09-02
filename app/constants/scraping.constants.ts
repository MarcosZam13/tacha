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

export const EDGE_FUNCTION = {
  BASE_URL: "https://ifvwumejbfpowxlkjfiu.supabase.co/functions/v1",
} as const;

export const SCRAPING_DEMO = {
  QUERY_MIN_LENGTH: 2,
  STAGING_TABLE_ROWS_LIMIT: 20,
} as const;

export type ScrapingSourceType =
  (typeof SCRAPING_SOURCE)[keyof typeof SCRAPING_SOURCE];
