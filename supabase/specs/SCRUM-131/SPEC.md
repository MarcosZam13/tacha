# SPEC — SCRUM-131: lista curada de productos madre y reglas de mapeo en la normalización

Ticket: [SCRUM-131](https://tacha.atlassian.net/browse/SCRUM-131) · Dueño: Daniel Salas · Sprint 3
Origen: resultado de QA sobre SCRUM-126 (split b) y respuesta del líder de proyecto (2026-10-03).

Ver también: [supabase/README.md#migraciones](../../README.md#migraciones) · [SCRUM-134/SPEC.md](../SCRUM-134/SPEC.md) (regla de migraciones) · [docs/documento-proyecto.md §7](../../../docs/documento-proyecto.md) (decisión de arquitectura del JSON+script, 2026-10-09) · [DECISION-SCRUM-126-poblacion-del-catalogo.md](../../../docs/catalogo-scraping/DECISION-SCRUM-126-poblacion-del-catalogo.md) (decisión que origina este ticket, con la corrección de 2026-10-09 sobre el orden de señales) · [spec-03-normalizacion-staging.md](../../../docs/catalogo-scraping/specs/spec-03-normalizacion-staging.md) (precedente: por qué la categoría debe filtrar antes que el keyword)

## 1. Intención

`normalize_staging_row` (migración `002`) crea una madre nueva (`product_catalog`) por cada fila de staging que no tenga >40% de similitud de texto con una madre existente. Como el nombre scrapeado es el SKU completo ("Jabón Dove Leche de Coco - 90 g"), casi nunca converge: hoy hay 28 "madres" que en realidad son SKUs, `categories` tiene 0 filas y `category_id` siempre es `null`.

Este ticket reemplaza esa lógica: el normalizador deja de crear madres. Cada fila de staging se asigna a una madre de una **lista curada y versionada** (~200-300 productos genéricos, ej. "Leche"), usando palabras clave y la categoría de VTEX. Si no encaja en ninguna, la fila se queda `pending` — nunca entra "a la fuerza".

## 2. Situación verificada (2026-10-09, consultas de solo lectura contra `scrap-bd`)

| Tabla | Filas | Nota |
|---|---|---|
| `product_catalog` | 28 | Todas son SKU completo, no genéricos |
| `categories` | 0 | — |
| `product_catalog_staging` | 100 | 50 `pending`, 44 `matched`, 6 `rejected` |
| `recipe_ingredients` | 2095 | Referencian solo **11** `product_catalog` distintos |
| `list_items` | 40 | Referencian (vía variante) los mismos 11 `product_catalog` |

**Nota:** las 100 filas de staging disponibles hoy son todas de MaxiPali — Walmart y MasXMenos aún no se han scrapeado (las 3 Edge Functions de ingesta ya existen y tienen la misma forma, ver `supabase/README.md`). La validación de la regla contra esos 2 súper se hace apenas haya datos, sin bloquear este ticket.

Ejemplos reales que muestran por qué el keyword solo no basta (la palabra "leche" aparece en 4 de las 100 filas reales en productos que no son leche, cada uno con categoría de VTEX correcta y sin ambigüedad — mismo hallazgo que corrige [DECISION-SCRUM-126-poblacion-del-catalogo.md](../../../docs/catalogo-scraping/DECISION-SCRUM-126-poblacion-del-catalogo.md)):

| `scraped_name` | Categoría VTEX (`raw_json.product.categories[0]`) |
|---|---|
| Jabón Dove Leche de Coco - 90 g | `/Higiene y Belleza/Cuidado Corporal/Jabón y gel corporal/` |
| Leche De Magnesia Phillips, Sabor Original -360 ml | `/Farmacia/Sistema Digestivo/Antiácidos/` |
| Crema de Leche Nestlé - 236g | `/Abarrotes/Harinas y Repostería/Repostería/` |
| Torta Dulce Leche Economica Bucca 938g | `/Panadería y tortillería/Repostería y Pastelería/Pasteles, Tartas y Pays/` |

## 3. Alcance del primer lote: 12 madres, todas con evidencia real (nada inventado)

El ticket pide ~200-300 madres en total, pero solo a lo largo de varios PRs de datos (ya lo dice el ticket; confirmado también en `DECISION-SCRUM-126-poblacion-del-catalogo.md`: "falta definir... el primer subconjunto, que debe cubrir los ingredientes de las recetas y listas actuales"). Este PR entrega únicamente ese primer subconjunto: las madres que hacen falta para (a) no romper los 11 `product_catalog` que hoy usan recetas/listas (necesario para que SCRUM-133 no las rompa) y (b) cubrir el 100% de las 100 filas reales de staging que ya existen. Ninguna madre de este lote es especulativa.

| Madre | Categoría | Evidencia |
|---|---|---|
| Leche | Lácteos | Recetas/listas + 11 filas reales de staging (Entera, Semidescremada, Deslactosada, En Polvo) |
| Leche condensada | Lácteos | Receta/lista + 4 filas reales de staging |
| Leche evaporada | Lácteos | Receta/lista + 4 filas reales de staging |
| Leche de coco | Lácteos | Receta/lista (VTEX la categoriza junto con "Leche Entera"; el keyword "coco" desempata — ver §6) |
| Crema de leche | Abarrotes/Repostería | Receta/lista + 1 fila real de staging |
| Chocolate | Abarrotes/Dulces y Chocolates | Receta/lista + 4 filas reales de staging |
| Cereal | Abarrotes/Cereales y Barras | Receta/lista + 3 filas reales de staging (Cereal Dulce + Barras de Cereal) |
| Dulces (caramelos) | Abarrotes/Dulces y Chocolates | Lista + 1 fila real de staging |
| Jabón | Higiene y Belleza | Lista + 1 fila real de staging |
| Arroz | Abarrotes/Arroz, Frijol y Semillas | 50 de las 100 filas reales de staging — es la mitad del scraping actual |
| Helado | Alimentos Congelados | 3 filas reales de staging |
| Repostería (tortas/pasteles) | Panadería y tortillería | 3 filas reales de staging |

**Lo que queda fuera a propósito:** "Leche De Magnesia Phillips" (antiácido, categoría `/Farmacia/Sistema Digestivo/Antiácidos/`) no tiene madre curada en este lote — no es un producto de abarrotes/receta, y crear una madre solo para esa fila sería inventar cobertura sin evidencia de uso real. Se espera que quede `pending`; es el caso de prueba que confirma que el normalizador no fuerza una fila a encajar donde no corresponde (ver `plan.md` §5 y `supabase/tests/020_curated_mothers.test.sql`).

## 4. Alcance

**Sí incluye:**
- Tabla nueva `product_mother_rules` (migración `020`) con las reglas de mapeo, cargada desde `supabase/data/madres.json` vía script generador (decisión de arquitectura del 2026-10-09).
- Seed de `categories` (una por cada categoría distinta de la lista curada).
- Seed de `product_catalog` global con las madres curadas (upsert por nombre, nunca borra ni duplica — los IDs de las 28 madres viejas no se tocan).
- Reescritura de `normalize_staging_row`: ya no crea madres; asigna a una madre curada por reglas o deja `pending`.
- Reporte sobre las 100 filas de staging reales: cuántas matchean, cuántas quedan `pending`, cuántas mal asignadas.
- Hardening de seguridad del comentario de Marcos (2026-10-06): `search_path` fijo en `normalize_staging_row`, `normalize_pending_staging`, `parse_size_text`, `search_catalog`; revocar `execute` de `anon`/`authenticated`/`public` en las funciones de normalización (solo las corre el batch con service role); revocar `INSERT/UPDATE/DELETE/TRUNCATE` de `anon`/`authenticated` en las tablas del catálogo (mismo patrón que la migración `009`).

**No incluye (confirmado en el ticket):**
- Resetear el catálogo existente ni borrar las 28 madres viejas (SCRUM-133).
- El script de batch mensual (SCRUM-132).
- Cualquier UI.
- Completar las 200-300 madres de una sola vez — este PR entrega las 12 de §3; el resto crece en PRs de datos posteriores (ya lo dice el ticket).

## 5. Formato de `supabase/data/madres.json`

```json
[
  {
    "name": "Leche",
    "category": "Lácteos",
    "match_keywords": ["leche"],
    "exclude_keywords": ["magnesia", "jabon", "chocolate", "condensada", "evaporada", "coco", "polvo"],
    "vtex_category_prefix": "/Lácteos/Leche/"
  },
  {
    "name": "Leche condensada",
    "category": "Lácteos",
    "match_keywords": ["leche condensada", "condensada"],
    "exclude_keywords": [],
    "vtex_category_prefix": "/Lácteos/Leche/Condensada/"
  }
]
```


## 6. `normalize_staging_row` — comportamiento nuevo

**Orden de las señales (decidido 2026-10-09): la categoría de VTEX manda sobre el keyword.** El súper ya clasificó cada producto en su propia categoría (`raw_json.product.categories`), y esa clasificación es la que distingue de forma confiable un jabón de un lácteo aunque ambos digan "leche" en el nombre — el keyword por sí solo no alcanza para esa distinción (ver §2, tabla de ejemplos reales).

1. Parsear tamaño igual que hoy (`parse_size_text`, sin cambios).
2. Si la fila tiene categoría de VTEX (`raw_json.product.categories`) que coincide con el `vtex_category_prefix` de una regla, y ninguno de sus `exclude_keywords` aparece en `scraped_name`: esa regla asigna la madre.
3. Si la fila no tiene categoría utilizable (o ninguna regla tiene `vtex_category_prefix` que coincida), se decide solo por `match_keywords` (sin que aparezca ningún `exclude_keywords`).
4. Si matchean 2+ reglas por categoría, gana la de prefijo más específico (más segmentos en el path); si siguen empatadas, la de más `match_keywords` coincidentes.
5. Si hay match: usar (o crear, si es la primera vez que esa madre tiene esa variante de tamaño) el `product_catalog` / `product_catalog_variants` / `product_brands` correspondiente — igual que hoy, pero sin el `insert into product_catalog` de madre nueva.
6. Si no hay match: la fila queda `pending` (no se marca `rejected` — `rejected` sigue siendo solo para error de parseo o precio, igual que hoy).
7. Correr dos veces sobre las mismas filas no cambia nada (criterio de aceptación de idempotencia) — ya lo garantiza el `where pcv.product_catalog_id = ... and base_unit = ... and base_quantity = ...` que ya existe.

`search_catalog` no cambia de firma ni de contrato — solo empieza a devolver `category` no nula porque `category_id` deja de ser siempre `null`.

## 7. Reporte pedido (criterio de aceptación)

Corrido con `BEGIN; select normalize_pending_staging(100); -- revisar; ROLLBACK;` contra la base real (procedimiento completo en `plan.md` §5), con salida: total procesado, matched, pending, y una revisión manual de los `matched` contra categorías "sospechosas" (ej. algo con "leche" en el nombre que cayó en una madre de lácteos pero la categoría VTEX es de dulces).

## 8. Criterios de aceptación (Jira, con seguimiento)

- [x] Lista versionada (`supabase/data/madres.json`) + script generador + tabla de reglas (migración) en el repo, formato documentado (§5).
- [x] Normalizador asigna a madres curadas; no crea madres; filas sin match quedan `pending` (confirmado con "Leche De Magnesia Phillips").
- [x] Reporte sobre las 100 filas reales: 92 `matched` (44 del normalizador viejo + 48 nuevas), 8 `rejected` por `parse_size_text` (no por madres mal asignadas — ver SCRUM-138, fuera de alcance), 0 mal asignadas en la revisión manual.
- [x] Variantes por tamaño (`parse_size_text`, sin cambios), marca como detalle, `source = 'scraped'` en precios.
- [x] Correrlo dos veces no cambia nada (cubierto por el test de idempotencia en `supabase/tests/020_curated_mothers.test.sql`).
- [x] Migración sigue la regla de SCRUM-134 (número `020`, aplicada por el autor, registrada en `supabase_migrations.schema_migrations` en la misma transacción).
- [x] (Extra de Marcos, 2026-10-06) `search_path` fijo en las 4 funciones; `execute` revocado de `anon`/`authenticated`/`public` en las funciones de normalización; `INSERT/UPDATE/DELETE/TRUNCATE` revocado de `anon`/`authenticated` en las tablas del catálogo (migración `020`) y en `search_cache`/`search_log` (migración `021`, corrección de un hueco de alcance encontrado en la revisión final — ver `plan.md` §4); `categories` poblada (7 filas).

## 9. Aviso al equipo (texto para las Developer Notes del PR al pasar a `waiting qa`)

Equipo notificado (WhatsApp, 2026-10-09): se usará la migración #20. Texto para el PR: nueva tabla vía migración; el normalizador ya no crea madres; las 28 madres viejas se quedan hasta SCRUM-133; filas sin match quedan `pending`; gana la regla más específica.
