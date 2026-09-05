# Spec 3: Normalización — Guía de Testing

## ¿Qué se implementó?

Tres funciones SQL que procesan `product_catalog_staging` (datos crudos de scraping) y los normalizan al catálogo estructurado:

1. **`parse_size_text(text)`** — Parsea "1L", "500ml", "1kg", etc. a base_unit y base_quantity
2. **`normalize_staging_row(staging_id)`** — Procesa UNA fila de staging
3. **`normalize_pending_staging(batch_size)`** — Orquesta un lote de filas

## Cómo ejecutar las migraciones

### Opción A: CLI de Supabase

```bash
supabase migration up
```

### Opción B: Supabase Dashboard SQL Editor

1. Abre Supabase → proyecto **scrap-bd**
2. SQL Editor → nuevo query
3. Copia el contenido de `supabase/migrations/002_add_normalize_staging_functions.sql`
4. Ejecuta

## Test 1: Parseo de tamaños (parse_size_text)

```sql
-- Debe reconocer estos patrones:
select parse_size_text('1 L');          -- ml, 1000
select parse_size_text('1L');           -- ml, 1000
select parse_size_text('1.5 L');        -- ml, 1500
select parse_size_text('1000 ml');      -- ml, 1000
select parse_size_text('500 g');        -- g, 500
select parse_size_text('1 kg');         -- g, 1000
select parse_size_text('paquete x6');   -- unidad, 6
select parse_size_text('6 unidades');   -- unidad, 6
select parse_size_text('unidad');       -- unidad, 1

-- Debe devolver NULL (se rechaza la fila):
select parse_size_text('xyz123');       -- no reconoce patrón
select parse_size_text('');             -- vacío
select parse_size_text(null);           -- null
```

## Test 2: Procesar UNA fila (normalize_staging_row)

### Preparar datos de staging manual

```sql
-- Insertar una fila de staging "cruda" de prueba
insert into product_catalog_staging (
  store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, image_url, status
) values (
  (select id from stores where slug = 'maxipali'),
  '{"offer": {"spotPrice": 850.00}, "product": "Leche Dos Pinos"}',
  'Leche',
  'Dos Pinos',
  '1 L',
  'https://example.com/leche.jpg',
  'pending'
)
returning id;

-- Guardar el ID devuelto, ej: <staging-id>
```

### Ejecutar normalización

```sql
select * from normalize_staging_row('<staging-id>');

-- Resultado esperado:
-- success: true
-- product_catalog_id: <uuid> (nuevo o reutilizado)
-- product_variant_id: <uuid>
-- product_brand_id: <uuid>
-- error_message: null
```

### Verificar que se crearon los datos

```sql
-- Verificar que product_catalog existe
select * from product_catalog where name = 'Leche';

-- Verificar variante
select * from product_catalog_variants
where product_catalog_id = '<product-id>' and name like 'Leche%1 L%';

-- Verificar marca
select * from product_brands where name = 'Dos Pinos';

-- Verificar precio
select * from product_prices
where product_brand_id = '<brand-id>';

-- Verificar que staging fila pasó a matched
select status, matched_variant_id, matched_brand_id
from product_catalog_staging where id = '<staging-id>';
```

## Test 3: Procesar lote (normalize_pending_staging)

### Preparar múltiples filas

```sql
-- Insertar 5 filas de staging
insert into product_catalog_staging (
  store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status
) values
  ((select id from stores where slug = 'maxipali'),
   '{"offer": {"spotPrice": 900}}', 'Queso', 'Kraft', '500 g', 'pending'),
  ((select id from stores where slug = 'maxipali'),
   '{"offer": {"spotPrice": 2000}}', 'Pan', 'Bimbo', 'paquete x2', 'pending'),
  ((select id from stores where slug = 'walmart'),
   '{"offer": {"spotPrice": 1500}}', 'Leche', 'Finca Suiza', '1.5 L', 'pending'),
  ((select id from stores where slug = 'masxmenos'),
   '{"offer": {"spotPrice": 3000}}', 'Cereal', 'Corn Flakes', 'caja xyz', 'pending'),  -- Este será rejected
  ((select id from stores where slug = 'maxipali'),
   '{"offer": {}}', 'Mantequilla', 'Buñuel', '250 g', 'pending');  -- Este será rejected (sin precio)
```

### Ejecutar batch

