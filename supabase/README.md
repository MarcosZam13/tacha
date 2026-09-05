# Supabase — Catálogo y scraping

Ver [`AI-Generated Report/reporte-catalogo-scraping.md`](../AI-Generated%20Report/reporte-catalogo-scraping.md) para el detalle completo del modelo de datos y las justificaciones técnicas de cada desviación respecto al documento del equipo.

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

## Deploy

Desde el SQL Editor del dashboard de Supabase, correr primero `schema.sql` completo (reemplaza el schema anterior). Luego, desde el CLI o el editor de Edge Functions del dashboard, desplegar cada función en `functions/`.

```
supabase functions deploy ingest-maxipali
supabase functions deploy ingest-walmart
supabase functions deploy ingest-masxmenos
```

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
