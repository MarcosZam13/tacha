# Spec 2: Función RPC `search_catalog` — Guía de Testing

## ¿Qué se implementó?

Función RPC Postgres (`search_catalog`) que busca en el catálogo normalizado y devuelve productos con:
- Variantes (tamaños/presentaciones)
- Marcas disponibles
- Rango de precios (min-max) por tienda
- Filtro opcional por household preferences

## Cómo ejecutar las migraciones y seed

### Opción A: CLI de Supabase

```bash
# Desde la raíz del proyecto
supabase migration up

# Cargar datos de prueba en la BD local/remota
# (ejecutar el script SQL directo en el editor de SQL de Supabase)
```

### Opción B: Supabase Dashboard (Table Editor + SQL Editor)

1. Abre Supabase → proyecto **scrap-bd**
2. SQL Editor → nuevo query
3. Copia el contenido de `supabase/migrations/001_add_search_catalog_rpc.sql`
4. Ejecuta
5. Repite con `supabase/seed-demo-catalog.sql`

## Cómo invocar `search_catalog`

### Vía PostgREST (desde frontend, Postman, curl)

```bash
# Test 1: Búsqueda básica sin household_id
curl -X POST "https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_term":"leche"}'

# Test 2: Con household_id (filtro de tiendas)
curl -X POST "https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_term":"leche", "household_id":"<uuid-de-prueba>"}'

# Test 3: Búsqueda vacía (debe devolver [])
curl -X POST "https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_term":""}'

# Test 4: Término que no existe
curl -X POST "https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_term":"xyznoexiste"}'

# Test 5: Typo (pg_trgm tolerancia)
curl -X POST "https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"search_term":"lehce"}'
```

### Vía TypeScript/JavaScript

```typescript
const response = await fetch(
  'https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search_term: 'leche',
      household_id: null, // opcional
    }),
  }
);

const products = await response.json();
console.log(products);
```

## Respuesta esperada (con datos de seed)

```json
[
  {
    "product_catalog_id": "uuid-1",
    "name": "Leche",
    "category": "Lácteos",
    "variants": [
      {
        "variant_id": "uuid-2",
        "name": "Leche — caja 1L",
        "base_unit": "ml",
        "base_quantity": 1000,
        "image_url": "https://example.com/leche-caja-1l.jpg",
        "brands": [
          {
            "brand_id": "uuid-3",
            "name": "Dos Pinos",
            "logo_url": "https://example.com/dos-pinos-logo.png"
          },
          {
            "brand_id": "uuid-4",
            "name": "Finca Suiza",
            "logo_url": "https://example.com/finca-suiza-logo.png"
          }
        ],
        "price_ranges": {
          "maxipali": { "min": 850, "max": 950 },
          "walmart": { "min": 880, "max": 990 },
          "masxmenos": { "min": 820, "max": 920 }
        }
      },
      {
        "variant_id": "uuid-5",
        "name": "Leche — botella 1.5L",
        "base_unit": "ml",
        "base_quantity": 1500,
        "image_url": "https://example.com/leche-botella-1.5l.jpg",
        "brands": [
          {
            "brand_id": "uuid-6",
            "name": "Dos Pinos",
            "logo_url": "https://example.com/dos-pinos-logo.png"
          },
          {
            "brand_id": "uuid-7",
            "name": "Finca Suiza",
            "logo_url": "https://example.com/finca-suiza-logo.png"
          }
        ],
        "price_ranges": {
          "maxipali": { "min": 1200, "max": 1400 },
          "walmart": { "min": 1250, "max": 1450 },
          "masxmenos": { "min": 1180, "max": 1380 }
        }
      }
    ]
  }
]
```

## Acceptance Criteria — Cómo verificar

| Criterio | Cómo probar | Resultado esperado |
|---|---|---|
| `search_catalog("leche")` devuelve "Leche" con variantes y precios | Test 1 arriba | Response con 2 variantes, 2 marcas cada una, rango min-max por tienda |
| Rango de precio es min-max exacto de los datos | Comparar contra `latest_prices` directamente | maxipali caja 1L: min=850, max=950 |
| `household_id` con tienda oculta da rango distinto | Crear household, ocultar maxipali, comparar ranges | Sin maxipali: rango más angosto |
| `search_catalog("xyznoexiste")` devuelve `[]` | Test 4 | Array vacío |
| `search_catalog("lehce")` (typo) encontró "Leche" | Test 5 | Response con Leche (pg_trgm tolerance) |
| `search_catalog("")` devuelve `[]` | Test 3 | Array vacío |

## Datos de prueba pre-cargados

El script `seed-demo-catalog.sql` inserta:

- **Producto:** "Leche" (catálogo global)
- **Variantes:** "Leche — caja 1L" (1000ml), "Leche — botella 1.5L" (1500ml)
- **Marcas:** "Dos Pinos", "Finca Suiza" (para cada variante)
- **Precios:** en las 3 tiendas (maxipali, walmart, masxmenos)

Todos los precios tienen disponibilidad `is_available = true`.

## Próximos pasos

- **Spec 3:** Construcción del matching automático (staging → catálogo normalizado)
- **Spec 4:** Integración con households y filtros de preferencias
- Uso de esta función en la UI de búsqueda del frontend
