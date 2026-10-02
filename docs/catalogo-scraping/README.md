# Catálogo + scraping — documentación del módulo

Responsable: Daniel. Todo lo que se escribió para diseñar, implementar y pasar QA del módulo de catálogo y scraping (PR #1). Antes vivía en la raíz del repo como `AI-Generated Report/`.

| Archivo / carpeta | Qué es |
|---|---|
| [reporte-catalogo-scraping.md](reporte-catalogo-scraping.md) | Diseño del modelo de datos del catálogo y justificación de cada desviación respecto al documento del equipo. **Es la referencia vigente del schema.** |
| [referencia-tecnica-catalogo-scraping.md](referencia-tecnica-catalogo-scraping.md) | Cómo funciona el pipeline y cómo probarlo |
| [specs/](specs/) | Specs 01-04 (ingesta, lectura, normalización, preferencias de tienda) |
| [specs/SpecsReport/](specs/SpecsReport/) | Informes de implementación de cada spec |
| [testing/](testing/) | Guías de testing de las specs 02 y 03 (antes estaban en `supabase/migrations/`, que debe contener solo migraciones) |
| [RESPUESTA-QA-SPECS-01-04.md](RESPUESTA-QA-SPECS-01-04.md) | Respuesta a los hallazgos de QA del PR #1 |
| [TICKET-seguridad-household-store-preferences.md](TICKET-seguridad-household-store-preferences.md) | Deuda técnica abierta: RLS de `household_store_preferences` |

**Rutas en los informes históricos:** los informes de `specs/SpecsReport/` y la respuesta de QA se escribieron antes de SCRUM-118, cuando el código compartido vivía dentro de `app/`. Donde digan `app/components/...`, `app/constants/...` o `app/types/...`, hoy es `features/...` (las features) o `components/ui/...` (primitivos), `constants/...` y `types/...`. No se reescribieron porque son el registro de lo que se entregó en ese momento.
