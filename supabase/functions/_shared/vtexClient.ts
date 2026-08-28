// Responsabilidad única: hablar con VTEX. Este archivo no sabe que Supabase
// existe — recibe una config de tienda y un término, devuelve productos
// tipados. Si VTEX cambiara su forma de responder, solo este archivo cambia.

import type { StoreConfig, VtexProduct } from "./types.ts";

const MAX_RESULTS = 50; // VTEX pagina de a 50 (_from/_to) como máximo por página

export async function fetchFromVtex(store: StoreConfig, normalizedQuery: string): Promise<VtexProduct[]> {
  const url = `${store.searchBaseUrl}?ft=${encodeURIComponent(normalizedQuery)}&_from=0&_to=${MAX_RESULTS - 1}`;

  let lastError: unknown;
  // Un reintento simple ante fallos transitorios (timeouts, 5xx puntuales).
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Tacha-Catalog/1.0 (+contacto: salasdaniel2505@gmail.com)",
          Accept: "application/json",
        },
      });
      if (!resp.ok) {
        throw new Error(`${store.displayName} respondió ${resp.status}`);
      }
      return await resp.json();
    } catch (err) {
      lastError = err;
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // pequeña espera antes de reintentar
      }
    }
  }
  throw lastError;
}

// Responsabilidad única: dado un item de VTEX, elegir la oferta correcta.
// No asumimos sellers[0] a ciegas — priorizamos el seller marcado como
// default, y si no hay ninguno marcado, el primero que tenga stock.
export function pickBestOffer(item: VtexProduct["items"][number]) {
  const sellers = item.sellers ?? [];
  const chosen =
    sellers.find((s) => s.sellerDefault) ??
    sellers.find((s) => s.commertialOffer?.IsAvailable) ??
    sellers[0];
  return chosen?.commertialOffer ?? null;
}
