---
módulo: Web scraping + catálogo
responsable: Daniel
proyecto Supabase: scrap-bd (ref ifvwumejbfpowxlkjfiu, región us-east-1, Postgres 17.6)
fecha: 2026-08-28
propósito: Documentación de referencia del core de scraping/catálogo para que el resto del equipo (y sus propios agentes de IA) sepan qué existe, cómo funciona y cómo probarlo — no reemplaza las historias de usuario, es documentación tipo "cómo usar esta librería"
estado: Implementado y verificado en la base real. Falta: función de normalización staging→catálogo (ver sección 7)
---

# Referencia técnica — Módulo de catálogo y web scraping (Tacha)

Este documento describe, con el detalle suficiente para que cualquier IA o dev del equipo lo use como contexto, todo lo que existe hoy en el core de scraping/catálogo: qué tablas hay, qué hace cada Edge Function, cómo probarlas, y qué NO está construido todavía. Está pensado para pegarse como contexto en otra herramienta de IA (Cursor, Copilot Chat, otro Claude, etc.) sin que esa herramienta necesite ver el resto de esta conversación.

Referencia cruzada: las decisiones de diseño y su justificación técnica están en `AI-Generated Report/reporte-catalogo-scraping.md`. Este documento es el complementario "cómo funciona y cómo probarlo", no repite las justificaciones ya escritas ahí.

## 1. Qué problema resuelve este módulo

Tacha necesita un catálogo de productos de supermercado real (nombre, marca, tamaño, precio) sin que nadie del equipo tenga que cargarlo a mano. Este módulo obtiene esos datos scrapeando la API pública de VTEX (la plataforma de e-commerce que usan MaxiPali, Walmart Costa Rica y MasXMenos) cada vez que un usuario busca algo, los guarda en Supabase, y expone un catálogo normalizado y agrupado (por producto, no por cada combinación marca+tamaño+súper) para que el resto de la app (listas, recetas, dashboard financiero, grupos de productos) lo consuma.

Tres cadenas soportadas, decisión cerrada, no está en el roadmap agregar más por ahora: **MaxiPali, Walmart Costa Rica, MasXMenos**.

## 2. Los dos "lados" del sistema — no confundirlos

Esto es lo más importante que otro dev del equipo tiene que entender antes de tocar este módulo:

**Lado A — Ingesta (ya construido, Edge Functions).** Cuando alguien busca "leche", una Edge Function le pregunta a VTEX qué hay, y guarda el resultado crudo (sin normalizar) en `product_catalog_staging`. Esto es scraping puro: datos tal como los devuelve el súper, con marca+tamaño+precio mezclados por ítem.

**Lado B — Catálogo normalizado (NO construido todavía, ver sección 7).** Lo que el resto de la app debería consultar es `product_catalog` (el "producto madre", ej. "Leche" sin marca) + `product_catalog_variants` (el tamaño, ej. "Leche — caja 1L") + `product_brands` (la marca, como detalle). Hoy estas tablas existen pero están vacías — nadie las llena todavía. El proceso que toma lo de `product_catalog_staging` y lo convierte en filas de `product_catalog`/`product_catalog_variants`/`product_brands` es la pieza que falta (spec 3, más abajo).

**Consecuencia práctica para el equipo:** si tu historia de usuario necesita "buscar producto y mostrarlo en una tarjeta con nombre+marcas+rango de precio", hoy esa consulta no tiene datos reales que leer — el catálogo normalizado está vacío. Podés construir la UI/lógica contra el modelo (sección 4) usando datos de prueba insertados a mano (spec 2 trae cómo), pero no esperes ver resultados reales de scraping ahí todavía.

## 3. Estado real verificado (2026-08-28)

Confirmado directamente contra el proyecto de Supabase, no es una descripción de intención:

| Tabla | RLS | Filas | Notas |
|---|---|---|---|
| `categories` | ✅ con policy pública de lectura | 0 | Vacía — nadie ha insertado categorías todavía |
| `stores` | ✅ con policy pública de lectura | 3 | Sembrada: maxipali, walmart, masxmenos |
| `household_store_preferences` | ✅ con policies (lectura pública + insert/update/delete temporales) | 0 | Ver sección 6 |
| `product_catalog` | ✅ con policy pública de lectura | 0 | Vacía — ver sección 2 |
| `product_catalog_variants` | ✅ con policy pública de lectura | 0 | Vacía |
| `product_brands` | ✅ con policy pública de lectura | 0 | Vacía |
| `product_catalog_staging` | ✅ sin policies (solo `service_role`) | 0 | Se llena al invocar las Edge Functions — ver sección 5 |
| `product_prices` | ✅ con policy pública de lectura | 0 | Vacía |
| `search_cache` | ✅ sin policies (solo `service_role`) | 0 | Infraestructura interna |
| `search_log` | ✅ sin policies (solo `service_role`) | 0 | Infraestructura interna |

