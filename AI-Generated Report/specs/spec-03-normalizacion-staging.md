# Spec 3 — Normalización: de staging crudo a catálogo real (matching)

> Nota: esta spec NO viene de una historia de usuario — es la pieza central que falta del core de scraping/catálogo. Sin esto, el catálogo normalizado (spec 2) nunca tiene datos reales, solo los de prueba insertados a mano. Es la spec más compleja de las 4 — se recomienda implementarla después de las specs 1 y 2, con esas dos ya funcionando como referencia de contrato.

## Intent

Construir el proceso que toma filas de `product_catalog_staging` (dato crudo de scraping, `status = 'pending'`) y decide a qué `product_catalog` + `product_catalog_variants` + `product_brands` corresponden — creándolos si no existen, o vinculándolos si ya existen — y en cualquier caso escribe el precio correspondiente en `product_prices`. Al terminar, marca la fila de staging como `matched` (o `rejected` si no se pudo procesar). Esta es la pieza que hace que buscar "leche" hoy eventualmente resulte en un catálogo real y buscable mañana.

## In scope

- Función de Postgres `normalize_staging_row(staging_id uuid)` que procesa UNA fila de staging:
  1. Busca si ya existe un `product_catalog` cuyo `name` sea similar (usar `similarity()` de `pg_trgm`, umbral configurable, ej. `> 0.4`) al `scraped_name` de esa fila, dentro de la misma categoría si es posible.
  2. Si existe un match confiable (similarity alta): reutiliza ese `product_catalog_id`.
  3. Si NO existe match confiable: crea un `product_catalog` nuevo con `source = 'scraped'`.
  4. Dentro de ese producto madre, busca o crea la `product_catalog_variants` correspondiente al tamaño (`scraped_size_text` parseado a `base_unit`/`base_quantity` — ver "Requirements" para cómo parsear).
  5. Dentro de esa variante, busca o crea el `product_brands` correspondiente a `scraped_brand`.
  6. Inserta una fila en `product_prices` con el precio de `raw_json.offer`, la variante, la marca y el súper de esa fila de staging.
  7. Marca la fila de staging como `status = 'matched'`, `matched_variant_id`, `matched_brand_id`.
  8. Si en cualquier paso no se puede determinar un dato mínimo (ej. no se puede parsear el tamaño), marca la fila como `status = 'rejected'` sin crear nada en el catálogo, y no lanza excepción que rompa el batch.
- Función orquestadora `normalize_pending_staging(batch_size int default 50)` que selecciona hasta `batch_size` filas `status = 'pending'` y llama a `normalize_staging_row` para cada una, devolviendo un resumen `{ processed, matched, rejected }`.
- Documentar (código o comentario SQL) el criterio exacto de "match confiable" usado, para que el equipo lo pueda ajustar.

## Out of scope

- No implementar una cola de revisión humana con UI — por ahora, las filas `rejected` o con similarity ambigua (ej. entre 0.2 y 0.4) simplemente quedan en `pending`/`rejected` para revisión manual desde el Table Editor de Supabase, tal como ya se usa hoy (ver reporte de decisiones, sección "quién revisa esto").
- No implementar el trigger automático que dispara el matching al insertar en staging — esta función se invoca explícitamente (por cron programado, o manualmente), nunca por trigger `AFTER INSERT` (decisión ya tomada y justificada, ver reporte sección 5.5).
- No resolver el caso de productos con `scraped_size_text` completamente ambiguo o vacío en esta primera versión — simplemente rechazarlos (`status = 'rejected'`) y dejarlos para revisión manual.
- No implementar deduplicación de precios duplicados el mismo día (insertar dos veces el mismo precio en el mismo día no rompe nada, solo genera una fila extra en el historial — aceptable para esta versión).

## Requirements

