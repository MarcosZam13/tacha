/**
 * Script manual de ingesta mensual del catálogo (SCRUM-132). Ver
 * supabase/specs/SCRUM-132/{SPEC,plan}.md para el detalle completo.
 *
 * Para cada madre curada de supabase/data/madres.json y cada una de las 3
 * tiendas: llama a la Edge Function `ingest-{tienda}` ya desplegada (exige
 * service role key desde SCRUM-130), normaliza lo que quedó pending, recorta
 * el raw_json de lo que ya matcheó/rechazó, y recién entonces sigue con el
 * próximo término — nunca por corrida completa, para no acumular raw_json de
 * filas que no se van a usar si el proceso se corta a la mitad (plan.md §1).
 *
 * Dentro de una misma corrida, el mismo SKU de VTEX (itemId) encontrado por
 * dos términos no debe generar dos filas de product_prices: normalize_staging_row
 * (migración 002) inserta en product_prices sin ningún upsert/constraint que
 * lo evite, así que el dedupe tiene que pasar antes de normalizar, a nivel de
 * staging (plan.md §4) — ver dedupeJustStaged().
 *
 * Decisión de implementación (plan.md §3, dejado abierto ahí): el recorte de
 * raw_json se hace con un `update` directo desde este script, con la service
 * role key, no con un RPC nuevo — es un script de mantenimiento de confianza
 * (ya necesita la service role key para todo lo demás), no código de cliente
 * expuesto a RLS, así que no gana nada envolviéndolo en una función.
 *
 * No programado todavía (ticket aparte): se corre a mano, con autorización
 * explícita de Daniel cada vez (escribe en la base compartida) y avisando al
 * grupo el día antes de una corrida real contra todas las madres.
 *
 * Uso:
 *   npx tsx scripts/monthly-ingestion.ts              # las 12 madres actuales
 *   npx tsx scripts/monthly-ingestion.ts --limit=2    # solo las primeras 2 (prueba)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// --- Constantes propias de este script ---------------------------------
// No van al barrel de constants/: ese barrel es para componentes/hooks/lógica
// de negocio de la app Next.js (.agents/skills/constants-standards/SKILL.md
// §1). Este script corre fuera del bundle, vía tsx, igual que
// scripts/generate-madres-migration.ts, y no comparte consumidores con la
// app — es el mismo criterio ya aplicado ahí.

const STORES = ["maxipali", "walmart", "masxmenos"] as const;
type StoreSlug = (typeof STORES)[number];

// Pausa entre llamadas a los súpers, para no parecer un ataque (SPEC §3).
const PACE_BETWEEN_CALLS_MS = 1_500;

// Tope por llamada a normalize_pending_staging (mismo default del RPC,
// ver supabase/migrations/002_add_normalize_staging_functions.sql).
const NORMALIZE_BATCH_SIZE = 50;

// Salvavidas: nunca más de esta cantidad de vueltas normalizando pending en
// un solo término — evita un loop infinito si algo deja filas atascadas.
const MAX_NORMALIZE_ROUNDS_PER_TERM = 200;

const LOCAL_ENV_FILE = ".env.local";

// --- Carga de madres.json (mismo esquema que generate-madres-migration.ts) --
// No se importa ese archivo: su main() corre como efecto de solo importarlo
// (imprime SQL a stdout), y tocarlo para agregar un guard queda fuera del
// alcance de este ticket.

const MadreSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  match_keywords: z.array(z.string().min(1)),
  exclude_keywords: z.array(z.string()),
  vtex_category_prefix: z.string().min(1),
});

const MadresFileSchema = z.array(MadreSchema).min(1);

type Madre = z.infer<typeof MadreSchema>;

function loadMadres(): Madre[] {
  const jsonUrl = new URL("../supabase/data/madres.json", import.meta.url);
  const jsonPath = fileURLToPath(jsonUrl);
  const raw = readFileSync(jsonPath, "utf-8");
  return MadresFileSchema.parse(JSON.parse(raw));
}

// --- Config y cliente de Supabase ---------------------------------------

function loadLocalEnv(): void {
  try {
    process.loadEnvFile(LOCAL_ENV_FILE);
  } catch {
    // Sin .env.local (ej. CI) las variables tienen que venir del entorno.
    // Mismo patrón que e2e/support/supabase.ts.
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta ${name} en .env.local. No se corre el batch sin ella — revisar .env.example.`,
    );
  }
  return value;
}

function createAdminClient(): { supabase: SupabaseClient; supabaseUrl: string; serviceRoleKey: string } {
  loadLocalEnv();

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (serviceRoleKey.startsWith("NEXT_PUBLIC")) {
    // Defensivo: no debería pasar nunca si el nombre de la variable es el
    // correcto, pero una service role key con ese prefijo terminaría en el
    // bundle del cliente (security-practices §5) — cortar antes de usarla.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no puede tener prefijo NEXT_PUBLIC_.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  return { supabase, supabaseUrl, serviceRoleKey };
}

// --- Paso 1: ingestar un término contra una tienda ----------------------

interface IngestResult {
  source: "cache" | "live" | "stale-cache";
  store: StoreSlug;
  query: string;
  stagedCount: number;
  warning?: string;
}

async function ingestTerm(
  supabaseUrl: string,
  serviceRoleKey: string,
  store: StoreSlug,
  term: string,
): Promise<IngestResult> {
  const response = await fetch(`${supabaseUrl}/functions/v1/ingest-${store}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: term }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ingest-${store} devolvió ${response.status} para "${term}": ${body}`);
  }

  return (await response.json()) as IngestResult;
}

// --- Paso 2: dedupe por itemId dentro de esta corrida --------------------
// stageProducts (catalogRepository.ts) inserta una fila de staging por cada
// item de VTEX sin deduplicar entre llamadas — correcto para su uso actual
// (cache por término), pero dentro de UNA corrida de este script el mismo
// SKU puede aparecer vía dos madres distintas. Se identifican las filas que
// ingestTerm() acaba de insertar por las más recientes `stagedCount` filas
// pending de esa tienda (scraped_at desc) — asunción válida porque el script
// es secuencial, nunca concurrente (ver plan.md §4).

interface StoreContext {
  slug: StoreSlug;
  id: string;
}

async function getStoreContext(supabase: SupabaseClient, slug: StoreSlug): Promise<StoreContext> {
  const { data, error } = await supabase.from("stores").select("id").eq("slug", slug).single();
  if (error || !data) {
    throw new Error(`No se encontró la tienda '${slug}' en la tabla stores: ${error?.message ?? "sin fila"}`);
  }
  return { slug, id: data.id as string };
}

async function dedupeJustStaged(
  supabase: SupabaseClient,
  store: StoreContext,
  stagedCount: number,
  seenItemIdsByStore: Map<StoreSlug, Set<string>>,
): Promise<{ deduped: number }> {
  if (stagedCount === 0) return { deduped: 0 };

  const { data, error } = await supabase
    .from("product_catalog_staging")
    .select("id, raw_json")
    .eq("store_id", store.id)
    .eq("status", "pending")
    .order("scraped_at", { ascending: false })
    .limit(stagedCount);

  if (error) {
    throw new Error(`No se pudieron leer las filas recién staged de '${store.slug}': ${error.message}`);
  }

  const seenItemIds = seenItemIdsByStore.get(store.slug) ?? new Set<string>();
  seenItemIdsByStore.set(store.slug, seenItemIds);

  const duplicateIds: string[] = [];

  for (const row of data ?? []) {
    const itemId = row.raw_json?.item?.itemId as string | undefined;
    // Sin itemId no hay cómo deduplicar con certeza — se deja pasar, igual
    // que ya acepta normalize_staging_row filas con datos incompletos.
    if (!itemId) continue;

    if (seenItemIds.has(itemId)) {
      duplicateIds.push(row.id as string);
    } else {
      seenItemIds.add(itemId);
    }
  }

  if (duplicateIds.length > 0) {
    // Seguras de borrar: siguen 'pending', ninguna normalizada todavía, así
    // que no dejan huérfano ningún product_prices.
    const { error: deleteError } = await supabase
      .from("product_catalog_staging")
      .delete()
      .in("id", duplicateIds);
    if (deleteError) {
      throw new Error(`No se pudieron borrar los duplicados de '${store.slug}': ${deleteError.message}`);
    }
  }

  return { deduped: duplicateIds.length };
}

// --- Paso 3: normalizar solo lo pending de esta corrida -------------------

async function normalizeAllPending(supabase: SupabaseClient): Promise<{ matched: number; rejected: number }> {
  let totalMatched = 0;
  let totalRejected = 0;

  for (let round = 0; round < MAX_NORMALIZE_ROUNDS_PER_TERM; round++) {
    const { data, error } = await supabase.rpc("normalize_pending_staging", {
      batch_size: NORMALIZE_BATCH_SIZE,
    });
    if (error) {
      throw new Error(`normalize_pending_staging falló: ${error.message}`);
    }

    const result = (Array.isArray(data) ? data[0] : data) as
      | { processed: number; matched: number; rejected: number }
      | undefined;
    if (!result || result.processed === 0) break;

    totalMatched += result.matched;
    totalRejected += result.rejected;
  }

  return { matched: totalMatched, rejected: totalRejected };
}

// --- Paso 4: recortar raw_json de lo que ya matcheó/rechazó --------------
// Nunca toca filas 'pending' (plan.md §3): esas necesitan el raw_json
// completo para cuando se vuelvan a intentar en una corrida futura, o para
// que un humano revise por qué no matchearon. El filtro `raw_json->'item'`
// distingue lo sin recortar (forma completa de stageProducts: product/item/
// offer) de lo ya recortado (solo itemId/ean/price) — así la operación es
// idempotente y se puede repetir en cada vuelta del ciclo sin reprocesar.

async function trimProcessedRawJson(supabase: SupabaseClient): Promise<number> {
  const { data: candidates, error: selectError } = await supabase
    .from("product_catalog_staging")
    .select("id, raw_json")
    .in("status", ["matched", "rejected"])
    .not("raw_json->item", "is", null);

  if (selectError) {
    throw new Error(`No se pudieron leer las filas a recortar: ${selectError.message}`);
  }
  if (!candidates || candidates.length === 0) return 0;

  for (const row of candidates) {
    const item = row.raw_json?.item ?? {};
    const offer = row.raw_json?.offer ?? {};
    const trimmed = {
      itemId: item.itemId ?? null,
      ean: item.ean ?? null,
      price: offer.Price ?? null,
    };

    const { error: updateError } = await supabase
      .from("product_catalog_staging")
      .update({ raw_json: trimmed })
      .eq("id", row.id);
    if (updateError) {
      throw new Error(`No se pudo recortar raw_json de ${row.id}: ${updateError.message}`);
    }
  }

  return candidates.length;
}

// --- Reporte de uso de storage (criterio de aceptación §2) ---------------
// Aproximado (longitud del JSON serializado, no pg_column_size real) —
// alcanza para ver el efecto del recorte sin necesitar un RPC nuevo.

async function reportStagingStorageUsage(supabase: SupabaseClient, label: string): Promise<void> {
  const { data, error } = await supabase.from("product_catalog_staging").select("raw_json");
  if (error) {
    console.warn(`No se pudo generar el reporte de storage (${label}): ${error.message}`);
    return;
  }

  const rows = data ?? [];
  const totalBytes = rows.reduce((sum, row) => sum + JSON.stringify(row.raw_json ?? {}).length, 0);
  console.log(
    `[storage ${label}] ${rows.length} filas en product_catalog_staging, ~${(totalBytes / 1024 / 1024).toFixed(2)} MB de raw_json (aproximado)`,
  );
}

// --- CLI args --------------------------------------------------------------

function parseLimitArg(argv: string[]): number | null {
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) return null;

  const value = Number(limitArg.split("=")[1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--limit inválido: "${limitArg}". Tiene que ser un entero positivo.`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Orquestador principal ------------------------------------------------

async function main(): Promise<void> {
  const limit = parseLimitArg(process.argv.slice(2));
  const { supabase, supabaseUrl, serviceRoleKey } = createAdminClient();

  const allMadres = loadMadres();
  const madres = limit ? allMadres.slice(0, limit) : allMadres;

  console.log(
    `Corriendo ingesta para ${madres.length} de ${allMadres.length} madres x ${STORES.length} tiendas` +
      (limit ? ` (--limit=${limit}, corrida de prueba)` : ""),
  );

  await reportStagingStorageUsage(supabase, "antes");

  const seenItemIdsByStore = new Map<StoreSlug, Set<string>>();
  const storeContexts = new Map<StoreSlug, StoreContext>();
  for (const store of STORES) {
    storeContexts.set(store, await getStoreContext(supabase, store));
  }

  let totalDeduped = 0;
  let totalMatched = 0;
  let totalRejected = 0;
  let totalTrimmed = 0;

  for (const madre of madres) {
    for (const store of STORES) {
      const storeContext = storeContexts.get(store)!;

      const result = await ingestTerm(supabaseUrl, serviceRoleKey, store, madre.name);
      console.log(
        `  ${madre.name} / ${store}: ${result.source}, stagedCount=${result.stagedCount}` +
          (result.warning ? ` (warning: ${result.warning})` : ""),
      );

      // Cache hit: no hay filas nuevas que deduplicar ni normalizar — ya se
      // procesaron en una corrida anterior.
      if (result.source === "live") {
        const { deduped } = await dedupeJustStaged(supabase, storeContext, result.stagedCount, seenItemIdsByStore);
        totalDeduped += deduped;
      }

      await sleep(PACE_BETWEEN_CALLS_MS);
    }

    // Normalizar y recortar por término (plan.md §1), no al final de todo.
    const { matched, rejected } = await normalizeAllPending(supabase);
    totalMatched += matched;
    totalRejected += rejected;
    totalTrimmed += await trimProcessedRawJson(supabase);
  }

  await reportStagingStorageUsage(supabase, "después");

  console.log(
    `Listo. matched=${totalMatched} rejected=${totalRejected} duplicados-borrados=${totalDeduped} filas-recortadas=${totalTrimmed}`,
  );
}

main().catch((error) => {
  console.error("Falló la ingesta mensual:", error);
  process.exitCode = 1;
});
