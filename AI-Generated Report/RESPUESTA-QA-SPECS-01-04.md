# Respuesta a QA — Specs 1-4 (scraping/catálogo)

Revisor original: @MarcosZam13 (QA Denied)
Responde: Daniel (Seph) — módulo Web scraping + catálogo
Fecha: 2026-09-04

## Resumen

Los 5 bugs reportados eran reales en el código, no solo desactualización de la documentación. Los reportes de implementación (`SPEC-01..04-IMPLEMENTATION.md`, `IMPLEMENTATION-REPORT-SPECS-01-04.md`, `DELIVERY-SPECS-01-04.md`) decían "✅ Completo" porque nunca se corrieron contra datos reales de scraping — solo contra datos sembrados a mano, que no ejercitan los mismos paths. Se corrigieron los 5, más 3 bugs adicionales que aparecieron al validar con datos reales (no estaban en tu lista, pero son igual de reales). Todo el pipeline se corrió de punta a punta contra datos reales de MaxiPali y quedó verificado.

## Los 5 bugs reportados

**1. Precio: `spotPrice` no existe en VTEX (debía ser `Price`)** — confirmado en `supabase/migrations/002_add_normalize_staging_functions.sql`. `raw_json.offer` es el `commertialOffer` elegido por `pickBestOffer` (ver `supabase/functions/_shared/catalogRepository.ts`), y el campo real es `Price` (mayúscula), ya documentado en `supabase/functions/_shared/types.ts`. Fix: `(raw_json -> 'offer' ->> 'Price')::numeric`.

**2. `parse_size_text` con regex ancladas (`^...$`)** — confirmado. `scraped_size_text` viene de `item.nameComplete` de VTEX, o sea el **nombre completo** del producto ("Leche Entera Dos Pinos 1 Litro"), nunca un tamaño aislado. Con el ancla, nunca matcheaba nada real. Fix: se quitaron los anclajes, se usa `regexp_match` con `\M` (word boundary) buscando el patrón en cualquier parte del texto, y se reordenó para chequear kg antes que g.

**3. `search_catalog` duplica marcas** — confirmado. La query original hacía `join product_brands ... cross join stores` y agrupaba todo junto: con 2 marcas × 3 tiendas, cada marca se repetía 3 veces en el JSON. Fix: se separó en dos CTEs independientes (`variant_brands`, agregación solo sobre marcas; `variant_prices`, agregación solo sobre tiendas) y se unen después por `variant_id`.

**4. `product_catalog_staging` sin policy de SELECT, demo la leía directo con anon key** — confirmado, y era intencional (esa tabla es privada por diseño, solo accesible por `service_role`/RPC). El fix no era abrir la tabla. Se creó `get_recent_staging(store_slug, row_limit)`, una RPC `security definer` que expone solo las columnas seguras para demo (`id, scraped_name, scraped_brand, scraped_size_text, image_url, status, scraped_at` — **sin** `raw_json`). El frontend (`useScrapingDemoViewModel.ts`) ahora llama esa RPC en vez de hacer `GET` directo a la tabla.

**5. URLs de Supabase hardcodeadas en varios archivos** — confirmado en `scraping.constants.ts`, `useHouseholdStorePreferences.ts`, y también en dos páginas de debug adicionales que no estaban en tu lista pero tenían el mismo problema (`search-demo/page.tsx`, `normalize-demo/page.tsx`). Fix: se centralizó en `SUPABASE_URL` (derivado de `NEXT_PUBLIC_SUPABASE_URL`) y `SUPABASE_REST.BASE_URL` en `app/constants/scraping.constants.ts`, y todos los usos se reemplazaron por esa constante.

## Bugs adicionales encontrados al validar con datos reales (no estaban en tu review)

Al correr el pipeline de punta a punta contra Supabase real con datos reales de MaxiPali, aparecieron 3 problemas más que ninguno de los dos lados había detectado porque nadie había ejecutado esto contra datos reales:

**6. `normalize_pending_staging` no existía en la base de datos real.** Estaba en el archivo `.sql` local y documentada como implementada, pero la migración nunca se había aplicado a Supabase. Se aplicó.

