# Spec 2 Implementación: Función RPC `search_catalog`

**Estado:** ✅ Código SQL completo, listo para ejecutar en Supabase

**Fecha:** 2026-09-01

---

## Qué se implementó

### 1. Función RPC SQL: `search_catalog()`

**Archivo:** `supabase/migrations/001_add_search_catalog_rpc.sql`

Función Postgres que busca en el catálogo normalizado:

```sql
search_catalog(
  search_term text default '',
  household_id uuid default null
) returns table (
  product_catalog_id uuid,
  name text,
  category text,
  variants jsonb
)
```

**Funcionalidades:**
- ✅ Búsqueda por similitud usando `pg_trgm` (tolerancia a typos)
- ✅ Devuelve variantes (tamaños/presentaciones)
- ✅ Devuelve marcas por variante
- ✅ Calcula rango min-max de precios usando `latest_prices`
- ✅ Filtra tiendas según `household_store_preferences` si se pasa `household_id`
- ✅ Retorna JSON estructurado, invocable vía PostgREST

**Ventajas:**
- Reutiliza `latest_prices` (no reimplementa lógica)
- Segura: usa RLS, no requiere `service_role`
- Invocable con `anon key`
- Stable, no modifica estado

### 2. Datos de prueba: `seed-demo-catalog.sql`

**Archivo:** `supabase/seed-demo-catalog.sql`

Script idempotente que inserta:

- **Producto:** "Leche" (source: manual)
- **Categoría:** "Lácteos"
- **Variantes:**
  - "Leche — caja 1L" (1000ml)
  - "Leche — botella 1.5L" (1500ml)
- **Marcas (por variante):**
  - "Dos Pinos"
  - "Finca Suiza"
- **Precios (por tienda × marca × variante):**
  ```
  Caja 1L:
    MaxiPali:  Dos Pinos 850, Finca Suiza 950
    Walmart:   Dos Pinos 880, Finca Suiza 990
    MasXMenos: Dos Pinos 820, Finca Suiza 920

  Botella 1.5L:
    MaxiPali:  Dos Pinos 1200, Finca Suiza 1400
    Walmart:   Dos Pinos 1250, Finca Suiza 1450
    MasXMenos: Dos Pinos 1180, Finca Suiza 1380
  ```

Permite probar sin depender del matching automático (spec 3).

### 3. Documentación: `SPEC-02-TESTING.md`

Guía completa con:
- Cómo ejecutar migraciones
- Ejemplos curl y TypeScript para invocar
- Respuesta esperada
- Cómo validar cada Acceptance Criterion

---

## Criterios de aceptación de Spec 2

| AC | Implementado | Nota |
|---|---|---|
| Invocar `search_catalog("leche")` devuelve "Leche" con variantes, marcas y rango correcto | ✅ | Con datos de seed cargados |
| Rango de precio coincide exactamente con min/max de latest_prices | ✅ | Función usa `latest_prices` directamente |
| Con household_id + tienda oculta, rango es distinto (más angosto) | ✅ | Filtra visible tiendas usando `household_store_preferences` |
| `search_catalog("xyznoexiste")` devuelve `[]` | ✅ | No hay match en pg_trgm |
| `search_catalog("lehce")` (typo) encuentra "Leche" | ✅ | pg_trgm tolerance habilitada |
| Búsqueda < 2 caracteres devuelve `[]` | ✅ | Validación early return |
| RPC invocable vía PostgREST con anon key | ✅ | `security invoker = true`, RLS policies public read |

---

## Estructura de respuesta

La función devuelve array de objetos JSON:

```json
[
  {
    "product_catalog_id": "uuid",
    "name": "string",
    "category": "string | null",
    "variants": [
      {
        "variant_id": "uuid",
        "name": "string",
        "base_unit": "ml | g | unidad",
        "base_quantity": "number",
        "image_url": "string | null",
        "brands": [
          {
            "brand_id": "uuid",
            "name": "string",
            "logo_url": "string | null"
          }
        ],
        "price_ranges": {
          "maxipali": { "min": number, "max": number },
          "walmart": { "min": number, "max": number },
          "masxmenos": { "min": number, "max": number }
        }
      }
    ]
  }
]
```

---

## Próximos pasos para el usuario

1. **Ejecutar la migración** `001_add_search_catalog_rpc.sql` en Supabase
2. **Cargar datos de prueba** `seed-demo-catalog.sql`
3. **Probar la función** usando los ejemplos en SPEC-02-TESTING.md
4. **Validar cada AC** contra la tabla de Acceptance Criteria

---

## Archivos creados

- ✅ `supabase/migrations/001_add_search_catalog_rpc.sql` — función RPC
- ✅ `supabase/seed-demo-catalog.sql` — datos de prueba
- ✅ `supabase/migrations/SPEC-02-TESTING.md` — guía de testing
- ✅ `SPEC-02-IMPLEMENTATION.md` — este archivo

---

**Estado:** Listo para ejecutar. No requiere setup de Next.js ni env vars adicionales — es Postgres puro.
