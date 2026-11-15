# SPEC — SCRUM-130: restringir las Edge Functions ingest-* a service_role

Ticket: [SCRUM-130](https://tacha.atlassian.net/browse/SCRUM-130) · Dueño: Daniel Salas · Sprint 4
Origen: resultado de QA sobre SCRUM-126 (hallazgo 5, confirmado en código) y dirección del líder de proyecto. Split (a) de los tres tickets pedidos ahí.

Ver también: [supabase/README.md#migraciones](../../README.md#migraciones) · [SCRUM-134/SPEC.md](../SCRUM-134/SPEC.md) (regla de migraciones) · [docs/documento-proyecto.md §4.7](../../../docs/documento-proyecto.md#47-web-scraping--motor-de-datos-prioridad-alta-del-proyecto) (decisiones de arquitectura, 2026-11-01) · [SCRUM-132/SPEC.md](../SCRUM-132/SPEC.md) (depende de este ticket) · [supabase/specs/SCRUM-131/SPEC.md](../SCRUM-131/SPEC.md) (precedente de hardening de permisos)

## 1. Intención

`supabase/functions/ingest-maxipali`, `ingest-walmart` e `ingest-masxmenos` no verifican quién las llama. Confirmado en el código (`index.ts` de las 3): cada una arma un cliente con `SUPABASE_SERVICE_ROLE_KEY` (correcto, para escribir en `product_catalog_staging` saltándose RLS) pero el `Deno.serve` no valida el `Authorization` del request entrante — cualquiera con la anon key pública puede invocarlas con un término inventado, saltándose el caché de 6h (que es por término) y disparando scraping contra MaxiPali/Walmart/MasXMenos sin control.

Este ticket cierra ese hueco: las 3 funciones solo aceptan llamadas que traigan la service role key. Nada en la app las llama hoy fuera de la demo de scraping (ver §2), así que el único consumidor legítimo después de este cambio es el script de ingesta mensual (SCRUM-132, que depende de este ticket).

## 2. Situación verificada (código, 2026-11-01)

- Único consumidor de `ingest-*` en el repo: `features/scraping-demo/hooks/useScrapingDemoViewModel.ts:57` (`${EDGE_FUNCTION.BASE_URL}/ingest-${state.selectedStore}`), llamado desde el navegador con la anon key — es justamente el agujero.
- Las 3 funciones comparten la misma forma: `parseSearchRequest` → `createClient` con la service role key → `getStoreBySlug` → `ingestProducts` (toda en `_shared/`). No hay ningún chequeo de `Authorization` hoy en ninguna.
- `get_recent_staging(store_slug, row_limit)` (`003_add_get_recent_staging_rpc.sql`) es `SECURITY DEFINER`, ejecutable por `anon`, y su único llamador es también la demo de scraping (auditoría de Marcos, 2026-10-06).
- La Edge Function `search-products` (v3, `verify_jwt = true`) está desplegada en el proyecto de Supabase pero no existe en el repo (no aparece en `supabase/functions/`) ni tiene ningún llamador en `app/`, `features/` ni `components/`.
- `/debug/scraping-demo` vive en `app/(debug)/debug/scraping-demo` — ya oculta en producción por SCRUM-124 (`notFound()` + próximamente `proxy.ts` de SCRUM-125), así que el impacto de este ticket es solo de desarrollo.

## 3. Decisiones ya tomadas (detalle y motivo en documento-proyecto.md §4.7, 2026-11-01)

- Se elimina `/debug/scraping-demo` por completo (la carpeta `app/(debug)/debug/scraping-demo` y `features/scraping-demo/`), no se deja con mensaje de "deshabilitado".
- Se elimina `get_recent_staging` (migración nueva) y se borra `search-products` v3 del proyecto de Supabase — no se endurecen.
- Redeploy de las 3 funciones: requiere autorización explícita de Daniel (proyecto compartido, usuarios reales).

## 4. Alcance

**Sí incluye:**
- Chequeo de caller compartido en `_shared/`, usado por las 3 `ingest-*`: solo acepta requests cuyo `Authorization` sea la service role key; cualquier otra cosa (anon key, sin header, token inventado) recibe 401/403 antes de parsear el body.
- Eliminar `app/(debug)/debug/scraping-demo/` y `features/scraping-demo/` completos.
- Migración nueva: `drop function get_recent_staging(text, int);`.
- Borrar `search-products` v3 del proyecto de Supabase (fuera del repo — paso operativo en el dashboard/CLI, requiere autorización de Daniel, se documenta en `tasks.md`).
- Actualizar `supabase/README.md` (hoy dice "anon-or-service-key" para `ingest-*`) y las instrucciones de Postman.
- Redeploy de las 3 Edge Functions (autorización explícita de Daniel antes de cada deploy).

**No incluye:**
- Un proxy server-side que mantenga viva la demo (alternativa descartada por el ticket original).
- Rate limiting por usuario o IP.
- El script de ingesta mensual en sí (SCRUM-132, que sí consume este trabajo).

## 5. Criterios de aceptación (Jira)

- [ ] Una llamada con la anon key (o sin key) a cualquiera de las 3 `ingest-*` es rechazada; una llamada con la service role key se comporta exactamente igual que hoy (mismo contrato de respuesta: `source`, `store`, `query`, `stagedCount`).
- [ ] Las 3 funciones comparten un solo chequeo (sin copiar y pegar el mismo código 3 veces).
- [ ] `supabase/README.md` y cualquier doc/spec de `scraping-demo` reflejan el cambio (la demo se elimina, no se documenta como "deshabilitada").
- [ ] Verificado leyendo los 3 `index.ts` completos (la auditoría original de Marcos solo había leído MaxiPali).
- [ ] `get_recent_staging` y `search-products` v3 eliminadas, con la migración de la primera siguiendo la regla de SCRUM-134.

## 6. Aviso al equipo (Developer Notes del PR, antes de abrir)

Avisar a Marcos y Roberto: desde ahora las `ingest-*` necesitan la service role key (cambian las instrucciones de Postman), la demo de scraping se elimina del repo (no solo se oculta), y nada en la app de producción llama a estas funciones. Avisar también antes del redeploy de las 3 funciones y antes de borrar `search-products` del proyecto de Supabase (ambos requieren autorización explícita de Daniel).