**7. Referencia de columna ambigua en `normalize_staging_row`.** La función declara `returns table (..., product_catalog_id uuid, ..., product_brand_id uuid, ...)`, y esos nombres de salida colisionan con las columnas reales de `product_catalog_variants.product_catalog_id` y `product_brands`. Sin alias, Postgres no sabe a cuál te referís y falla en runtime con "column reference is ambiguous". Fix: se calificaron todas las referencias con alias de tabla (`pcv.`, `pb.`).

**8. `search_catalog` con mismatch de tipo `json` vs `jsonb`.** La función declara `returns table (..., variants jsonb)`, pero `json_agg()` devuelve `json`, no `jsonb` — Postgres no hace ese cast implícito en `RETURN QUERY`. Esto rompía la función en cualquier búsqueda con resultados (no se detectó antes porque nunca se probó con filas que realmente matchearan). Fix: cast explícito `::jsonb`.

## Evidencia — corrida real contra Supabase, datos reales de MaxiPali

1. **Ingesta real** (`ingest-maxipali`, término "leche"): 50 filas nuevas en `product_catalog_staging`, `status='pending'`.
2. **Normalización real** (`normalize_pending_staging(50)`):
   ```json
   {"processed": 50, "matched": 44, "rejected": 6}
   ```
   Las 6 rechazadas son casos reales de cobertura del parser, no bugs: "1 gal" (galones, unidad no soportada), "375gr" (abreviatura no reconocida), "972grea" / "500grea" (typo de VTEX con texto pegado al número), "8 uds" (abreviatura de unidades no cubierta). Esto es el comportamiento esperado de Spec 3: ante un patrón no reconocido, se rechaza para revisión manual en vez de adivinar.
3. **Lectura real** (`search_catalog('leche', null)`): 28 productos reales, agrupados correctamente sin duplicación. Ejemplo verificado: "Leche Semidescremada Dos Pinos -1 L" muestra una sola variante con dos marcas (`DOS PINOS`, `SABEMAS`), cada una una sola vez, con rango de precio real por tienda (`min`/`max` desde `product_prices`).
4. **Demo RPC** (`get_recent_staging('maxipali', 3)`): confirma que solo expone columnas seguras y filtra por `status`, sin exponer `raw_json`.

Esto responde directamente a tu objeción central: el pipeline ahora cumple sus propios criterios de aceptación (`matched > 0`) con datos reales de scraping, no solo con datos sembrados a mano.

## Archivos modificados

- `supabase/migrations/001_add_search_catalog_rpc.sql` (bug 3 + bug 8)
- `supabase/migrations/002_add_normalize_staging_functions.sql` (bug 1, 2 + bug 7)
- `supabase/migrations/003_add_get_recent_staging_rpc.sql` (nuevo, bug 4)
- `app/constants/scraping.constants.ts` (bug 5)
- `app/components/household-store-preferences/hooks/useHouseholdStorePreferences.ts` (bug 5)
- `app/components/scraping-demo/hooks/useScrapingDemoViewModel.ts` (bug 4 + bug 5)
- `app/(debug)/debug/search-demo/page.tsx`, `app/(debug)/debug/normalize-demo/page.tsx` (bug 5)
- `AI-Generated Report/TICKET-seguridad-household-store-preferences.md` (nuevo — tu punto 6, deuda técnica de RLS abierto en `household_store_preferences`, documentado como no bloqueante para este PR pero sí para producción, bloqueado por el módulo de auth/households de Esteban)

Todas las migraciones ya están aplicadas en el proyecto real de Supabase (`scrap-bd`), no solo en los archivos locales. Los datos de esta verificación (staging + catálogo normalizado real) se dejaron en la base como evidencia y para que el equipo pueda probar las specs 1-4 sin tener que re-ingestar.

## Estado

Considero los 5 bugs de tu review resueltos y verificados con datos reales, más los 3 adicionales encontrados en el proceso. Queda pendiente de tu parte: re-revisar el PR con esto en cuenta.
