# Reporte — reset del catálogo (SCRUM-133)

Migración [`048_reset_catalog_old_mothers.sql`](../../supabase/migrations/048_reset_catalog_old_mothers.sql), aplicada el 2026-11-16 en la base compartida, con su fila `048 reset_catalog_old_mothers SCRUM-133` en `supabase_migrations.schema_migrations`. Decisiones y mapeos: [SPEC](../../supabase/specs/SCRUM-133/SPEC.md) §3.

## Backup

Tomado el 2026-11-16 05:27 UTC, antes de aplicar, fuera del repo (tiene datos de usuarios), en dos JSON: los 74 ítems de lista afectados con sus 34 requisitos de receta; las 36 recetas demo originales con sus 99 ingredientes y 5 requisitos; las 28 madres viejas con 39 variantes, 40 marcas y 44 precios; y los 2096 ingredientes que apuntaban a madres viejas. Lo tiene el dueño del ticket.

## Qué se borró

| Qué | Cantidad | Detalle |
|---|---|---|
| Recetas demo originales | 36 | Ventana `2026-09-28 05:41–05:46 UTC`, 9 usuarios × 4. En cascada: 99 ingredientes, 5 requisitos de lista, 0 `meal_plans` |
| Ingrediente sin equivalente | 1 | "Leche De Magnesia Phillips" en la receta "Sopa" (de prueba) |
| Ítems de lista sin equivalente | 25 | Arrollado Moofy (15), Froot Loops Mas Leche (4), Burbujakisses (3), Leche De Magnesia (2), Rice Krispies (1) |
| Madres viejas | 28 | En cascada: 39 variantes (incluida la de 2 838 000 ml), 40 marcas, 44 precios del 2026-09-04 |

## Qué se movió

| Qué | Cantidad | Cómo |
|---|---|---|
| Ingredientes de receta | 1996 | Madre vieja → madre curada (SPEC §3.1). Incluye las 718 recetas del seed vigente, "Flan" y "cereal desayuno" (reales) y las 18 de prueba |
| Ítems de lista | 48 | Variante vieja → variante curada del mismo producto, por madre + tamaño (SPEC §3.2) |
| Ítems fusionados | 1 | Una lista con "Leche Dos Pinos Pinito - 1000 ml" y "Leche entera Sabemas - 1 L" pendientes: quedó un ítem "Leche — 1000 ml" con cantidad 2 |

## Verificación (2026-11-16, después de aplicar)

- [`048_reset_catalog_old_mothers.test.sql`](../../supabase/tests/048_reset_catalog_old_mothers.test.sql): 6 casos OK, en el ensayo previo y otra vez después de aplicar.
- 0 recetas en la ventana demo; 0 madres viejas; quedan las 12 madres curadas como catálogo global.
- Recetas: 774 → 738. Ingredientes: 2098 → 1998. Ítems de lista: 94 → 68.
- Las 718 recetas del seed siguen (mismos ids), todas con ingredientes en las 7 madres del seed actualizado.
- "Flan" → Leche condensada + Leche; "cereal desayuno" → Cereal.
- Ninguna (lista, variante) con dos ítems pendientes.
- `search_catalog`: "leche" → Leche, Leche condensada, Leche evaporada, Leche de coco, Crema de leche; "cereal", "chocolate" y "arroz" → su madre curada; "moofy" y "magnesia" → sin resultados.
- Por la interfaz (usuario nuevo): `/catalogo` con "leche" solo muestra madres curadas por tamaño (ej. "Leche — 1000 ml") y los 7 chips de categoría; en `/lista`, "Leche — 1000 ml" muestra las marcas de los productos movidos ahí (Dos Pinos, Sabemas, Coronado, …) y precios actuales de los 3 súpers.
- "Agregar receta a la lista" encuentra una presentación de la misma unidad para todos los ingredientes de receta, salvo uno que ya fallaba antes del reset (ver abajo).

## Observaciones previas al reset (no cambian)

- "Flan" tiene un ingrediente de "½ unidad" de leche condensada; ninguna presentación de leche condensada está en unidades, ni antes (madre vieja de 335 g) ni ahora, así que ese ingrediente no se puede pasar a la lista.

## Diferencias con el ticket original

- Las recetas del seed se remapearon en el lugar en vez de re-correr el seed (SPEC §3 punto 1): no se perdieron `meal_plans` ni requisitos de lista, y no se crearon 3560 recetas nuevas. Los usuarios creados después de la última corrida del seed siguen sin recetas demo; el seed actualizado se puede correr cuando haga falta.
- La tercera receta real del ticket ("Tres leches" del 2026-10-02) no existía en la base.
