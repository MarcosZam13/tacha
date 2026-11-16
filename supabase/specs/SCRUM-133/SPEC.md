# SPEC — SCRUM-133: reset del catálogo (retirar las madres viejas a nivel SKU)

Ticket: [SCRUM-133](https://tacha.atlassian.net/browse/SCRUM-133) · Dueño: Daniel Salas · Sprint 4
Origen: respuesta del líder de proyecto al reporte de SCRUM-126 (2026-10-03): el reset va en su propio ticket, con aviso al grupo antes de correrlo, porque borra datos que recetas y listas referencian.

Ver también: [SCRUM-131/SPEC.md](../SCRUM-131/SPEC.md) (madres curadas, prerequisito) · [SCRUM-132](https://tacha.atlassian.net/browse/SCRUM-132) (ingesta mensual, prerequisito: tiene que haber corrido; su spec queda en `supabase/specs/SCRUM-132/` al mergear su PR) · [supabase/README.md#migraciones](../../README.md#migraciones) (regla de migraciones de SCRUM-134) · [docs/documento-proyecto.md §4.5](../../../docs/documento-proyecto.md#45-catálogo-de-productos-y-categorías) (variante = madre + tamaño; la marca es detalle)

## 1. Intención

El catálogo mezcla 28 "madres" viejas a nivel SKU (del normalizador anterior a SCRUM-131, una madre por producto de súper, ej. "Arrollado Moofy dulce de leche - 275 g") con las 12 madres curadas. Síntomas conocidos:

- `search_catalog` y los chips de categoría devuelven madres sin categoría (QA de SCRUM-84, 2026-10-21).
- Datos heredados del mapeo viejo: una variante vieja de 2 838 000 ml ("Leche Dos Pinos proteína - 2838 L"), marcas mezcladas en una misma variante, imágenes que no corresponden.
- Las recetas demo y muchas listas de usuarios apuntan a esas madres viejas, así que no se pueden borrar sin antes mover las referencias.

Este ticket mueve todas las referencias a las madres curadas, borra lo que no tiene equivalente y retira las madres viejas.

## 2. Estado de la base (verificado 2026-11-15, solo lectura)

| Cifra | Ticket original (2026-10-03) | 2026-11-15 |
|---|---|---|
| Usuarios (`auth.users`) | ~19 | 890 |
| Recetas | 39 | 774 |
| — demo original (ventana 2026-09-28 05:41–05:46 UTC, 9 usuarios) | 36 | 36 |
| — seed vigente (marcador `2000-01-01`, 180 usuarios) | — | 718 |
| — resto | 3 "reales" | 20 |
| `recipe_ingredients` que apuntan a madres viejas | 103 en total | 2096 de 2098 |
| `list_items` que apuntan a variantes viejas | 14 | 74 de 94 |
| Madres viejas / sus variantes | 28 / — | 28 / 39 |
| Precios (`product_prices`) de variantes viejas | — | 44 |

Clasificación del "resto" (20 recetas): "Flan" y "cereal desayuno" (reales, las del ticket original); 16 de prueba evidente ("Prueba lista A", "QA97 A/B/C doble/D offline", "caca", "prueba", "Sopa" y 4 pares "Tres leches"+"Flan" creados el 2026-10-30 por 4 usuarios en menos de 2 minutos); 2 "Receta captura leche" del 2026-11-13 que ya apuntan a la madre curada "Leche". La tercera receta real del ticket ("Tres leches" del 2026-10-02) no existe en la base. "Arrollado Moofy dulce de leche" ya no está en ninguna receta: está en 15 `list_items`.

Dependencias que no existían al escribir el ticket: borrar una receta borra en cascada sus `meal_plans` y `list_item_recipe_requirements`; borrar un `list_item` borra sus `list_item_recipe_requirements` y `list_item_shortfall_snapshots`.

## 3. Decisiones

1. **Recetas del seed vigente (718) y del resto (20): se remapean en el lugar**, no se borran ni se re-crean. Cada ingrediente pasa de su madre vieja a la madre curada equivalente (tabla §3.1). Se desvía del "re-correr el seed" del ticket: re-correrlo borraría y re-crearía las 718 recetas (perdiendo en cascada 5 `meal_plans` y 10 requisitos de lista) y crearía 3560 recetas nuevas (4 × 890 usuarios). El remapeo deja el mismo resultado final (cada receta demo apunta a madres curadas) sin perder nada.
2. **`supabase/seed-demo-recipes.sql` se actualiza** a los nombres de las madres curadas (mismo mapeo §3.1), para que correrlo en el futuro dé exactamente las recetas que quedan después del remapeo. No se corre en este ticket.
3. **Las 36 recetas demo originales se borran** (ventana de tiempo), como decide el ticket: el seed no las reconoce (no tienen el marcador `2000-01-01`) y sus dueños ya tienen las 4 del seed vigente. Arrastran en cascada 5 requisitos de lista y 0 `meal_plans`. El borrado es solo por la ventana de tiempo: se verificó contra la base compartida que en ella hay exactamente esas 36 recetas. En una base nueva la migración no encuentra ninguna; no se debe correr sobre otra copia de datos sin repetir esa verificación.
4. **Las recetas de prueba no se borran**: se remapean igual que las demás (no tocar datos de otros usuarios más de lo necesario).
5. **`list_items`: mismo producto o nada.** Cada ítem pasa a la variante curada en la que el normalizador de SCRUM-131/132 puso **ese mismo producto** (mismo nombre de súper) en la ingesta del 2026-11-15, identificada por madre + tamaño (tabla §3.2). Así el ítem queda con la misma marca y con precios que la ingesta mantiene; la lista muestra madre + tamaño (ej. "Leche — 1000 ml"), nunca el nombre interno de la variante. Nunca se reemplaza por un producto "parecido".
6. **Ítems sin equivalente se borran**: productos que la ingesta no volvió a encontrar (Arrollado Moofy, Froot Loops Mas Leche, Rice Krispies) o que el normalizador no asignó a ninguna madre (Burbujakisses), y la Leche de Magnesia (medicamento). Dejarlos implicaría conservar variantes con precio congelado del 2026-09-04.
7. **Choque al fusionar** (índice `list_items_one_pending_per_variant`: un solo ítem pendiente por lista y variante): si dos ítems pendientes de una misma lista terminan en la misma variante, se fusionan como ya lo hace la app al volver a agregar un producto (migración 035): un solo ítem con la suma de cantidades y la suma de sus requisitos de receta. Hoy aplica a 1 lista (Pinito 1 L + Sabemas 1 L → "Leche — 1000 ml").
8. **Las madres viejas se borran** cuando nada las referencia; en cascada se van sus variantes, marcas y precios (44 filas de precio de septiembre).
9. Las FKs de `recipe_ingredients` y `list_items` se quedan en `NO ACTION` a propósito: la migración falla si queda alguna referencia, en vez de borrar recetas o listas sin avisar.

### 3.1 Ingredientes de receta: madre vieja → madre curada

| Madre vieja | → Madre curada |
|---|---|
| Leche entera Sabemas - 1 L | Leche |
| Leche Semidescremada Dos Pinos -1 L | Leche |
| Leche Dos Pinos Pinito - 1000 ml | Leche |
| Leche Coronado 100% Nutritiva 3 Pack - 3 L | Leche |
| Crema de Leche Nestlé - 236g | Crema de leche |
| Leche Condensada La Lechera Original -335g | Leche condensada |
| Leche condensada El Ángel doypack - 385 g | Leche condensada |
| Leche Evaporada Ideal Nestlé lata -360g | Leche evaporada |
| Chocolate Milka de Leche - 90 g | Chocolate |
| Froot Loops Mas Leche Pinito 520 g | Cereal |
| Leche De Coco Goya Lata - 400ml | Leche de coco |
| Jabón Dove Leche de Coco - 90 g | Jabón |
| Leche De Magnesia Phillips, Sabor Original -360 ml | — (se borra el ingrediente) |

Verificado: ninguna receta queda con dos ingredientes en la misma madre (restricción `unique (recipe_id, product_catalog_id)`).

### 3.2 Ítems de lista: variante vieja → variante curada (madre + tamaño)

| Producto (variante vieja) | → Madre | Tamaño |
|---|---|---|
| Caramelos Diana de leche - 154 g | Dulces | 154 g |
| Chocolate Milka de Leche - 90 g | Chocolate | 90 g |
| Crema de Leche Nestlé - 236g | Crema de leche | 236 g |
| Jabón Dove Leche de Coco - 90 g | Jabón | 90 g |
| Leche condensada El Ángel doypack - 385 g | Leche condensada | 385 g |
| Leche Condensada La Lechera Original -335g | Leche condensada | 335 g |
| Leche Dos Pinos condensada Pinito - 397 g | Leche condensada | 397 g |
| Leche Evaporada Ideal Nestlé lata -360g | Leche evaporada | 360 g |
| Leche De Coco Goya Lata - 400ml | Leche de coco | 400 ml |
| Leche Descremada Dos Pinos Liquida 0% Grasa - 250 ml | Leche | 250 ml |
| Leche Dos Pinos Calciolac Extra Calcio - 946 ml | Leche | 946 ml |
| Leche Dos Pinos Pinito - 1000 ml | Leche | 1000 ml |
| Leche entera Sabemas - 1 L | Leche | 1000 ml |
| Leche Semidescremada Dos Pinos -1 L | Leche | 1000 ml |
| Leche Coronado 100% Nutritiva 3 Pack - 3 L | Leche | 3000 ml |
| Leche Dos pinos semidescremada 3 pack- 3000 ml | Leche | 3000 ml |
| Torta Dulce Leche Economica Bucca 938g | Repostería | 938 g |
| Arrollado Moofy, Froot Loops Mas Leche, Rice Krispies, Burbujakisses, Leche De Magnesia | — (se borra el ítem) | |

Cómo se obtuvo: para cada variante vieja, la `matched_variant_id` de las filas `matched` de `product_catalog_staging` con el mismo nombre de producto (todas apuntan a una sola variante). Madre + tamaño es único entre las variantes curadas, así que identifica la variante sin depender de ids. Resultado al 2026-11-15: 49 ítems se mueven, 25 se borran (con 3 requisitos de receta en cascada; 4 de ellos tenían sesión de compra).

## 4. Alcance

**Sí incluye:**
- Migración de datos `supabase/migrations/048_reset_catalog_old_mothers.sql` con las decisiones §3, en una transacción, con guardas que abortan si queda alguna referencia a una madre vieja.
- Test SQL `supabase/tests/048_reset_catalog_old_mothers.test.sql` con las verificaciones de §5.
- `supabase/seed-demo-recipes.sql` actualizado a madres curadas.
- Backup local (fuera del repo) de las filas que se tocan, antes de aplicar.
- Registro corto de lo borrado, movido y verificado: `docs/catalogo-scraping/reporte-reset-SCRUM-133.md`.

**No incluye:**
- El normalizador (SCRUM-131) ni el script de ingesta (SCRUM-132).
- Agregar madres nuevas (ej. una para "Arrollado Moofy"): es un PR de datos de `madres.json`.
- Cambiar el modelo de FKs.
- Los paquetes cuyo tamaño es por unidad ("6 Pack - 250 ml") y el keyword genérico `leche`: fuera de alcance desde SCRUM-132.

## 5. Criterios de aceptación

- [x] No queda ninguna receta en la ventana demo original; las recetas del seed vigente no cambian de cantidad (718: 4 por usuario en 178 usuarios y 3 en 2 que borraron una), no hay duplicadas y todos sus ingredientes apuntan a madres curadas. Los usuarios creados después de la última corrida del seed (710) siguen sin recetas demo: el remapeo no crea recetas (SPEC §3 punto 1); quien las necesite puede correr el seed actualizado.
- [x] Las recetas reales ("Flan", "cereal desayuno") apuntan a madres curadas según §3.1, y ningún `list_item` queda en una variante del catálogo global que no sea de una madre curada (los de productos propios no se tocan), según §3.2.
- [x] Ninguna madre vieja queda en `product_catalog` (madre global sin regla en `product_mother_rules`); `search_catalog` solo devuelve madres curadas.
- [x] Registro corto de lo borrado, movido y verificado (reporte).
- [x] La migración está en `supabase/migrations/`, se aplicó con su fila en `supabase_migrations.schema_migrations` y su test pasa.

## 6. Aviso al equipo (Developer Notes del PR, antes de correr)

Día y hora del reset; que se tocan recetas y listas de todos los usuarios; que los ítems sin equivalente se borran (lista de productos en §3.2) y que el backup existe.
