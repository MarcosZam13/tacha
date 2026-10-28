/**
 * Lee supabase/data/madres.json (fuente de verdad, legible y versionada) y
 * genera el SQL plano de seed para migración 020_curated_mothers.sql:
 *   1. categories      — una fila por categoría distinta de la lista
 *   2. product_catalog — upsert por nombre (catálogo global, household_id null)
 *   3. product_mother_rules — una fila por madre, con sus reglas de matching
 *
 * Nunca ejecuta nada contra Supabase: solo imprime SQL a stdout. El SQL
 * generado se pega dentro de supabase/migrations/020_curated_mothers.sql —
 * ver docs/documento-proyecto.md §7 (decisión de arquitectura, 2026-10-09)
 * y supabase/specs/SCRUM-131/plan.md §2-3.
 *
 * Uso: npx tsx scripts/generate-madres-migration.ts > /tmp/madres-seed.sql
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const MadreRuleSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  match_keywords: z.array(z.string().min(1)),
  exclude_keywords: z.array(z.string()),
  vtex_category_prefix: z.string().min(1),
});

const MadresFileSchema = z.array(MadreRuleSchema).min(1);

type MadreRule = z.infer<typeof MadreRuleSchema>;

// Escapa comillas simples para armar literales SQL. Nunca se concatena input
// externo sin esto (ver .agents/skills/security-practices/SKILL.md §4) —
// aquí el "input" es madres.json, versionado en el repo y no input de
// usuario en producción, pero se escapa igual por si alguna madre futura
// trae un apóstrofe (ej. nombres con "D'Gari").
function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) return "'{}'::text[]";
  return `array[${values.map(sqlLiteral).join(", ")}]::text[]`;
}

function loadMadres(path: string): MadreRule[] {
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw);
  return MadresFileSchema.parse(parsed);
}

function generateCategoriesSql(madres: MadreRule[]): string {
  const categories = [...new Set(madres.map((m) => m.category))];
  const values = categories.map((c) => `  (${sqlLiteral(c)})`).join(",\n");
  return [
    "-- Seed de categorías (una por categoría distinta de la lista curada).",
    "insert into categories (name) values",
    values,
    "on conflict (name) do nothing;",
  ].join("\n");
}

function generateProductCatalogSql(madres: MadreRule[]): string {
  const values = madres
    .map(
      (m) =>
        `  (${sqlLiteral(m.name)}, (select id from categories where name = ${sqlLiteral(
          m.category
        )}), null, 'manual')`
    )
    .join(",\n");
  return [
    "-- Seed de product_catalog global con las madres curadas.",
    "-- Upsert por nombre: nunca duplica ni borra las 28 madres viejas",
    "-- (coinciden con la partial unique index idx_product_catalog_global_name,",
    "-- creada arriba en esta misma migración).",
    "insert into product_catalog (name, category_id, household_id, source) values",
    values,
    "on conflict (name) where household_id is null",
    "do update set category_id = excluded.category_id;",
  ].join("\n");
}

function generateMotherRulesSql(madres: MadreRule[]): string {
  const values = madres
    .map(
      (m) =>
        `  ((select id from product_catalog where name = ${sqlLiteral(
          m.name
        )} and household_id is null), ${sqlTextArray(m.match_keywords)}, ${sqlTextArray(
          m.exclude_keywords
        )}, ${sqlLiteral(m.vtex_category_prefix)})`
    )
    .join(",\n");
  return [
    "-- Seed de product_mother_rules — una fila por madre curada.",
    "-- Idempotente: borra las reglas de estas madres antes de insertar, para",
    "-- poder re-aplicar esta migración contra una base limpia sin duplicar.",
    "delete from product_mother_rules",
    "where product_catalog_id in (",
    "  select id from product_catalog where name = any(",
    `    ${sqlTextArray(madres.map((m) => m.name))}`,
    "  ) and household_id is null",
    ");",
    "",
    "insert into product_mother_rules (product_catalog_id, match_keywords, exclude_keywords, vtex_category_prefix) values",
    values,
    ";",
  ].join("\n");
}

function main(): void {
  const jsonUrl = new URL("../supabase/data/madres.json", import.meta.url);
  const jsonPath = fileURLToPath(jsonUrl);
  const madres = loadMadres(jsonPath);

  const sql = [
    "-- ============================================================================",
    "-- Generado por scripts/generate-madres-migration.ts a partir de",
    "-- supabase/data/madres.json — no editar a mano, regenerar desde el JSON.",
    "-- ============================================================================",
    "",
    generateCategoriesSql(madres),
    "",
    generateProductCatalogSql(madres),
    "",
    generateMotherRulesSql(madres),
    "",
  ].join("\n");

  process.stdout.write(sql);
}

main();
