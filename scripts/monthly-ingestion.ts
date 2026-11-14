/* eslint-disable no-console -- CLI de mantenimiento: la consola es su única salida (progreso y reporte de storage). */
/**
 * Script manual de ingesta mensual del catálogo (SCRUM-132). Ver
 * supabase/specs/SCRUM-132/{SPEC,plan}.md para el detalle completo.
 *
 * Para cada madre curada de supabase/data/madres.json y cada una de las 3
 * tiendas: llama a la Edge Function `ingest-{tienda}` ya desplegada (exige
 * service role key desde SCRUM-130), normaliza las filas nuevas, recorta su
 * raw_json a lo que el normalizador necesita, y recién entonces sigue con el
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

const LOCAL_ENV_FILE = ".env.local";

const STAGING_TABLE = "product_catalog_staging";

const STAGING_STATUS = {
  pending: "pending",
  matched: "matched",
  rejected: "rejected",
} as const;

// La secret key nueva de Supabase; el JWT legacy (eyJ...) da 403 en ingest-*.
const SECRET_KEY_PREFIX = "sb_secret_";

// La service key solo se manda a un proyecto de Supabase por https.
const SUPABASE_HOST_SUFFIX = ".supabase.co";

// Tope de caracteres del cuerpo de error de una Edge Function que se imprime.
const MAX_ERROR_BODY_CHARS = 200;

// PostgREST devuelve como máximo 1000 filas por consulta: el reporte de
// storage lee por páginas.
const STORAGE_REPORT_PAGE_SIZE = 1_000;

const BYTES_PER_MB = 1024 * 1024;

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

  if (!serviceRoleKey.startsWith(SECRET_KEY_PREFIX)) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY tiene que ser la secret key (${SECRET_KEY_PREFIX}...), no el JWT legacy — ver supabase/README.md.`,
    );
  }

  // No mandar la service key a cualquier host por un .env.local equivocado.
  const { protocol, hostname } = new URL(supabaseUrl);
  if (protocol !== "https:" || !hostname.endsWith(SUPABASE_HOST_SUFFIX)) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL tiene que ser https://<proyecto>${SUPABASE_HOST_SUFFIX}.`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  return { supabase, supabaseUrl, serviceRoleKey };
}

// --- Paso 1: ingestar un término contra una tienda ----------------------

const IngestResultSchema = z.object({
  source: z.enum(["cache", "live", "stale-cache"]),
  store: z.enum(STORES),
  query: z.string(),
  stagedCount: z.number().int().nonnegative(),
  warning: z.string().optional(),
});

type IngestResult = z.infer<typeof IngestResultSchema>;

// Forma de raw_json que lee este script: la completa de stageProducts o la
// recortada (mismas claves, solo los campos que usa el normalizador).
interface StagingRawJson {
  product?: { productName?: string; categories?: string[] };
  item?: { itemId?: string; ean?: string };
  offer?: { Price?: number; IsAvailable?: boolean };
}

interface StagingRow {
  id: string;
  raw_json: StagingRawJson | null;
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
    const body = (await response.text()).slice(0, MAX_ERROR_BODY_CHARS);
    throw new Error(`ingest-${store} devolvió ${response.status} para "${term}": ${body}`);
  }

  return IngestResultSchema.parse(await response.json());
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
): Promise<{ deduped: number; keptIds: string[] }> {
  if (stagedCount === 0) return { deduped: 0, keptIds: [] };

  const { data, error } = await supabase
    .from(STAGING_TABLE)
    .select("id, raw_json")
    .eq("store_id", store.id)
    .eq("status", STAGING_STATUS.pending)
    .order("scraped_at", { ascending: false })
    .limit(stagedCount)
    .returns<StagingRow[]>();

  if (error) {
    throw new Error(`No se pudieron leer las filas recién staged de '${store.slug}': ${error.message}`);
  }

  const seenItemIds = seenItemIdsByStore.get(store.slug) ?? new Set<string>();
  seenItemIdsByStore.set(store.slug, seenItemIds);

  const duplicateIds: string[] = [];
  const keptIds: string[] = [];

  for (const row of data ?? []) {
    const itemId = row.raw_json?.item?.itemId;
    // Sin itemId no hay cómo deduplicar con certeza — se deja pasar, igual
    // que ya acepta normalize_staging_row filas con datos incompletos.
    if (itemId && seenItemIds.has(itemId)) {
      duplicateIds.push(row.id);
      continue;
    }
    if (itemId) seenItemIds.add(itemId);
    keptIds.push(row.id);
  }

  if (duplicateIds.length > 0) {
    // Seguras de borrar: siguen 'pending', ninguna normalizada todavía, así
    // que no dejan huérfano ningún product_prices.
    const { error: deleteError } = await supabase
      .from(STAGING_TABLE)
      .delete()
      .in("id", duplicateIds);
    if (deleteError) {
      throw new Error(`No se pudieron borrar los duplicados de '${store.slug}': ${deleteError.message}`);
    }
  }

  return { deduped: duplicateIds.length, keptIds };
}

// --- Paso 3: normalizar solo las filas que staged este término -----------
// Fila por fila con normalize_staging_row, no con normalize_pending_staging:
// ese RPC toma las pending más viejas primero, y las filas sin madre curada
// se quedan pending para siempre — con 50 o más acumuladas, cada lote se
// llenaría con ellas y las filas nuevas nunca se normalizarían.

interface NormalizeTotals {
  matched: number;
  rejected: number;
  unmatched: number;
}

async function normalizeJustStaged(supabase: SupabaseClient, stagingIds: string[]): Promise<NormalizeTotals> {
  if (stagingIds.length === 0) return { matched: 0, rejected: 0, unmatched: 0 };

  for (const stagingId of stagingIds) {
    const { error } = await supabase.rpc("normalize_staging_row", { staging_id: stagingId });
    if (error) {
      throw new Error(`normalize_staging_row falló para ${stagingId}: ${error.message}`);
    }
  }

  // El resultado del RPC no distingue "rechazada" de "sin madre, sigue
  // pending" (ambas devuelven success = false): se cuenta por status final.
  const { data, error } = await supabase
    .from(STAGING_TABLE)
    .select("status")
    .in("id", stagingIds)
    .returns<{ status: string }[]>();
  if (error) {
    throw new Error(`No se pudo leer el resultado de la normalización: ${error.message}`);
  }

  const statuses = (data ?? []).map((row) => row.status);
  return {
    matched: statuses.filter((status) => status === STAGING_STATUS.matched).length,
    rejected: statuses.filter((status) => status === STAGING_STATUS.rejected).length,
    unmatched: statuses.filter((status) => status === STAGING_STATUS.pending).length,
  };
}

// --- Paso 4: recortar raw_json de las filas de este término --------------
// Todas, incluidas las 'pending' (plan.md §3): el recorte deja justo lo que
// lee normalize_staging_row (product.categories, offer.Price e IsAvailable)
// más item.itemId/ean para el dedupe, así que cualquier fila se puede volver
// a normalizar después sin el JSON completo de VTEX (~11 KB → ~0.3 KB). El
// nombre, la marca y el tamaño ya están en sus propias columnas. El filtro
// `raw_json->product->productName` distingue lo sin recortar.

async function trimProcessedRawJson(supabase: SupabaseClient, stagingIds: string[]): Promise<number> {
  if (stagingIds.length === 0) return 0;

  const { data: candidates, error: selectError } = await supabase
    .from(STAGING_TABLE)
    .select("id, raw_json")
    .in("id", stagingIds)
    .not("raw_json->product->productName", "is", null)
    .returns<StagingRow[]>();

  if (selectError) {
    throw new Error(`No se pudieron leer las filas a recortar: ${selectError.message}`);
  }
  if (!candidates || candidates.length === 0) return 0;

  for (const row of candidates) {
    const trimmed: StagingRawJson = {
      product: { categories: row.raw_json?.product?.categories ?? [] },
      item: { itemId: row.raw_json?.item?.itemId, ean: row.raw_json?.item?.ean },
      offer: { Price: row.raw_json?.offer?.Price, IsAvailable: row.raw_json?.offer?.IsAvailable },
    };

    const { error: updateError } = await supabase
      .from(STAGING_TABLE)
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
  let rowCount = 0;
  let totalBytes = 0;

  for (let from = 0; ; from += STORAGE_REPORT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from(STAGING_TABLE)
      .select("raw_json")
      .order("id")
      .range(from, from + STORAGE_REPORT_PAGE_SIZE - 1);
    if (error) {
      console.warn(`No se pudo generar el reporte de storage (${label}): ${error.message}`);
      return;
    }

    const rows = data ?? [];
    rowCount += rows.length;
    totalBytes += rows.reduce((sum, row) => sum + JSON.stringify(row.raw_json ?? {}).length, 0);
    if (rows.length < STORAGE_REPORT_PAGE_SIZE) break;
  }

  console.log(
    `[storage ${label}] ${rowCount} filas en ${STAGING_TABLE}, ~${(totalBytes / BYTES_PER_MB).toFixed(2)} MB de raw_json (aproximado)`,
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
  let totalUnmatched = 0;
  let totalTrimmed = 0;

  for (const madre of madres) {
    const termStagingIds: string[] = [];

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
        const { deduped, keptIds } = await dedupeJustStaged(
          supabase,
          storeContext,
          result.stagedCount,
          seenItemIdsByStore,
        );
        totalDeduped += deduped;
        termStagingIds.push(...keptIds);
      }

      await sleep(PACE_BETWEEN_CALLS_MS);
    }

    // Normalizar y recortar por término (plan.md §1), no al final de todo.
    const { matched, rejected, unmatched } = await normalizeJustStaged(supabase, termStagingIds);
    console.log(`  ${madre.name}: matched=${matched} rejected=${rejected} sin-madre=${unmatched}`);
    totalMatched += matched;
    totalRejected += rejected;
    totalUnmatched += unmatched;
    totalTrimmed += await trimProcessedRawJson(supabase, termStagingIds);
  }

  await reportStagingStorageUsage(supabase, "después");

  console.log(
    `Listo. matched=${totalMatched} rejected=${totalRejected} sin-madre=${totalUnmatched} ` +
      `duplicados-borrados=${totalDeduped} filas-recortadas=${totalTrimmed}`,
  );
}

main().catch((error) => {
  console.error("Falló la ingesta mensual:", error);
  process.exitCode = 1;
});
