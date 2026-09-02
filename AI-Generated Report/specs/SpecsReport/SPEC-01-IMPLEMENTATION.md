# Implementación: Demo Ingesta Scraping (Spec-01)

**Estado:** ✅ Código completo, listo para validación

**Fecha:** 2026-09-01  
**Ubicación:** `/debug/scraping-demo`  
**Especialista:** Seguidos skills: component-architecture, nextjs-enterprise-patterns, constants-standards, clean-code-practices

---

## Estructura creada

```
app/
├── (debug)/
│   ├── layout.tsx
│   └── debug/
│       └── scraping-demo/
│           └── page.tsx                      ← ruta /debug/scraping-demo
├── components/
│   └── scraping-demo/
│       ├── ScrapingDemo.tsx                  ← entrada delgada
│       ├── ScrapingDemoInner.tsx             ← composición
│       ├── README.md                         ← guía de uso
│       ├── components/
│       │   ├── SearchForm.tsx                ← input + select + botón (presentación)
│       │   ├── ResultsDisplay.tsx            ← indicador visual de source
│       │   └── StagingTable.tsx              ← tabla de staging
│       ├── hooks/
│       │   └── useScrapingDemoViewModel.ts   ← TODA la lógica (fetch + estado)
│       ├── models/
│       │   └── ScrapingDemoProps.interface.ts
│       └── specs/
│           └── SPEC.md                       ← especificación localizada
├── constants/
│   ├── index.ts                              ← barrels
│   ├── scraping.constants.ts                 ← URLs, source types, colores
│   └── stores.constants.ts                   ← store names
├── types/
│   └── scraping.types.ts                     ← tipos tipados (Request/Response)
└── layout.tsx                                ← root layout
```

## Qué implementé

### 1. **Constantes centralizadas** (constants-standards ✓)
- `STORE_NAMES` — maxipali, walmart, masxmenos
- `SCRAPING_SOURCE` — live, cache, stale-cache
- `SCRAPING_SOURCE_DISPLAY` — emojis + textos descriptivos
- `SCRAPING_SOURCE_COLOR` — clases Tailwind por source
- `EDGE_FUNCTION.BASE_URL` — URL de funciones
- `SCRAPING_DEMO.*` — constantes de validación

### 2. **Tipos completos** (nextjs-enterprise-patterns ✓)
- `EdgeFunctionIngestRequest` — body del POST
- `EdgeFunctionIngestResponse` — respuesta esperada
- `EdgeFunctionErrorResponse` — errores del backend
- `StagingProduct` — fila de `product_catalog_staging`
- `ScrapingSearchState` — estado de la UI

### 3. **Componentes presentacionales** (component-architecture §1 ✓)
- `SearchForm` — puro: input + select + botón → handlers
- `ResultsDisplay` — muestra respuesta + indicador de source
- `StagingTable` — tabla de últimas N filas

**Regla:** Cero lógica en `.tsx`, solo presentación.

### 4. **ViewModel con toda la lógica** (component-architecture §3 ✓)
`useScrapingDemoViewModel.ts` contiene:
- `useState` para estado (query, store, result, error, loading, staging)
- `handleSearch()` — POST a Edge Function con tipado completo
- `handleStoreChange()` — resetea estado
- `handleQueryChange()` — actualiza query
- `handleToggleStagingTable()` — GET readonly a `product_catalog_staging`
- Manejo explícito de errores (400, 502, network)

### 5. **Arquitectura de feature** (component-architecture §1 ✓)
- Feature folder: `scraping-demo/` kebab-case bajo `components/`
- Colocalizadas: hooks, models, specs, README
- Sin dispersión en carpetas globales

### 6. **Ruta de debug** 
`app/(debug)/debug/scraping-demo/page.tsx` → accesible en `/debug/scraping-demo`

---

## Criterios de aceptación de la Spec-01

| Criterio | Estado | Notas |
|---|---|---|
| Formulario con input + select + botón | ✅ | SearchForm |
| POST a Edge Function con `{ query }` | ✅ | En useViewModel |
| Indicador visual de `source` (live/cache/stale-cache) | ✅ | ResultsDisplay con emojis + colores |
| Botón "Ver filas en staging" | ✅ | Toggle table + fetch readonly |
| Manejo visible de errores 400, 502 | ✅ | State + error display |
| Query < 2 caracteres = error | ✅ | Validación en handleSearch |
| Distintas tiendas = caches independientes | ✅ | store_id en fetch |
| **Validación en vivo** | ⏳ | Requiere Next.js corriendo + env var |

---

## Qué necesita el usuario para testear

### Prerrequisitos

1. **Next.js setup** — el proyecto NO tiene `package.json` aún
   - [ ] Crear `package.json` con Next.js, React, TypeScript, Tailwind
   - [ ] Crear `tsconfig.json`, `next.config.js`, `.eslintrc`
   - [ ] `npm install`

2. **Variable de entorno**
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key-del-proyecto-scrap-bd>"
   ```
   (valor en el Table Editor de Supabase, project settings)

3. **Tailwind CSS**
   - El código usa clases Tailwind (p-6, bg-blue-100, etc.)
   - Necesita `tailwind.config.js` + `globals.css` importado en layout

### Cómo testear (una vez levantado Next.js)

```bash
npm run dev
# Abre http://localhost:3000/debug/scraping-demo
```

**Test 1: Cache-first**
1. Busca "leche" en MaxiPali → `source: "live"`
2. Repite inmediatamente → `source: "cache"`

**Test 2: Error por query corto**
- Busca "a" → error 400 del backend

**Test 3: Staging table**
- Busca algo, luego haz clic "Ver filas en staging"
- Verifica contra Table Editor de Supabase

---

## Skills aplicados

- ✅ **component-architecture** — ViewModel, feature folders, composición, Spec-Driven Development
- ✅ **nextjs-enterprise-patterns** — tipos completos, reutilización, sin prop drilling
- ✅ **constants-standards** — todo string/número es constante, `as const`, derivar tipos con `typeof`
- ✅ **clean-code-practices** — naming (no abrevios), funciones pequeñas, patrón ViewModel explícito

## Qué NO incluí (fuera de scope de spec-01)

- ❌ Tests unitarios (pre-desarrollo, no pedido)
- ❌ Historial de búsquedas (fase desarrollo posterior)
- ❌ Normalización a catálogo (spec-03)
- ❌ Autenticación de usuario (usa anon-key)

---

## Próximos pasos para el usuario

1. **Setup Next.js** (package.json, tsconfig, tailwind)
2. **Configurar env var** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Correr demo** en `/debug/scraping-demo`
4. **Validar contra criteria** en spec-01
5. **Documentar en CONTRIBUTING.md** cómo el equipo usa esta herramienta

---

**Estado final:** Código completo, structure ready, specs en la feature, falta solo setup de Next.js + env var + testing manual.
