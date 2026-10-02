# Scraping Demo — Herramienta de verificación del pipeline cache-first

Esta es una **herramienta de verificación pre-desarrollo**, no una feature de producción. Demuestra que el pipeline de scraping funciona correctamente.

## Ubicación en la app

**Ruta:** `/debug/scraping-demo`

Accesible solo en desarrollo. Es una página de debug interna del equipo.

## Qué hace

1. **Formulario de búsqueda** — ingresa query + elige tienda
2. **Invoca Edge Function** — `POST` a `ingest-{tienda}` con `{ query: string }`
3. **Muestra respuesta** con indicador visual del source:
   - 🟢 **live** = consultó VTEX en vivo
   - 🔵 **cache** = vino del cache (respuesta cacheada < 6h)
   - 🟡 **stale-cache** = VTEX falló, mostrando cache viejo
4. **Botón "Ver filas en staging"** — lista últimas N filas de `product_catalog_staging` para esa tienda

## Cómo probar

### Test básico: comportamiento cache-first

1. Abre `/debug/scraping-demo`
2. Ingresa query: `"leche"`
3. Selecciona tienda: `"MaxiPali"`
4. Haz clic en "Buscar"
5. **Esperado:** Response con `source: "live"` y `stagedCount > 0`
6. **Repetir paso 4** inmediatamente
7. **Esperado:** Misma respuesta, pero ahora `source: "cache"`

### Test: error por query muy corto

1. Ingresa query: `"a"` (1 carácter)
2. Haz clic en "Buscar"
3. **Esperado:** Error 400 del backend: `"El parámetro 'query' es requerido (mínimo 2 caracteres)"`

### Test: término que no existe

1. Ingresa query: `"xyzasdqwe123"`
2. Haz clic en "Buscar"
3. **Esperado:** Response con `stagedCount: 0` (no es error, es resultado válido)

### Test: verificar datos en staging

1. Después de una búsqueda exitosa, haz clic en "Ver filas en staging"
2. Abre Supabase > project scrap-bd > Table Editor > `product_catalog_staging`
3. Filtra por la tienda y búsqueda que acabas de hacer
4. **Esperado:** Filas coinciden con las mostradas en la tabla de la demo

## Estructura interna

```
scraping-demo/
├── ScrapingDemo.tsx           ← entrada delgada
├── ScrapingDemoInner.tsx      ← composición de secciones
├── components/
│   ├── SearchForm.tsx         ← input + select + botón (presentación pura)
│   ├── ResultsDisplay.tsx     ← indicador de source + datos
│   └── StagingTable.tsx       ← tabla de últimas filas
├── hooks/
│   └── useScrapingDemoViewModel.ts  ← TODA la lógica
├── models/
│   └── ScrapingDemoProps.interface.ts
└── specs/
    └── SPEC.md                ← este spec
```

**Patrón de arquitectura:** ViewModel (lógica en hook, presentación en componentes).

## Dependencias

- Next.js (ruta `/debug/scraping-demo`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var (requerida)
- Tailwind CSS (clases de estilo)

## Qué NO está incluido

- Tests unitarios (pre-desarrollo)
- Historial de búsquedas
- Persistencia local
- Autenticación real
- Normalización a catálogo

## Próximos pasos en el roadmap

Esta demo es solo para **verificación**. La normalización staging → catálogo es **spec-03** — ahí es donde se crean `product_catalog`/`product_catalog_variants`/`product_brands` a partir de los datos crudos de staging.
