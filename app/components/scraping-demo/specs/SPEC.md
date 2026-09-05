# Spec: Demo de Ingesta Scraping (Cache-First)

## Intención

Construir una pantalla/herramienta de demo que demuestre el comportamiento cache-first del pipeline de scraping:
- **Primera búsqueda** = llamada en vivo a VTEX (`source: "live"`)
- **Segunda búsqueda idéntica dentro de 6h** = respuesta desde cache (`source: "cache"`)
- **VTEX caído sin cache previo** = `source: "stale-cache"` con warning

Objetivo: que cualquiera del equipo pueda ver funcionar el pipeline y entender su contrato antes de construir features que dependan de él.

## Alcance

- Formulario: input text (query) + selector de tienda (maxipali/walmart/masxmenos) + botón "Buscar"
- POST a Edge Functions (`ingest-{tienda}`) con `{ query: string }`
- Mostrar respuesta con indicador visual del source (🟢 live, 🔵 cache, 🟡 stale-cache)
- Botón "Ver filas en staging" que lista últimas N filas de `product_catalog_staging`
- Manejo explícito de errores: 400 (query < 2 caracteres), 502 (VTEX caído sin cache)

## Fuera de alcance

- Sin autenticación de usuario real (usa `anon-key` directo)
- Sin UI de producción (herramienta técnica)
- Sin historial de búsquedas
- Sin normalización a catálogo
- Sin paginación de staging

## Requerimientos

1. Cliente debe usar contrato exacto: `POST { query: string }` con header `Authorization: Bearer <anon-key>`
2. Distinguir visualmente 3 valores posibles de `source`: `live`, `cache`, `stale-cache`
3. Permitir repetir búsqueda y evidenciar que segunda vez no llamó VTEX (source = cache)
4. Consulta de staging es readonly — demo nunca escribe, solo lee lo que la Edge Function escribió
5. Query < 2 caracteres debe mostrar error 400 tal como lo devuelve la función

## Casos límite

- Búsqueda de término que no existe: Edge Function responde 200 con `stagedCount: 0` → mostrar "0 productos", no error
- VTEX lento/caído: función devuelve 502 sin cache, o `stale-cache` con cache previo → ambos casos claros
- Cambio de tienda a mitad de sesión: cada tienda tiene cache independiente (`store_id` + `normalized_query`)
- Mayúsculas/espacios en query: backend normaliza → demo no necesita normalizar

## Restricciones

- No modificar Edge Functions ni tablas existentes
- Ruta `/debug/scraping-demo` en Next.js
- URL base real: `https://ifvwumejbfpowxlkjfiu.supabase.co/functions/v1/`
- Usar constantes para store names, source indicators, URLs

## Criterios de aceptación

- [x] Estructura de feature en `app/components/scraping-demo/` con ViewModel pattern
- [x] Constantes centralizadas en `app/constants/`
- [x] Tipos tipados completos para request/response
- [x] Componentes presentacionales sin lógica (SearchForm, ResultsDisplay, StagingTable)
- [x] ViewModel con toda la lógica (fetch Edge Functions + staging)
- [x] Ruta `/debug/scraping-demo` accesible
- [ ] Buscar "leche" en MaxiPali → muestra `source: "live"` y `stagedCount > 0`
- [ ] Repetir búsqueda inmediatamente → muestra `source: "cache"`
- [ ] Tabla de staging coincide con datos reales en Supabase
- [ ] Query de 1 carácter → muestra error 400 del backend
- [ ] Buscar en 3 tiendas distintas → 3 entradas independientes en search_cache
