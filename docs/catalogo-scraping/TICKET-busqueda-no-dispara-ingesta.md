
---
tipo: ticket de seguimiento (no bloqueante para el PR que lo encontró)
origen: QA manual de SCRUM-63 (ajuste de cantidad en /lista) por Seph, al probar el buscador de features/shopping-list con un producto que nunca se había scrapeado
fecha: 2026-09-26
bloquea: no bloquea SCRUM-63 (esa historia no toca el buscador ni el catálogo) — sí bloquea que el buscador de /lista funcione con productos reales para cualquier término fuera de lo ya scrapeado una vez
---

# El buscador de la lista no dispara scraping cuando no encuentra el producto

## Problema

Al escribir en el buscador de `/lista` un producto que no está en el catálogo normalizado, la búsqueda devuelve "sin resultados" en vez de scrapear las tiendas y traerlo. La expectativa (razonable, dado el nombre del módulo) es que el pipeline de web scraping "tome la consulta" del usuario y la cargue a `product_catalog_staging` cuando no hay match — eso no ocurre hoy: no existe ningún camino en el código que conecte una búsqueda sin resultados con el disparo de la ingesta.

## Evidencia

- `features/shopping-list/services/catalog.service.ts` (`searchCatalog`) llama **únicamente** a la RPC `search_catalog` vía `getSupabaseClient().rpc(...)`. No hay ninguna llamada a `ingest-maxipali` / `ingest-walmart` / `ingest-masxmenos`, ni a `normalize_pending_staging`, en ningún punto de `features/shopping-list/`.
- `search_catalog` es una función de solo lectura sobre `product_catalog` (el catálogo ya normalizado) — nunca toca `product_catalog_staging` ni dispara scraping. Esto es una decisión de diseño explícita, no un olvido: `docs/catalogo-scraping/referencia-tecnica-catalogo-scraping.md` §7 ("Qué NO está construido") dice textualmente que las Edge Functions de ingesta "no son para que el frontend las llame directo en cada tecla que el usuario escribe" y que "no existe ningún endpoint de búsqueda para el usuario final" que conecte ambos lados.
- La normalización (`normalize_pending_staging`) tampoco es automática por diseño: spec 3 decide explícitamente no dispararla por trigger, sino invocarla a mano o por cron (`docs/catalogo-scraping/specs/spec-03-normalizacion-staging.md`, sección "Out of scope").
- Estado real verificado en Supabase (`scrap-bd`, proyecto `ifvwumejbfpowxlkjfiu`), 2026-09-26:
  - `product_catalog`: 28 filas · `product_catalog_variants`: 39 · `product_brands`: 40 · `product_prices`: 44.
  - `product_catalog_staging`: 50 filas, **0 pendientes** (todas ya `matched`/`rejected`).
  - `search_log`: **1 sola fila** desde que existe el proyecto.
  - Esos 50 registros de staging coinciden exactamente con la única corrida real documentada en `RESPUESTA-QA-SPECS-01-04.md` (una búsqueda de "leche" contra MaxiPali, 2026-09-04, dejada en la base como evidencia). Es decir: el catálogo completo que existe hoy viene de una sola búsqueda manual hace más de tres semanas — nada se ha vuelto a scrapear desde entonces, y ningún flujo del producto lo dispara solo.

## Por qué no bloquea SCRUM-63

La historia que se estaba revisando (ajustar cantidad con +/-) no toca el buscador ni el catálogo — opera sobre `list_items` ya existentes. El hallazgo es real pero pertenece a otra pieza del sistema.

## Qué hay que decidir antes de escribir código (para el dueño del módulo)

No es un fix de una línea: hay al menos tres decisiones de arquitectura que tomar primero y documentar explícitamente (siguiendo el mismo formato de "desviación + justificación" que ya usa `reporte-catalogo-scraping.md` sección 5), porque cada una revierte o modifica una decisión ya tomada por el equipo:

