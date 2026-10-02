// Responsabilidad única: orquestar el flujo cache-first con TTL, combinando
// vtexClient (hablar con VTEX) y catalogRepository (hablar con Postgres).
// No sabe nada de HTTP — eso vive en cada entrypoint.
//
// Renombrado desde "searchProductsUseCase" a "ingestUseCase": ya no devuelve
// un catálogo "buscable" al usuario final (eso lo hace el servicio de lectura
// sobre product_catalog, vía PostgREST/RPC) — esta función solo alimenta el
// staging de scraping. Ver reporte, sección 5.4.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

import type { StoreConfig, IngestResponse } from "./types.ts";
import { fetchFromVtex } from "./vtexClient.ts";
import {
  getFreshCacheEntry,
  stageProducts,
  saveCacheEntry,
  logSearch,
  fetchStagingRows,
} from "./catalogRepository.ts";

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

export async function ingestProducts(
  supabase: SupabaseClient,
  store: StoreConfig,
  rawQuery: string,
): Promise<IngestResponse> {
  const normalized = normalizeQuery(rawQuery);

  const { cached, isFresh } = await getFreshCacheEntry(supabase, store.id, normalized);

  if (isFresh) {
    const rows = await fetchStagingRows(supabase, cached!.staging_ids);
    await logSearch(supabase, store.id, rawQuery, "cache", rows.length);
    return { source: "cache", store: store.slug, query: rawQuery, stagedCount: rows.length };
  }

  try {
    const vtexProducts = await fetchFromVtex(store, normalized);
    const stagingIds = await stageProducts(supabase, store.id, vtexProducts);
    await saveCacheEntry(supabase, store.id, normalized, stagingIds);
    await logSearch(supabase, store.id, rawQuery, "live", stagingIds.length);

    return { source: "live", store: store.slug, query: rawQuery, stagedCount: stagingIds.length };
  } catch (err) {
    if (cached) {
      const staleRows = await fetchStagingRows(supabase, cached.staging_ids);
      await logSearch(supabase, store.id, rawQuery, "stale-cache", staleRows.length);
      return {
        source: "stale-cache",
        store: store.slug,
        query: rawQuery,
        stagedCount: staleRows.length,
        warning: `No se pudo contactar a ${store.displayName}; mostrando el último dato disponible.`,
      };
    }
    throw err;
  }
}
