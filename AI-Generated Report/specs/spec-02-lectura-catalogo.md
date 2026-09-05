# Spec 2 — Servicio de lectura del catálogo normalizado (búsqueda + rango de precio)

> Nota: esta spec NO viene de una historia de usuario — es documentación/demo del contrato de lectura que el resto del equipo (listas, recetas, grupos, dashboard) va a consumir. Construye la función RPC de lectura, no el pipeline de scraping (eso ya existe, spec 1) ni el matching (spec 3).

## Intent

Construir la función RPC (`search_catalog`, en Postgres, invocable vía PostgREST) que el frontend usa para buscar en el catálogo normalizado y recibir, por cada producto madre encontrado, sus variantes de tamaño, sus marcas disponibles, y el rango de precio (mínimo–máximo) por supermercado — exactamente el contrato que la sección 4.5/4.8 del documento del equipo describe ("catálogo estilo Uber Eats" + "precio como rango, no promedio"). Esta es la función que TODO el resto de la app debe usar para leer el catálogo — nadie debe hacer `select * from product_catalog` directo desde el frontend.

## In scope

- Función SQL `search_catalog(search_term text, household_id uuid default null)` que:
  - Busca en `product_catalog.name` con `pg_trgm` (tolerante a errores de tipeo).
  - Para cada `product_catalog` que matchea, trae sus `product_catalog_variants`.
  - Para cada variante, trae sus `product_brands` disponibles.
  - Para cada marca, calcula el precio mínimo y máximo (`min(price)`, `max(price)`) agrupando por variante+súper usando `latest_prices`.
  - Si se pasa `household_id`, filtra los súpers usando `household_store_preferences` (solo cuenta el rango de precio de tiendas visibles para ese household — ver reporte, sección 6, y spec 4).
- Forma de la respuesta (JSON, un array de productos madre):
```json
[
  {
    "product_catalog_id": "uuid",
    "name": "Leche",
    "category": "Lácteos",
    "variants": [
      {
        "variant_id": "uuid",
        "name": "Leche — caja 1L",
        "base_unit": "ml",
        "base_quantity": 1000,
        "image_url": "...",
        "brands": [
          { "brand_id": "uuid", "name": "Dos Pinos", "logo_url": "..." }
        ],
        "price_range": { "min": 800, "max": 1200, "currency": "CRC" }
      }
    ]
  }
]
```
- Un script de datos de prueba (`seed-demo-catalog.sql`) que inserte a mano 2-3 productos madre completos (ej. "Leche" con 2 variantes y 2 marcas cada una, con precios en las 3 tiendas) para poder probar la función sin depender de que el matching real (spec 3) ya exista.

## Out of scope

- No construir el matching automático staging→catálogo (spec 3) — los datos de prueba se insertan a mano vía SQL.
- No construir la UI de búsqueda del frontend — solo la función RPC y su contrato.
- No implementar filtros de categoría, ordenamiento, ni paginación — solo búsqueda por texto. Eso puede ser una spec futura si el equipo lo necesita.
- No implementar el descuento de disponibilidad de stock en tiempo real — usa `is_available` tal como está en `latest_prices`, sin lógica adicional.

## Requirements

1. La función debe ser invocable vía PostgREST/RPC: `POST /rest/v1/rpc/search_catalog` con body `{ "search_term": "leche", "household_id": null }`.
2. El rango de precio debe calcularse SIEMPRE como mínimo y máximo entre las marcas disponibles de esa variante en ese súper — nunca un promedio (esto es una decisión ya cerrada por el equipo, documento sección 4.8, no es negociable en esta spec).
3. Si `household_id` es `null` o no se pasa, el rango de precio se calcula usando las 3 tiendas (comportamiento por defecto, sin filtro).
4. Si `household_id` tiene valor, aplicar el filtro de `household_store_preferences` tal como se especifica en la Spec 4 antes de calcular el rango — una tienda oculta (`visible = false`) no debe aportar precios al rango.
5. Un producto madre sin ninguna variante con precio vigente no debe aparecer en los resultados (evitar mostrar tarjetas vacías).
6. La búsqueda debe tolerar errores de tipeo leves (ej. "lehce" debería seguir encontrando "Leche") gracias al índice `pg_trgm` ya existente en `product_catalog.name`.

## Edge cases & errors

- Búsqueda vacía o de menos de 2 caracteres: la función debe devolver un array vacío `[]`, no un error — a diferencia de las Edge Functions de ingesta (que sí validan longitud mínima con un 400), esta es una función de lectura pura y debe ser tolerante.
- Un producto madre con variantes pero sin ninguna marca cargada (staging nunca se normalizó del todo): esa variante debe excluirse del resultado o mostrarse con `brands: []` y `price_range: null` — decisión a tomar por quien implemente, pero debe documentarse cuál se eligió, no dejarlo ambiguo.
- `household_id` que no existe en `household_store_preferences`: se comporta igual que "sin filtro" (todas las tiendas visibles), porque el default es `visible = true` cuando no hay fila — no debe tratarse como error.
- Dos marcas con el mismo precio exacto: el rango igual debe mostrarse como `min = max` (ej. "₡900–₡900"), no colapsar a un solo número — el frontend decide cómo mostrarlo, la función siempre devuelve ambos campos.

## Constraints

- Implementar como función de Postgres (`plpgsql` o `sql`), no como Edge Function — esto es lectura pura sobre datos que ya están en Postgres, el caso de uso exacto para el que PostgREST + RPC está pensado (ver reporte de decisiones, sección 5.4).
- No debe requerir `service_role` — debe ser invocable con la `anon key` normal, protegida por las policies de RLS ya existentes (lectura pública en `product_catalog`/`product_catalog_variants`/`product_brands`/`product_prices`).
- Reusar `latest_prices` (la vista ya existente) para obtener el precio vigente, no reimplementar esa lógica de "último precio" dentro de la función nueva.

## Acceptance criteria

- [ ] Con los datos de prueba del seed cargados, invocar `search_catalog("leche")` devuelve el producto "Leche" con sus variantes, marcas y rango de precio correcto (verificable a mano contra los datos insertados).
- [ ] El rango de precio de una variante coincide exactamente con `min`/`max` de los precios de prueba insertados para esa variante en `latest_prices`.
- [ ] Invocar con un `household_id` de prueba que tenga una tienda oculta (`visible = false` en `household_store_preferences`) da un rango de precio distinto (más angosto) que invocar sin `household_id`.
- [ ] `search_catalog("xyznoexiste")` devuelve `[]`.
- [ ] `search_catalog("lehce")` (con error de tipeo) sigue encontrando "Leche" gracias a `pg_trgm`.
