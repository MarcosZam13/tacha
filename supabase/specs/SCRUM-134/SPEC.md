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
| 20260828051451 | fix_advisor_warnings_policies_and_indexes | `schema.sql` (línea base, por verificar) |
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

**Archivos del repo sin entrada en el historial:** `006` a `011`, `013` y `014`. Sus objetos existen en la base porque se corrieron desde el SQL Editor, que no registra nada. `013` y `014` ya están en `develop` (PR #38 y #43).

**Causa raíz.** El proceso documentado del equipo es "aplicar la migración en el SQL Editor" (`features/household/specs/plan.md`, paso 3) y el MCP registra con timestamp. Ninguno de los dos caminos deja el historial alineado con los archivos `NNN_`.

**Consecuencia.** `supabase db push`, `db diff` o un branch de Supabase intentarían volver a correr migraciones que ya existen, y nadie puede reconstruir el esquema desde el repo con confianza.

## Decisión de convención (propuesta)

**Se queda la numeración `NNN_` del repo y el historial la adopta.**

- Renombrar los archivos a timestamp rompe 63 referencias en 18 archivos (specs, planes, reportes, una constante en `features/recipes/constants/recipes.constants.ts`) y la forma en que el equipo habla de "la migración 009".
- El historial guarda una fila por archivo: versión `001` … `014`, nombre igual al del archivo sin número ni extensión.
- `schema.sql` es la línea base anterior a `001`. Si la verificación muestra que las tres entradas de agosto no están completas en `schema.sql`, se agrega `000_baseline.sql` con la diferencia.

Alternativa descartada: adoptar timestamps en el repo. Coincide con lo que generan la CLI y el MCP, pero obliga a renombrar después de aplicar (el MCP pone la hora de aplicación, no la de creación) y rompe las referencias citadas.

## Alcance

1. Exportar el historial actual (versión, nombre, `statements`) a `supabase/specs/SCRUM-134/historial-2026-10.sql` antes de tocar nada, para que el registro de lo que se corrió no se pierda.
2. Verificar cada fila del mapeo comparando `statements` contra el archivo, y que los objetos de `006`-`011`, `013`, `014` existen con la misma definición.
3. Reescribir solo el historial, en una transacción: borrar las 14 filas con timestamp e insertar `001` … `014`. **Ninguna migración se vuelve a ejecutar.**
4. Tabla de equivalencias en `supabase/README.md` (archivo del repo → entrada vieja del historial).
5. Regla escrita de cómo se aplica una migración, en `CONTRIBUTING.md` y enlazada desde la skill `gitflow` y `security-practices` (ver más abajo).
6. Corregir el paso "aplicar en el SQL Editor" en `features/household/specs/plan.md` para que apunte a la regla nueva.
7. Revisar que `schema.sql` coincide con la base después de la reconciliación (o documentar que es solo la línea base).

## Regla propuesta para aplicar migraciones

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

- [ ] El historial de la base y `supabase/migrations/` describen el mismo conjunto, con una sola convención.
- [ ] Ninguna migración se re-ejecutó durante la reconciliación (solo se escribieron filas del historial).
- [ ] La regla para aplicar migraciones está escrita en el repo y enlazada desde la skill `gitflow`.
- [ ] Cada PR abierto con migración sabe qué número usar. Hoy (2026-10-08) no hay ninguno: #38 y #43 ya se mergearon; #35 y #44 no traen migraciones. El criterio de Jira se actualiza con esto.

## Aviso al equipo

Escribir en `supabase_migrations.schema_migrations` toca la base compartida: requiere autorización explícita y aviso al grupo antes de correrlo. El proyecto de Supabase (`scrap-bd`) es de Daniel; conviene que él lo vea antes, porque SCRUM-131 y 133 van a agregar migraciones nuevas con la regla de este ticket.
