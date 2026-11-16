# Plan — SCRUM-133

Ver [SPEC.md](SPEC.md). Skills que aplican: `security-practices` (operación destructiva sobre datos reales de usuarios), `clean-code-practices`, `project-structure`, `constants-standards` (nada de números sin explicar en la migración: ventana demo y nombres de madres van comentados).

## 1. Archivos

```
supabase/migrations/NNN_reset_catalog_old_mothers.sql      nuevo: migración de datos (SPEC §3)
supabase/tests/NNN_reset_catalog_old_mothers.test.sql      nuevo: verificaciones de SPEC §5
supabase/seed-demo-recipes.sql                             nombres de producto → madres curadas (SPEC §3.1)
docs/catalogo-scraping/reporte-reset-SCRUM-133.md          nuevo: registro de lo borrado, movido y verificado
```

`NNN` = 048 (libre al 2026-11-15). Revisar `develop`, los PRs abiertos y `supabase_migrations.schema_migrations` justo antes de crearlo y antes del merge (regla de [supabase/README.md#migraciones](../../README.md#migraciones)).

## 2. La migración, paso a paso (una transacción)

Es solo de datos: no crea tablas ni funciones. Está escrita para que en una base nueva (sin madres viejas ni recetas) no haga nada.

1. **Madres viejas** → tabla temporal: `product_catalog` con `owner_id is null`, `household_id is null` y sin fila en `product_mother_rules`. Sus variantes → otra tabla temporal.
2. **Borrar las recetas demo originales**: `created_at >= '2026-09-28 05:41:00+00' and created_at < '2026-09-28 05:46:00+00'` (36 filas; cascada a ingredientes, `meal_plans`, requisitos).
3. **Ingredientes de receta** (SPEC §3.1): tabla temporal de mapeo por nombre (madre vieja → madre curada).
   - `delete` del ingrediente de "Leche De Magnesia".
   - `update recipe_ingredients set product_catalog_id = <madre curada>` según el mapeo.
   - Guarda: si queda algún ingrediente apuntando a una madre vieja → `raise exception` (aborta todo).
4. **Ítems de lista** (SPEC §3.2): tabla temporal de mapeo `nombre de la variante vieja → (madre curada, base_quantity, base_unit)`, resuelta contra `product_catalog_variants`.
   - Guarda: si algún destino del mapeo no existe en la base → `raise exception`.
   - **Fusión** (SPEC §3 punto 7): para cada (lista, variante destino) con más de un ítem pendiente después del mapeo, se queda el ítem más viejo; su `quantity_requested` pasa a ser la suma; los requisitos de receta de los otros se pasan con `on conflict (list_item_id, recipe_id, quantity_unit) do update` sumando `quantity_needed` (mismo patrón que la migración 035); se borran los otros.
   - `update list_items set product_catalog_variant_id = <destino>` para el resto.
   - `delete` de los ítems que siguen en variantes viejas (los sin equivalente).
   - Guarda: si queda algún `list_item` o fila de `product_catalog_staging` apuntando a una variante vieja → `raise exception`.
5. **Borrar las madres viejas** (cascada: variantes, marcas, precios).
6. `raise notice` con los conteos de cada paso (lo que va al reporte).

## 3. Orden de operaciones contra la base compartida

Cada escritura con autorización explícita del dueño del ticket y aviso al grupo antes.

1. **Backup**: script de solo lectura que guarda en JSON, fuera del repo (tiene datos de usuarios), las filas que la migración toca: recetas de la ventana demo con sus ingredientes, `meal_plans` y requisitos; `recipe_ingredients` y `list_items` que apuntan a madres viejas, con sus requisitos y snapshots; las madres viejas con variantes, marcas y precios.
2. **Ensayo**: correr la migración + el test dentro de `begin; ... rollback;` y revisar los conteos.
3. **Aviso al grupo** (SPEC §6).
4. **Aplicar**: `begin;` + migración + `insert` en `supabase_migrations.schema_migrations` + `commit;`.
5. **Verificar**: correr el test SQL y las búsquedas de §4.
6. **Reporte**.

## 4. Verificación

- Test SQL (SPEC §5): 0 recetas en la ventana demo; 0 `recipe_ingredients`/`list_items`/staging en madres viejas; 0 madres viejas; las 718 recetas del seed siguen ahí (mismos ids) con sus 1975 ingredientes en madres curadas; las recetas reales con sus ingredientes en las madres esperadas; ningún (lista, variante) con dos ítems pendientes.
- `search_catalog('leche')`, `('cereal')`, `('chocolate')` y `('arroz')` devuelven solo madres curadas.
- Por la interfaz: una lista que tenía un producto movido (ej. la de la fusión) muestra "Leche — 1000 ml" con cantidad 2 y precios.
- `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva.
