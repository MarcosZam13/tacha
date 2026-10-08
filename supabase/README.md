# Supabase — Catálogo y scraping

Ver [`docs/catalogo-scraping/reporte-catalogo-scraping.md`](../docs/catalogo-scraping/reporte-catalogo-scraping.md) para el detalle completo del modelo de datos y las justificaciones técnicas de cada desviación respecto al documento del equipo.

## Qué hace este pipeline

Las 3 Edge Functions (`ingest-maxipali`, `ingest-walmart`, `ingest-masxmenos`) alimentan **`product_catalog_staging`** con datos crudos de VTEX — no escriben directamente al catálogo que ve el usuario. Son cache-first con TTL de 6 horas: si el mismo término ya se buscó en esa tienda hace menos de 6h, no vuelven a golpear VTEX.

El catálogo real (`product_catalog`, `product_catalog_variants`, `product_brands`) se llena normalizando el staging — ese proceso de matching/normalización es un paso siguiente, no está implementado en esta iteración (ver reporte, sección 7).

## Estructura

| Archivo | Qué hace |
|---|---|
| `_shared/types.ts` | Formas de los datos (interfaces TypeScript). |
| `_shared/stores.ts` | Config estática de las 3 tiendas soportadas (URL base VTEX). |
| `_shared/http.ts` | Parseo de request y armado de response — nada de negocio. |
| `_shared/vtexClient.ts` | Habla con VTEX: arma la URL, hace el fetch, reintenta si falla, elige el seller correcto (`sellerDefault` primero). |
| `_shared/catalogRepository.ts` | Habla con Postgres: resuelve el id de la tienda, guarda staging, lee/escribe cache. |
| `_shared/ingestUseCase.ts` | Orquesta: cache-first TTL, decide cuándo llamar a VTEX vs leer cache. |
| `ingest-maxipali/index.ts` | Puerta HTTP de MaxiPali. |
| `ingest-walmart/index.ts` | Puerta HTTP de Walmart CR. |
| `ingest-masxmenos/index.ts` | Puerta HTTP de MasXMenos. |
| `login-with-recaptcha/index.ts` | Login: verifica el reCAPTCHA con Google y luego autentica con Supabase. |

## Migraciones

`schema.sql` es la línea base del catálogo. Todo cambio posterior va en `migrations/NNN_descripcion.sql`, en orden. El historial de la base (`supabase_migrations.schema_migrations`) tiene una fila por archivo: versión `NNN`, nombre igual al archivo sin número ni extensión.

### Cómo se aplica una migración

1. El archivo usa el siguiente número libre. Revisar `develop` y los PRs abiertos justo antes de crearlo y otra vez antes del merge; si alguien tomó el número, se renombra el archivo (todavía no está en la base).
2. Lo aplica la persona dueña de la historia, **antes de pasar el PR a `waiting qa`**, porque QA prueba contra la base compartida. Se avisa al grupo antes de correrlo.
3. Se corre en el SQL Editor en una sola transacción que ejecuta el archivo **y** registra su fila en el historial:

```sql
begin;
-- contenido completo de migrations/NNN_descripcion.sql
insert into supabase_migrations.schema_migrations (version, name, created_by)
values ('NNN', 'descripcion', 'SCRUM-{n}');
commit;
```

4. Si después de aplicada hace falta cambiarla, se escribe una migración nueva. La ya registrada no se edita.

**No usar** `apply_migration` del MCP de Supabase ni `supabase migration new`: registran la versión con la hora de aplicación (timestamp) y el historial se vuelve a desalinear. Tampoco correr el archivo en el SQL Editor sin el `insert` del historial: así se generó el desfase que arregló SCRUM-134.

Para comprobar que la base y el repo coinciden:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

Debe listar exactamente los archivos de `migrations/`.

### Historial anterior a SCRUM-134

Hasta el 2026-10 el historial tenía 14 filas con timestamp (registradas por el MCP o el dashboard) y no tenía filas para `006`-`011`, `013` y `014`, que se habían corrido en el SQL Editor. SCRUM-134 las reemplazó por `000`-`014` sin volver a correr nada; las filas viejas, con su SQL, quedaron en `supabase_migrations.schema_migrations_pre_scrum134`. Detalle de la verificación en [`specs/SCRUM-134/SPEC.md`](specs/SCRUM-134/SPEC.md).

| Fila vieja del historial | Archivo |
|---|---|
| `20260827072022` rebuild_catalog_v2_aligned_to_team_doc | `schema.sql` |
| `20260828050635` add_household_store_preferences | `schema.sql` |
| `20260828051451` fix_advisor_warnings_policies_and_indexes | `schema.sql` + `000_baseline.sql` (índices) |
| `20260904200421` fix_qa_bug3_search_catalog_duplicate_brands | `001_add_search_catalog_rpc.sql` |
| `20260904202525` fix_search_catalog_jsonb_cast | `001_add_search_catalog_rpc.sql` |
| `20260904200840` fix_qa_bugs_1_2_normalize_staging | `002_add_normalize_staging_functions.sql` |
| `20260904201718` add_missing_normalize_pending_staging | `002_add_normalize_staging_functions.sql` |
| `20260904202420` fix_ambiguous_column_normalize_staging_row_v2 | `002_add_normalize_staging_functions.sql` |
| `20260904201002` fix_qa_bug4_get_recent_staging_rpc | `003_add_get_recent_staging_rpc.sql` |
| `20260925215449` create_lists | `004_create_lists.sql` |
| `20260925220316` create_lists_hardening | `004_create_lists.sql` |
| `20260926000729` change_item_quantity | `005_change_item_quantity.sql` |
| `20260926001246` list_items_update_only_quantity | `005_change_item_quantity.sql` |
| — (SQL Editor, sin fila) | `006` a `011`, `013`, `014` |
| `20261003200930` delete_list_items | `012_delete_list_items.sql` |

## Deploy

En una base nueva, desde el SQL Editor del dashboard de Supabase: correr primero `schema.sql` completo (reemplaza el schema anterior) y después cada archivo de `migrations/` en orden, cada uno con su fila del historial ([Migraciones](#migraciones)). Luego, desde el CLI o el editor de Edge Functions del dashboard, desplegar cada función en `functions/`.

```
supabase functions deploy ingest-maxipali
supabase functions deploy ingest-walmart
supabase functions deploy ingest-masxmenos
supabase functions deploy login-with-recaptcha
```

`login-with-recaptcha` necesita además el secret `RECAPTCHA_SECRET_KEY` (Dashboard → Edge Functions → Secrets o `supabase secrets set RECAPTCHA_SECRET_KEY=...`) y se despliega con la CLI para que el slug sea el nombre de la carpeta y se resuelva `_shared/`.

## Probar en Postman

```
POST https://<project-ref>.supabase.co/functions/v1/ingest-maxipali
Headers: Authorization: Bearer <anon-or-service-key>
Body (JSON): { "query": "leche" }
```

Respuesta esperada:

```json
{ "source": "live", "store": "maxipali", "query": "leche", "stagedCount": 12 }
```

Después de invocarla, revisar la tabla `product_catalog_staging` en el Table Editor — ahí deberían aparecer las filas crudas con `status = 'pending'`.
