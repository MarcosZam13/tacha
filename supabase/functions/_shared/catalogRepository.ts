// Responsabilidad única: leer y escribir en Postgres. Este archivo no sabe
// que VTEX existe — recibe datos ya parseados y los persiste. Si mañana
// cambiamos de Supabase a otra base, solo este archivo cambia.
//
// A diferencia del diseño anterior, este repositorio YA NO escribe
// directamente a un catálogo "final" (products/skus) — el scraping solo
// llena product_catalog_staging (dato crudo, sin normalizar). La
// normalización hacia product_catalog/product_catalog_variants/product_brands
// es un proceso aparte, fuera del alcance de esta Edge Function (ver reporte
// AI-Generated Report/reporte-catalogo-scraping.md, sección 5.5 y 7).

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

import type { StoreConfig, StoreSlug, VtexProduct } from "./types.ts";
import { pickBestOffer } from "./vtexClient.ts";
import { STORE_STATIC_CONFIG } from "./stores.ts";

const TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function getStoreBySlug(supabase: SupabaseClient, slug: StoreSlug): Promise<StoreConfig> {
  const { data, error } = await supabase.from("stores").select("id, slug").eq("slug", slug).single();
  if (error || !data) {
    throw new Error(`No se encontró la tienda '${slug}' en la tabla stores — ¿corriste el seed de schema.sql?`);
  }
  return { id: data.id, ...STORE_STATIC_CONFIG[slug] };
}

export async function getFreshCacheEntry(supabase: SupabaseClient, storeId: string, normalizedQuery: string) {
  const { data: cached } = await supabase
    .from("search_cache")
    .select("staging_ids, cached_at")
    .eq("store_id", storeId)
    .eq("normalized_query", normalizedQuery)
    .maybeSingle();

  if (!cached) return { cached: null, isFresh: false };

  const isFresh = Date.now() - new Date(cached.cached_at).getTime() < TTL_MS;
  return { cached, isFresh };
}

// Inserta cada producto scrapeado como una o más filas de staging (una por
// marca+item, tal como VTEX lo entrega) — sin intentar decidir todavía a qué
// product_catalog_variants pertenece. Devuelve los ids de staging insertados.
export async function stageProducts(supabase: SupabaseClient, storeId: string, products: VtexProduct[]): Promise<string[]> {
  const stagingIds: string[] = [];

  for (const p of products) {
    for (const item of p.items ?? []) {
      const offer = pickBestOffer(item);

      const { data, error } = await supabase
        .from("product_catalog_staging")
        .insert({
          store_id: storeId,
          raw_json: { product: p, item, offer },
          scraped_name: p.productName,
          scraped_brand: p.brand,
          scraped_size_text: item.nameComplete ?? null,
          image_url: item.images?.[0]?.imageUrl ?? null,
          status: "pending",
        })
        .select("id")
        .single();

      if (!error && data) {
        stagingIds.push(data.id);
      }
    }
  }

  return stagingIds;
}

export async function saveCacheEntry(supabase: SupabaseClient, storeId: string, normalizedQuery: string, stagingIds: string[]) {
  await supabase.from("search_cache").upsert({
    store_id: storeId,
    normalized_query: normalizedQuery,
    staging_ids: stagingIds,
    cached_at: new Date().toISOString(),
  });
}

export async function logSearch(
  supabase: SupabaseClient,
  storeId: string,
  query: string,
  source: "cache" | "live" | "stale-cache",
  resultCount: number,
) {
  await supabase.from("search_log").insert({ store_id: storeId, query, source, result_count: resultCount });
}

// Trae de vuelta las filas de staging ya guardadas (para responder al
// cliente sin volver a golpear VTEX cuando el cache está fresco).
export async function fetchStagingRows(supabase: SupabaseClient, stagingIds: string[]) {
  if (!stagingIds || stagingIds.length === 0) return [];

  const { data } = await supabase
    .from("product_catalog_staging")
    .select("id, scraped_name, scraped_brand, scraped_size_text, image_url, raw_json, status")
    .in("id", stagingIds);

  return data ?? [];
}