1. **Dónde vive la orquestación "sin resultados → ingerir → normalizar → reintentar".** Opciones a evaluar, con trade-offs de latencia, cuántas llamadas de red hace el navegador, y riesgo de martillar VTEX si el usuario escribe rápido:
   - Orquestar desde el cliente (el hook de búsqueda, tras un `search_catalog` vacío, llama a las 3 Edge Functions de ingesta en paralelo y luego pide la normalización).
   - Una Edge Function orquestadora nueva, server-side, que hace los 4 pasos y el cliente solo la llama una vez.
   - Dejarlo fuera del camino de búsqueda interactiva y resolverlo con un cron/job periódico que re-normaliza y amplía cobertura sin acoplarse al tecleo del usuario (no resuelve "quiero verlo ahora", pero es la opción más simple y la que menos toca decisiones ya cerradas).
2. **Si se reabre la regla de spec 3** ("la normalización nunca se dispara automáticamente, solo se invoca explícitamente"). Encadenar `normalize_pending_staging` justo después de un ingest interactivo es, en la práctica, una excepción a esa regla — hay que decidirlo a propósito y dejarlo escrito, no cambiarlo calladamente.
3. **Qué ve el usuario mientras tanto.** Los `ingest-*` ya tardan (llaman a VTEX con reintento) y encima habría que normalizar antes de tener algo que mostrar — eso es más lento que una lectura de caché. Definir un estado de carga distinto ("buscando en tiendas en vivo, puede tardar unos segundos") y qué mostrar si el scraping falla (los `ingest-*` ya devuelven `502`/`stale-cache`, pero el flujo nuevo tiene que decidir qué le comunica al usuario final, no solo a un demo interno).

## Proceso sugerido, en orden

1. Abrir el ticket en Jira (pendiente — esto no es parte de SCRUM-63) y anotar  número una vez exista. [Actualización 02/10/16 ya se abrió, es el SCRUM-126]
2. Resolver las 3 decisiones de arriba y documentarlas (sección de desviaciones, igual que ya se hizo en `reporte-catalogo-scraping.md`).
3. Escribir una spec nueva con el mismo formato que `specs/spec-01..04` (Intent, In scope, Out of scope, Requirements, Edge cases & errors, Constraints, Acceptance criteria) — es el patrón de Spec-Driven Development que ya sigue el resto del módulo.
4. Actualizar `referencia-tecnica-catalogo-scraping.md` §7: hoy dice explícitamente que esto no existe; hay que sacarlo de "no construido" (o pasarlo a "en progreso") en cuanto se arranque, para que no quede documentación contradictoria.
5. Revisar seguridad antes de implementar: este flujo nuevo abre un camino donde el navegador puede disparar scraping en vivo. Ya existen mitigaciones (mínimo de caracteres, debounce, cache TTL de 6h), pero hay que revisar explícitamente si alcanzan para este uso nuevo o si hace falta algo más (rate limiting por usuario/sesión, por ejemplo).
6. Implementar siguiendo la spec, con su guía de testing (mismo formato que `testing/SPEC-02-TESTING.md` / `SPEC-03-TESTING.md`).
7. Pasar por los subagentes de revisión del repo (`code-reviewer`, `security-reviewer`) antes de pasar a QA.
8. Seguir el flujo normal de ramas (`CONTRIBUTING.md` §1): `ticket/SCRUM-126-...` desde `develop`, PR con label `in progress` → `waiting qa`.

## Dueños

- Responsable de este módulo: Daniel (Seph) — catálogo/scraping.
- No bloquea a nadie más hoy; si otra historia asume que buscar un producto nuevo "simplemente funciona", debe enterarse de esta limitación mientras se resuelve.

## Referencia

- `docs/catalogo-scraping/referencia-tecnica-catalogo-scraping.md`, secciones 2 y 7.
- `docs/catalogo-scraping/specs/spec-02-lectura-catalogo.md` y `spec-03-normalizacion-staging.md`.
- `docs/catalogo-scraping/RESPUESTA-QA-SPECS-01-04.md` (origen de los 50 registros de staging actuales).

Este documento se ha subido el 02/10/2026:

Se cometió el error de subirlo mucho después de su creación, pero los problemas planteados en este documento ya han sido considerados y propuesta la solución en el SCRUM-126 y en el documento donde se cita: `DECISION-SCRUM-126-poblacion-del-catalogo.md`
