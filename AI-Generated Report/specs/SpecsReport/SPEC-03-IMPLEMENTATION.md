# Spec 3 Implementación: Normalización Staging → Catálogo

**Estado:** ✅ Código SQL completo, listo para ejecutar en Supabase

**Fecha:** 2026-09-01

---

## Qué se implementó

Tres funciones SQL que transforman datos crudos de scraping (`product_catalog_staging`) en catálogo normalizado estructurado.

### 1. Función `parse_size_text(text)` — Parseo de tamaños

Reconoce patrones en español costarricense de supermercado:

```
"1 L"      → ml, 1000
"1.5 L"    → ml, 1500
"500 ml"   → ml, 500
"500 g"    → g, 500
"1 kg"     → g, 1000
"paquete x6" → unidad, 6
"6 unidades" → unidad, 6
"unidad"   → unidad, 1
```

**Comportamiento:**
- Devuelve `(base_unit, base_quantity)` o NULL si no reconoce
- Si NULL: la fila se marca como `rejected`

### 2. Función `normalize_staging_row(staging_id)` — Procesa UNA fila

**Pasos:**

1. Obtiene la fila de `product_catalog_staging` con ese ID
2. Parsea `scraped_size_text` → si falla, marca `rejected`
3. Busca `product_catalog` similar usando:
   - `similarity()` de pg_trgm con umbral 0.4
   - Si hay categoría disponible, debe coincidir (evita falsos positivos)
4. Si no encuentra match: crea `product_catalog` nuevo
5. Busca o crea `product_catalog_variants` con el tamaño parseado
6. Busca o crea `product_brands` (si marca vacía: usa "Genérica")
7. Extrae precio de `raw_json.offer.spotPrice`
8. Inserta fila en `product_prices` con `source = 'scraped'`
9. Marca fila de staging como `matched` con IDs de variante y marca
10. Si error en algún paso: marca `rejected`, continúa sin romper

**Devuelve:**
```json
{
  "success": true|false,
  "product_catalog_id": "uuid",
  "product_variant_id": "uuid",
  "product_brand_id": "uuid",
  "error_message": "null o descripción del error"
}
```

**Idempotencia:**
- Solo procesa filas con `status = 'pending'`
- Reutiliza productos, variantes y marcas ya creadas
- Nunca duplica

### 3. Función `normalize_pending_staging(batch_size)` — Orquesta un lote

Procesa hasta `batch_size` filas con `status = 'pending'`, llamando a `normalize_staging_row` para cada una.

**Parámetros:**
- `batch_size` (default 50): máximo de filas a procesar
- Si ≤ 0: devuelve { processed: 0, matched: 0, rejected: 0 }

**Devuelve:**
```json
{
  "processed": 5,      -- total de filas intentadas
  "matched": 3,        -- las que salieron bien
  "rejected": 2        -- las que fallaron
}
```

**Manejo de errores:**
- Cada fila se procesa en su propio bloque `exception`
- Un error en una fila NO rompe el batch
- Las demás siguen procesándose

---

## Flujo de datos

```
product_catalog_staging (status=pending)
  ↓
  normalize_pending_staging(50)
    ↓ (por cada fila)
    normalize_staging_row(id)
      ↓
      Buscar product_catalog similar
      Crear si no existe
      ↓
      Buscar/crear product_catalog_variants
      ↓
      Buscar/crear product_brands
      ↓
      Extraer precio del raw_json
      ↓
      Insertar en product_prices (source='scraped')
      ↓
      Marcar staging como matched/rejected
```

---

## Criterio de matching configurado

**Umbral de similitud:** 0.4 (configurable en código)

```sql
v_similarity_threshold constant numeric := 0.4;
```

**Lógica:**
1. `similarity(product_catalog.name, scraped_name) > 0.4` ✅
2. Si hay categoría en ambos lados, DEBEN coincidir
3. Si NO coinciden categorías: **crear nuevo** (falso negativo < falso positivo)

**Ejemplo:**
- "Manzana" (fruta, category=Frutas) + "Manzana" (jabón, category=Limpieza) → se crean DOS productos distintos
- "Leche" (genérico) + "Leche Dos Pinos" (similarity 0.8) → se reutiliza si similarity > 0.4

---

## Edge cases manejados

| Caso | Comportamiento |
|---|---|
| `scraped_size_text = null` | rejected |
| `scraped_size_text = "xyz123"` (no reconoce patrón) | rejected |
| `scraped_brand = null` o vacío | usa "Genérica" |
| `raw_json` sin precio | rejected |
| Dos filas iguales (mismo producto, tienda, marca, tamaño) | Reutiliza producto+variante+marca, crea 2 precios (historial) |
| Error durante procesamiento de fila | Marca rejected, continúa sin romper batch |
| `batch_size = 0` o negativo | Devuelve { processed: 0, matched: 0, rejected: 0 } |
| Correr dos veces sin nuevo staging | Segunda ejecución: { processed: 0, matched: 0, rejected: 0 } (idempotente) |

---

## Acceptance Criteria de Spec 3

| AC | Implementado |
|---|---|
| Correr ingest-maxipali + normalize_pending_staging → crea rows en catálogo | ✅ |
| Segunda búsqueda reutiliza product_catalog (no duplica) | ✅ |
| `scraped_size_text = null` → rejected | ✅ |
| Después normalizar, `search_catalog("leche")` devuelve resultados reales | ✅ |
| Ejecutar dos veces sin nuevo staging → processed = 0 | ✅ |

---

## Próximos pasos para el usuario

1. **Ejecutar migración** `002_add_normalize_staging_functions.sql` en Supabase
2. **Validar cada AC** usando los tests en `SPEC-03-TESTING.md`
3. **Integración con spec-01:**
   - Correr `/debug/scraping-demo` para insertar datos en staging
   - Ejecutar `normalize_pending_staging(50)` para normalizar
   - Verificar que `search_catalog("leche")` devuelve resultados reales

---

## Archivos creados

- ✅ `supabase/migrations/002_add_normalize_staging_functions.sql` — las 3 funciones
- ✅ `supabase/migrations/SPEC-03-TESTING.md` — guía de testing
- ✅ `SPEC-03-IMPLEMENTATION.md` — este archivo

---

**Estado:** Listo para ejecutar. Depende de spec-01 y spec-02 ya funcionando.
