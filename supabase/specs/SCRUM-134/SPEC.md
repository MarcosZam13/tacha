# SPEC — SCRUM-134: reconciliar el historial de migraciones

Ticket: [SCRUM-134](https://tacha.atlassian.net/browse/SCRUM-134) · Dueño: Marcos Zamora · Sprint 3

## Intención

Que `supabase/migrations/` y el historial de migraciones de la base compartida (`supabase_migrations.schema_migrations`) describan el mismo conjunto, con una sola convención de nombres, y que quede escrito cómo llega una migración a la base para que el desfase no vuelva a aparecer.

## Situación (2026-10-08)

**Historial de la base: 14 entradas con versión de timestamp.** Se registraron con el MCP o el dashboard de Supabase, que asignan la hora de aplicación como versión.

| Versión en la base | Nombre en la base | Archivo del repo que la cubre |
|---|---|---|
| 20260827072022 | rebuild_catalog_v2_aligned_to_team_doc | `schema.sql` (línea base, sin archivo de migración) |
| 20260828050635 | add_household_store_preferences | `schema.sql` (línea base) |
| 20260828051451 | fix_advisor_warnings_policies_and_indexes | `schema.sql` + `000_baseline.sql` (índices) |
| 20260904200421 | fix_qa_bug3_search_catalog_duplicate_brands | `001_add_search_catalog_rpc.sql` |
| 20260904200840 | fix_qa_bugs_1_2_normalize_staging | `002_add_normalize_staging_functions.sql` |
| 20260904201002 | fix_qa_bug4_get_recent_staging_rpc | `003_add_get_recent_staging_rpc.sql` |
| 20260904201718 | add_missing_normalize_pending_staging | `002_add_normalize_staging_functions.sql` |
| 20260904202420 | fix_ambiguous_column_normalize_staging_row_v2 | `002_add_normalize_staging_functions.sql` |
| 20260904202525 | fix_search_catalog_jsonb_cast | `001_add_search_catalog_rpc.sql` |
| 20260925215449 | create_lists | `004_create_lists.sql` |
| 20260925220316 | create_lists_hardening | `004_create_lists.sql` |
| 20260926000729 | change_item_quantity | `005_change_item_quantity.sql` |
| 20260926001246 | list_items_update_only_quantity | `005_change_item_quantity.sql` |
| 20261003200930 | delete_list_items | `012_delete_list_items.sql` |

El mapeo es por nombre y por objetos creados; se confirma comparando el SQL guardado en cada entrada contra el archivo (tarea 2 del plan).

### Resultado de la verificación (2026-10-08, solo lectura)

- **Funciones (15 en `public`):** se comparó el `md5` del cuerpo (`prosrc`) en la base contra el texto entre `$$` de la última definición en el repo.
  - 10 iguales con espacios normalizados: las de `003`, `004`, `011`, `013`, `014` y `save_recipe` (versión de `013`).
  - 3 iguales al quitar además los comentarios `--`: `search_catalog` (`001`), `normalize_pending_staging` (`002`), `change_item_quantity` (`005`). La base guardó la versión sin comentarios.
  - 2 equivalentes pero no idénticas, ambas de `002`: `normalize_staging_row` (el repo declara `v_best_match` y `v_store_id`, que no se usan) y `parse_size_text` (el repo guarda el número en una variable `quantity`; la base lo usa directo). Mismo comportamiento. No se reaplica nada: SCRUM-131 reescribe el normalizador.
- **Tablas (18) y políticas (26):** todas existen y cada política tiene su `create policy` en `schema.sql` (7) o en `004`-`013` (19). Las cuatro políticas "temp" de escritura no están, como manda `009`.
- **Índices:** seis índices de la entrada `20260828051451` no estaban en ningún archivo (`idx_household_store_prefs_store`, `idx_staging_matched_variant`, `idx_staging_matched_brand`, `idx_prices_brand`, `idx_prices_store`, `idx_search_log_store`). Se agregan en `000_baseline.sql`.

**Archivos del repo sin entrada en el historial:** `006` a `011`, `013` y `014`. Sus objetos existen en la base porque se corrieron desde el SQL Editor, que no registra nada. `013` y `014` ya están en `develop` (PR #38 y #43).

**Causa raíz.** El proceso documentado del equipo es "aplicar la migración en el SQL Editor" (`features/household/specs/plan.md`, paso 3) y el MCP registra con timestamp. Ninguno de los dos caminos deja el historial alineado con los archivos `NNN_`.

**Consecuencia.** `supabase db push`, `db diff` o un branch de Supabase intentarían volver a correr migraciones que ya existen, y nadie puede reconstruir el esquema desde el repo con confianza.

## Decisión de convención (propuesta)

**Se queda la numeración `NNN_` del repo y el historial la adopta.**

- Renombrar los archivos a timestamp rompe 63 referencias en 18 archivos (specs, planes, reportes, una constante en `features/recipes/constants/recipes.constants.ts`) y la forma en que el equipo habla de "la migración 009".
- El historial guarda una fila por archivo: versión `001` … `014`, nombre igual al del archivo sin número ni extensión.
- `schema.sql` es la línea base anterior a `001`. Lo que las tres entradas de agosto dejaron en la base y `schema.sql` no trae (seis índices) va en `000_baseline.sql`.

Alternativa descartada: adoptar timestamps en el repo. Coincide con lo que generan la CLI y el MCP, pero obliga a renombrar después de aplicar (el MCP pone la hora de aplicación, no la de creación) y rompe las referencias citadas.

## Alcance

1. Respaldar el historial actual (versión, nombre, `statements`) en `supabase_migrations.schema_migrations_pre_scrum134`, dentro de la misma transacción que lo reescribe, para que el registro de lo que se corrió no se pierda. Esa tabla no está expuesta por la API.
2. Verificar cada fila del mapeo comparando `statements` contra el archivo, y que los objetos de `006`-`011`, `013`, `014` existen con la misma definición.
3. Reescribir solo el historial, en una transacción ([`reconcile-history.sql`](reconcile-history.sql)): borrar las 14 filas con timestamp e insertar `000` … `014`. **Ninguna migración se vuelve a ejecutar.**
4. Tabla de equivalencias en `supabase/README.md` (archivo del repo → entrada vieja del historial).
5. Regla escrita de cómo se aplica una migración, en `CONTRIBUTING.md` y enlazada desde la skill `gitflow` y `security-practices` (ver más abajo).
6. Corregir el paso "aplicar en el SQL Editor" en `features/household/specs/plan.md` para que apunte a la regla nueva.
7. Revisar que `schema.sql` coincide con la base después de la reconciliación (o documentar que es solo la línea base).

## Regla para aplicar migraciones

Escrita en [`supabase/README.md`](../../README.md#migraciones), que es la fuente; acá queda el resumen.

- El archivo se crea con el siguiente número libre: `NNN_descripcion.sql`.
- Lo aplica la persona dueña de la historia, **antes de pasar el PR a `waiting qa`** (QA prueba contra la base compartida, `CONTRIBUTING.md` §QA paso 2), avisando al grupo.
- Se aplica en una sola transacción que corre el SQL del archivo **y** registra la fila del historial:

```sql
begin;
-- contenido del archivo NNN_descripcion.sql
insert into supabase_migrations.schema_migrations (version, name)
values ('NNN', 'descripcion');
commit;
```

- Prohibido: `apply_migration` del MCP (registra con timestamp) y correr el archivo en el SQL Editor sin la fila del historial.
- Si el PR cambia la migración después de aplicada, se corrige con una migración nueva, no editando la ya registrada.
- Sigue valiendo la regla del equipo: un PR con migración actualiza skills/SPEC/README/schema en el mismo PR.

## Fuera de alcance

Grants y RLS (SCRUM-127, SCRUM-131), Edge Functions (SCRUM-130), contenido del catálogo (SCRUM-131 a 133).

## Criterios de aceptación (Jira)

- [x] El historial de la base y `supabase/migrations/` describen el mismo conjunto, con una sola convención.
- [x] Ninguna migración se re-ejecutó durante la reconciliación (solo se escribieron filas del historial).
- [x] La regla para aplicar migraciones está escrita en el repo y enlazada desde la skill `gitflow`.
- [x] Cada PR abierto con migración sabe qué número usar. Hoy (2026-10-08) no hay ninguno: #38 y #43 ya se mergearon; #35 y #44 no traen migraciones. El criterio de Jira se actualiza con esto.

## Aviso al equipo

Escribir en `supabase_migrations.schema_migrations` toca la base compartida: requiere autorización explícita y aviso al grupo antes de correrlo. El proyecto de Supabase (`scrap-bd`) es de Daniel; conviene que él lo vea antes, porque SCRUM-131 y 133 van a agregar migraciones nuevas con la regla de este ticket.
