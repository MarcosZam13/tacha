# Plan — SCRUM-131

Ver [SPEC.md](SPEC.md). Skills que aplican antes de escribir código: `security-practices` (tabla nueva, revokes, RLS), `clean-code-practices` (la función plpgsql no trivial), `project-structure` (dónde vive cada archivo nuevo).

## 1. Archivos nuevos/tocados

```
supabase/data/madres.json                      ← fuente de verdad, legible, versionada
scripts/generate-madres-migration.ts            ← lee el JSON, genera el SQL de seed
supabase/migrations/020_curated_mothers.sql     ← tabla product_mother_rules + seed generado + normalizador nuevo + hardening
supabase/tests/020_curated_mothers.test.sql     ← pruebas SQL (mismo patrón que 015/017)
docs/documento-proyecto.md                      ← ya actualizado (decisión de arquitectura, 2026-10-09)
docs/catalogo-scraping/README.md                ← agregar fila a la tabla de contenido si corresponde
supabase/README.md                              ← no cambia (la regla de migraciones ya está en SCRUM-134)
```

## 2. `supabase/data/madres.json` — esquema

Array de objetos:

```ts
interface MadreRule {
  name: string;               // "Leche" — nombre del product_catalog
  category: string;           // "Lácteos" — nombre de categories
  match_keywords: string[];   // minúsculas, sin acentos al comparar
  exclude_keywords: string[]; // vence a match_keywords si aparece
  vtex_category_prefix: string | null; // "/Lácteos/Leche/" o null si no aplica
  priority?: number;          // opcional, desempate manual si dos reglas quedan iguales en especificidad
}
```

Primer lote (todo lo que entrega este PR, antes de completar las 200-300): las 12 madres de SPEC §3 — cubren los 11 `product_catalog` que usan recetas/listas hoy y el 100% de las 100 filas reales de staging. El resto de la lista se completa después, en PRs de datos, con evidencia real igual que esta — no bloquea este ticket.

## 3. `scripts/generate-madres-migration.ts`

- Lee `supabase/data/madres.json`.
- Valida con Zod (ya es el estándar del repo para validación de input, ver `security-practices §4`): cada `name`/`category` no vacíos, `match_keywords` con al menos 1 elemento.
- Genera el bloque SQL de seed:
  ```sql
  insert into categories (name) values (...) on conflict (name) do nothing;

  insert into product_mother_rules (name, category_id, match_keywords, exclude_keywords, vtex_category_prefix)
  select r.name, c.id, r.match_keywords, r.exclude_keywords, r.vtex_category_prefix
  from (values (...)) as r(name, category_name, match_keywords, exclude_keywords, vtex_category_prefix)
  join categories c on c.name = r.category_name;

  insert into product_catalog (name, category_id, source)
  select r.name, c.id, 'scraped'
  from product_mother_rules r join categories c on c.id = r.category_id
  where not exists (select 1 from product_catalog pc where pc.name = r.name and pc.household_id is null);
  ```
- Escribe el resultado en un archivo temporal que se pega manualmente dentro de `020_curated_mothers.sql` (no se ejecuta solo — la migración completa, con el DDL y el normalizador, se revisa como una unidad antes de aplicarla). Node.js vía `tsx` o `ts-node`, sin dependencia nueva si el repo ya tiene una de las dos (revisar `package.json`).
- Es un script de **generación**, no de aplicación: nunca llama a Supabase directamente, solo imprime SQL.

## 4. Migración `020_curated_mothers.sql` — contenido

1. **DDL:**
   ```sql
   create table if not exists product_mother_rules (
     id                   uuid primary key default gen_random_uuid(),
     name                 text not null,
     category_id          uuid not null references categories(id),
     match_keywords       text[] not null default '{}',
     exclude_keywords     text[] not null default '{}',
     vtex_category_prefix text,
     priority             int not null default 0,
     created_at           timestamptz not null default now()
   );
   -- RLS: nace sin políticas (deny-by-default, security-practices §3). Solo el service role (batch) la lee/escribe.
   alter table product_mother_rules enable row level security;
   ```