```sql
select * from normalize_pending_staging(10);

-- Resultado esperado:
-- processed: 5
-- matched: 3 (Leche, Queso, Pan)
-- rejected: 2 (sin precio, size no reconocible)
```

### Verificar estado

```sql
-- Ver cuántas filas pasaron a matched
select count(*) from product_catalog_staging where status = 'matched';

-- Ver cuántas fueron rejected
select count(*) from product_catalog_staging where status = 'rejected';

-- Ver cuántas aún están pending
select count(*) from product_catalog_staging where status = 'pending';
```

## Test 4: Reutilización (no duplicar productos)

### Primera normalización

```sql
-- Contar productos antes
select count(*) as product_count from product_catalog;

-- Ejecutar batch
select * from normalize_pending_staging(10);

-- Contar después (debe haber aumentado)
select count(*) as product_count from product_catalog;
```

### Segunda normalización (mismas búsquedas)

```sql
-- Insertar nuevas filas de staging con MISMO nombre/marca/tamaño
insert into product_catalog_staging (
  store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status
) values
  ((select id from stores where slug = 'walmart'),
   '{"offer": {"spotPrice": 870}}', 'Leche', 'Dos Pinos', '1 L', 'pending');

-- Ejecutar de nuevo
select * from normalize_pending_staging(10);

-- Contar productos (NO debe haber aumentado — reutiliza)
select count(*) as product_count from product_catalog;

-- Ver que ambas filas apuntan a la MISMA variante
select distinct matched_variant_id from product_catalog_staging
where scraped_name = 'Leche' and matched_variant_id is not null;
-- Debe mostrar 1 solo UUID
```

## Test 5: Integración con search_catalog

```sql
-- Después de normalizar, buscar debe devolver resultados reales
select * from search_catalog('leche', null);

-- Debe devolver el producto "Leche" con variantes y precios reales
-- (no solo los datos de seed de spec 2)
```

## Test 6: Idempotencia

```sql
-- Verificar que correr dos veces no cambia nada
select count(*) as row_count from product_catalog_staging where status = 'pending';
-- Resultado: 0 (ya no hay pending porque ya fueron procesadas)

-- Ejecutar normalize_pending_staging nuevamente
select * from normalize_pending_staging(10);

-- Resultado esperado:
-- processed: 0
-- matched: 0
-- rejected: 0
```

## Test 7: Manejo de marca vacía

```sql
-- Insertar fila sin marca
insert into product_catalog_staging (
  store_id, raw_json, scraped_name, scraped_brand, scraped_size_text, status
) values (
  (select id from stores where slug = 'maxipali'),
  '{"offer": {"spotPrice": 500}}',
  'Agua',
  null,  -- Sin marca
  '2 L',
  'pending'
);

-- Normalizar
select * from normalize_pending_staging(1);

-- Verificar que se creó con marca "Genérica"
select * from product_brands
where product_catalog_variant_id = (
  select id from product_catalog_variants
  where product_catalog_id = (
    select id from product_catalog where name = 'Agua'
  )
);
-- Debe mostrar: "Genérica"
```

## Acceptance Criteria — Validación

| AC | Cómo validar | Esperado |
|---|---|---|
| Correr ingest-maxipali ("leche") + normalize_pending_staging crea rows en catálogo | Ver Test 2 | ≥1 row en product_catalog/variants/brands/prices |
| Segunda búsqueda reutiliza product_catalog (no duplica) | Ver Test 4 | Mismo product_id en 2 filas de staging |
| `scraped_size_text = null` → rejected | Ver Test 3 | status = 'rejected' |
| Después normalizar, search_catalog("leche") devuelve reales | Ver Test 5 | Resultados con precios reales |
| Ejecutar dos veces sin nuevo staging → processed = 0 | Ver Test 6 | { processed: 0, matched: 0, rejected: 0 } |

## Criterio de matching configurado

**En el código:**
```sql
v_similarity_threshold constant numeric := 0.4;
```

Si quieres ajustarlo, cambiar este valor en la función `normalize_staging_row`.

**Lógica:**
- `similarity(name, scraped_name) > 0.4` AND
- Si hay categoría en ambos lados, deben coincidir
- Si no coincide categoría: crear nuevo product (falso negativo es mejor que falso positivo)

## Próximos pasos

Una vez validados todos los ACs:
- Spec 4 integra esto con households y preferencias
- El pipeline de scraping puede correr de verdad sin intervención manual