Edge Functions desplegadas y activas:

| Función | Estado | Qué hace |
|---|---|---|
| `ingest-maxipali` | ACTIVE | Ingiere resultados de búsqueda de MaxiPali hacia staging |
| `ingest-walmart` | ACTIVE | Igual, Walmart Costa Rica |
| `ingest-masxmenos` | ACTIVE | Igual, MasXMenos |
| `search-products` | ACTIVE pero devuelve `410 Gone` | Función vieja, deprecada intencionalmente — no la uses, no hay forma de eliminarla vía la herramienta de deploy que usamos, así que se sobrescribió con un stub |

Advisors de seguridad/performance de Supabase: limpios salvo avisos INFO esperables (staging/cache/log sin policy pública es intencional; índices "unused" porque la base está vacía y no ha corrido ninguna query real todavía — no son bugs).

## 4. Modelo de datos completo

### `stores` (fija, sembrada, no editable en runtime)
```
id            uuid PK
slug          text UNIQUE, check in ('maxipali','walmart','masxmenos')
display_name  text
base_url      text   -- endpoint VTEX pub/products/search de esa tienda
```

### `household_store_preferences` (tabla puente)
```
household_id  uuid   -- FK real cuando el módulo households exista en este proyecto
store_id      uuid FK -> stores(id)
visible       boolean default true
PK (household_id, store_id)
```
Sin fila para un household+store dado = se asume `visible = true`. Ver sección 6.

### `categories`
```
id    uuid PK
name  text UNIQUE
```

### `product_catalog` — "producto madre" (ej. "Leche")
```
id            uuid PK
name          text
category_id   uuid FK -> categories(id), nullable
household_id  uuid, nullable   -- NULL = catálogo global; con valor = producto propio de un household
source        text check in ('scraped','manual'), default 'scraped'
created_at    timestamptz
```
No incluye marca. Índice `gin_trgm_ops` sobre `name` para búsqueda difusa.

### `product_catalog_variants` — tamaño/presentación (ej. "Leche — caja 1L")
```
id                   uuid PK
product_catalog_id   uuid FK -> product_catalog(id)
name                 text
base_unit            text check in ('ml','g','unidad')
base_quantity        numeric   -- cantidad normalizada, ej. 1000 para "caja 1L"
image_url            text, nullable
```

### `product_brands` — marca como detalle de una variante (ej. "Dos Pinos")
```
id                          uuid PK
product_catalog_variant_id  uuid FK -> product_catalog_variants(id)
name                        text
logo_url                    text, nullable
```

### `product_catalog_staging` — dato crudo de scraping, sin normalizar
```
id                  uuid PK
store_id            uuid FK -> stores(id)
raw_json            jsonb   -- { product, item, offer } tal como responde VTEX
scraped_name        text, nullable
scraped_brand       text, nullable
scraped_size_text   text, nullable
image_url           text, nullable
status              text check in ('pending','matched','rejected'), default 'pending'
matched_variant_id  uuid FK -> product_catalog_variants(id), nullable
matched_brand_id    uuid FK -> product_brands(id), nullable
scraped_at          timestamptz
```

### `product_prices` — precio granular por variante+marca+súper+fecha
```
id                          bigserial PK
product_catalog_variant_id  uuid FK -> product_catalog_variants(id)
product_brand_id            uuid FK -> product_brands(id)
store_id                    uuid FK -> stores(id)
price                       numeric
list_price                  numeric, nullable
is_available                boolean default true
source                      text check in ('scraped','manual'), default 'scraped'
captured_at                 timestamptz
```
Vista `latest_prices`: último precio por (variant, brand, store) — `distinct on` ordenado por `captured_at desc`, con `security_invoker = true`.

### `search_cache` / `search_log` — infraestructura del pipeline, no negocio
```
search_cache: store_id, normalized_query, staging_ids uuid[], cached_at   PK (store_id, normalized_query)
search_log:   id, store_id, query, source check in ('cache','live','stale-cache'), result_count, searched_at
```

## 5. Cómo probar la ingesta (lo que SÍ existe hoy)

**Endpoint base:** `https://ifvwumejbfpowxlkjfiu.supabase.co/functions/v1/<nombre-funcion>`

**Funciones:** `ingest-maxipali`, `ingest-walmart`, `ingest-masxmenos`