2. **Seed** (bloque generado por el script, §3).
3. **`create or replace function normalize_staging_row(...)`** — mismo cuerpo que `002`, cambiando solo el bloque de "buscar/crear product_catalog": en vez de `insert into product_catalog` cuando no hay similitud >0.4, hace el match contra `product_mother_rules` con el orden de señales de SPEC §6 (categoría de VTEX primero, keyword como respaldo/desempate) y, si no hay match, `return` dejando la fila `pending` (no la toca).
4. **Hardening (criterio extra de Marcos):**
   ```sql
   alter function normalize_staging_row(uuid) set search_path = '';
   alter function normalize_pending_staging(int) set search_path = '';
   alter function parse_size_text(text) set search_path = '';
   alter function search_catalog(text, uuid) set search_path = '';
   -- cada función pasa a calificar sus tablas: public.product_catalog, etc.

   revoke execute on function normalize_staging_row(uuid) from public, anon, authenticated;
   revoke execute on function normalize_pending_staging(int) from public, anon, authenticated;
   revoke execute on function parse_size_text(text) from public, anon, authenticated;

   revoke insert, update, delete, truncate on
     categories, product_catalog, product_catalog_variants, product_brands,
     product_prices, product_catalog_staging, stores, search_cache, search_log
   from anon, authenticated;
   -- lectura (select) se mantiene para anon/authenticated — search_catalog y el catálogo público la necesitan.
   ```
5. **Insert del historial** (en la misma transacción, al aplicar — ver §5, no va dentro del archivo `.sql` que se commitea, va en el bloque que se corre en el SQL Editor, igual que documenta SCRUM-134).

## 5. Cómo se prueba

```sql
begin;
  -- 1. Crear la tabla + seed + reemplazar la función (contenido de 020_curated_mothers.sql)
  -- 2. Conteo antes
  select status, count(*) from product_catalog_staging group by status;
  -- 3. Correr sobre las filas pending reales
  select * from normalize_pending_staging(50);
  -- 4. Revisar manualmente los matched: ¿alguno de los que tenían "leche"/"chocolate"/etc.
  --    quedó en una madre que no corresponde? (muestra en tasks.md paso de QA)
  select st.scraped_name, pc.name as madre_asignada, st.status
  from product_catalog_staging st
  join product_catalog_variants pcv on pcv.id = st.matched_variant_id
  join product_catalog pc on pc.id = pcv.product_catalog_id
  where st.status = 'matched';
rollback;  -- nada queda escrito; se repite ajustando madres.json hasta que el reporte se vea bien
```

Cuando el reporte quede correcto, se aplica en serio: mismo contenido, pero `commit` en vez de `rollback`, y con el `insert` del historial de migraciones en la misma transacción (regla de SCRUM-134), avisando al grupo antes (ya hecho por WhatsApp).

## 6. Verificación final (antes de pasar a `waiting qa`)

- `npx tsc --noEmit` (el script nuevo es TypeScript). ✅
- Reporte de la prueba del paso 5, pegado en el PR. ✅
- `select version, name from supabase_migrations.schema_migrations order by version;` incluye las filas `020` y `021`. ✅
- Los 11 `product_catalog` de SPEC §3 siguen existiendo sin cambios de `id` (recetas/listas no se tocan). ✅

## 7. Corrección post-aplicación: migración 021

Al revisar §4 contra los privilegios reales de `anon`/`authenticated` después de aplicar la `020`, se encontró que `search_cache` y `search_log` — listadas en el alcance de este plan (§4, punto 4) — no quedaron en el `revoke` que realmente se escribió en `020_curated_mothers.sql` (la consulta de verificación usada en ese momento no las incluyó). Como la `020` ya estaba aplicada y registrada en `supabase_migrations.schema_migrations`, no se edita (regla de `supabase/README.md` §Migraciones, punto 4 — una migración aplicada no se toca). Se corrigió con una migración nueva:

```sql
-- supabase/migrations/021_harden_search_cache_log.sql
revoke insert, update, delete, truncate on search_cache, search_log
  from anon, authenticated;
```

Mismo patrón de prueba que la `020` (`begin...rollback` primero, confirmando que solo quedan `SELECT`/`REFERENCES`/`TRIGGER` para `anon`/`authenticated` en ambas tablas), aplicada en serio el 2026-10-10 con autorización explícita.