1. Parseo de `scraped_size_text` a `base_unit`/`base_quantity`: debe reconocer patrones comunes en español costarricense de supermercado — "1 L", "1L", "1000ml", "500 g", "500g", "1 kg", "paquete x6", "unidad". Si el patrón no se reconoce, la fila se marca `rejected`, no se debe inventar un valor.
2. El criterio de "match confiable" para `product_catalog` debe combinar: `similarity(product_catalog.name, scraped_name) > umbral` Y, si `category_id` está disponible en ambos lados, que coincida — nunca matchear solo por similitud de texto sin considerar categoría cuando esta esté disponible.
3. La función debe ser idempotente en la medida de lo posible: volver a correr `normalize_pending_staging` sobre filas ya `matched` no debe hacer nada (el filtro `status = 'pending'` ya lo garantiza, pero debe documentarse explícitamente que no se debe cambiar ese filtro sin pensar en las consecuencias).
4. Cada `product_prices` insertado debe usar `source = 'scraped'` siempre — este proceso nunca inserta con `source = 'manual'`.
5. El manejo de errores dentro de `normalize_staging_row` no debe abortar toda la transacción del batch — un error en una fila no debe impedir que las demás se procesen (usar bloques `exception` por fila, o llamar cada fila en su propia transacción desde la orquestadora).

## Edge cases & errors

- Dos filas de staging del mismo scraping (misma búsqueda) resultan en el mismo producto+marca+tamaño (normal: VTEX puede repetir el mismo SKU si el usuario buscó dos veces): ambas deben terminar apuntando al mismo `product_catalog_variants`/`product_brands` (reutilizados, no duplicados) — solo se espera una fila nueva en `product_prices` por cada una (eso sí es esperado, es historial).
- Un producto con nombre casi idéntico a otro ya existente pero de categoría distinta (ej. "Manzana" fruta vs. un jabón de manzana llamado "Manzana" en limpieza): el filtro de categoría del requirement 2 debe evitar que se mezclen — si no hay categoría confiable de ningún lado, es preferible crear un producto madre nuevo (falso negativo) antes que fusionar dos productos distintos (falso positivo, mucho más dañino para la confianza del catálogo).
- `scraped_brand` vacío o null (a veces VTEX no manda marca): usar un valor "Genérica"/"Sin marca" en vez de fallar toda la fila — documentar esta decisión explícitamente en el código.
- Ejecutar `normalize_pending_staging` con `batch_size = 0` o negativo: debe devolver `{ processed: 0, matched: 0, rejected: 0 }` sin error, no debe interpretarse como "sin límite".

## Constraints

- Implementar en Postgres (`plpgsql`), invocable vía RPC o desde un cron — no como Edge Function (el trabajo es 100% sobre datos que ya están en la base, no requiere ninguna llamada HTTP externa).
- Usar `pg_trgm` `similarity()`, ya disponible en el proyecto — no agregar una extensión nueva sin justificarlo aparte.
- No debe requerir cambios al schema de `product_catalog_staging` ya definido (columnas `status`, `matched_variant_id`, `matched_brand_id` ya existen exactamente para este propósito).

## Acceptance criteria

- [ ] Correr `ingest-maxipali` con `{ "query": "leche" }` y luego `normalize_pending_staging()` deja al menos una fila en `product_catalog`/`product_catalog_variants`/`product_brands`/`product_prices`, y la fila de staging correspondiente pasa a `status = 'matched'`.
- [ ] Correr la misma búsqueda una segunda vez (nuevo staging) y volver a normalizar reutiliza el `product_catalog`/`product_catalog_variants`/`product_brands` ya creados (no duplica productos madre) — verificable contando filas antes/después.
- [ ] Una fila de staging con `scraped_size_text = null` o un texto no reconocible termina en `status = 'rejected'`, sin crear nada en el catálogo.
- [ ] Después de normalizar, `search_catalog("leche")` (spec 2) devuelve resultados reales, no solo los de datos de prueba.
- [ ] Ejecutar `normalize_pending_staging(50)` dos veces seguidas sin nuevo staging entre medio no cambia ningún dato la segunda vez (`processed: 0` porque ya no hay `pending`).