**Request (Postman/curl):**
```
POST https://ifvwumejbfpowxlkjfiu.supabase.co/functions/v1/ingest-maxipali
Headers:
  Authorization: Bearer <anon-key-del-proyecto>
  Content-Type: application/json
Body:
  { "query": "leche" }
```

**Respuesta esperada (primera vez, cache MISS):**
```json
{
  "source": "live",
  "store": "maxipali",
  "query": "leche",
  "stagedCount": 12
}
```

**Respuesta si repetís la misma búsqueda dentro de 6 horas (cache HIT):**
```json
{
  "source": "cache",
  "store": "maxipali",
  "query": "leche",
  "stagedCount": 12
}
```

**Qué verificar después en la base (Table Editor o SQL):**
```sql
select scraped_name, scraped_brand, scraped_size_text, status, scraped_at
from product_catalog_staging
order by scraped_at desc
limit 20;
```
Deberías ver filas con `status = 'pending'` — eso es correcto y esperado, nada las mueve automáticamente a `matched` todavía (spec 3).

```sql
select query, source, result_count, searched_at
from search_log
order by searched_at desc
limit 20;
```

**Errores esperados y qué significan:**
- `400` con `"El parámetro 'query' es requerido (mínimo 2 caracteres)"` — mandaste un body vacío o un query de 1 carácter.
- `502` con `"No se pudo contactar a <tienda> y no hay cache disponible."` — VTEX no respondió tras 2 intentos y no había nada cacheado para devolver como fallback.
- La anon key sin el header `Authorization` da `401` — todas las funciones tienen `verify_jwt: true`.

## 6. `household_store_preferences` — cómo debe usarlo el resto del equipo

Regla de lectura para cualquier módulo que necesite saber "¿qué tiendas le muestro a este household?":

```sql
select s.*
from stores s
left join household_store_preferences hsp
  on hsp.store_id = s.id and hsp.household_id = :household_id
where coalesce(hsp.visible, true) = true;
```

El `coalesce(..., true)` es la parte importante: sin fila explícita, la tienda se considera visible. Solo se necesita insertar una fila cuando el usuario decide **ocultar** una tienda (`visible = false`) — no hace falta poblar las 3 filas por household de antemano.

Las policies de RLS de esta tabla son temporales (`using (true)` en todas las operaciones) porque el módulo `households`/`household_members` de otro integrante del equipo todavía no existe en este proyecto de Supabase. Cuando exista, hay que reemplazar esas policies por una que verifique membresía real. Está anotado como TODO en `schema.sql`.

## 7. Qué NO está construido — para no asumir que existe

- **Normalización staging → catálogo.** No hay ninguna función, trigger, ni cron que tome filas de `product_catalog_staging` y cree/actualice `product_catalog`/`product_catalog_variants`/`product_brands`/`product_prices`. Hoy, si querés ver datos en el catálogo normalizado, hay que insertarlos a mano (spec 2 trae el detalle). Este es el trabajo pendiente más importante del módulo — spec 3 lo especifica para que se pueda construir.
- **Lectura pública del catálogo con rango de precios.** No existe ninguna función RPC ni vista que devuelva "producto + sus marcas + rango min-max de precio por súper", que es lo que el resto de la app necesita consumir. Spec 2 lo especifica.
- **Endpoint de búsqueda para el usuario final.** Las Edge Functions actuales (`ingest-*`) no son para que el frontend las llame directo en cada tecla que el usuario escribe — son para alimentar el staging. La búsqueda real del usuario debería ser una consulta PostgREST/RPC contra `product_catalog` (una vez que tenga datos), no una llamada a estas funciones.
- **Deduplicación entre búsquedas.** Si buscás "leche" y después "leche entera", vas a tener filas de staging duplicadas o casi-duplicadas de los mismos productos VTEX — nada las deduplica todavía, eso es parte de lo que la normalización (spec 3) debe resolver.

## 8. Convenciones que cualquier código nuevo de este módulo debe respetar

- Nombres de tabla y columna: exactamente los de la sección 4, alineados al documento oficial del equipo (`documentacion-v1_for claude.md` v2.1, sección 6).
- Ninguna Edge Function nueva de scraping debe escribir directo a `product_catalog`/`product_catalog_variants`/`product_brands` — todo scraping pasa primero por `product_catalog_staging`.
- `source: scraped | manual` es el discriminador en `product_catalog` y `product_prices` — nunca crear una tabla paralela tipo `custom_products` (evaluado y descartado, ver reporte de decisiones sección 5).
- Las 3 tiendas están fijas — ningún código debe permitir insertar una cuarta fila en `stores` sin que el equipo lo decida explícitamente primero.
