# Spec 4 — Preferencias de tienda por household (mostrar/ocultar supermercados)

> Nota: esta spec NO viene de una historia de usuario — documenta cómo cualquier módulo del equipo (listas, dashboard, catálogo) debe integrar la preferencia de tiendas por household, ya que varias historias de usuario van a necesitar filtrar por esto sin que el documento lo detalle a nivel de implementación. La tabla (`household_store_preferences`) ya existe en Supabase.

## Intent

Construir la UI y la lógica de lectura/escritura para que un usuario, dentro de la configuración de su household, pueda elegir cuáles de las 3 tiendas soportadas (MaxiPali, Walmart CR, MasXMenos) quiere seguir viendo — todas por defecto, con la posibilidad de ocultar una o más. Esta preferencia afecta el rango de precio mostrado en el catálogo (spec 2) y, potencialmente, las sugerencias de dónde comprar (documento sección 4.8) una vez que ese módulo se construya.

## In scope

- Componente de configuración (ej. dentro de "Configuración del household") con las 3 tiendas listadas, cada una con un toggle/checkbox de visibilidad.
- Al cargar, debe reflejar el estado real: tiendas sin fila en `household_store_preferences` se muestran como **visibles por defecto** (toggle activado), no como "sin definir".
- Al cambiar un toggle, debe hacer upsert en `household_store_preferences` (household_id, store_id, visible) — no debe fallar si es la primera vez que ese household+store se guarda (no hay fila previa).
- Ocultar una tienda no debe borrar ningún dato de precio existente — es puramente un filtro de visualización, `product_prices` y `product_catalog_staging` no se tocan.

## Out of scope

- No implementar la lógica de "sugerencias de dónde comprar" completa (documento sección 4.8) — esta spec solo cubre la preferencia de visibilidad, no el algoritmo de sugerencia.
- No implementar un mensaje de advertencia si el usuario oculta las 3 tiendas a la vez (dejar las 3 ocultas es un estado válido aunque inusual — decisión de UX a cargo de quien construya la interfaz completa del household, no bloqueante para esta spec).
- No construir el módulo `households`/`household_members` en sí — esta spec asume que ya existe un `household_id` válido disponible (ese módulo lo construye Esteban, según la división de trabajo del documento, sección 12).

## Requirements

1. Lectura: usar el patrón `left join` + `coalesce(visible, true)` documentado en la referencia técnica (sección 6) — nunca asumir que la ausencia de fila significa "oculta".
2. Escritura: usar `upsert` sobre la clave primaria compuesta `(household_id, store_id)` — un cambio de toggle nunca debe intentar un `insert` puro que falle por duplicado si ya existía una fila previa.
3. El componente debe mostrar el `display_name` de `stores` (ej. "Walmart Costa Rica"), no el `slug` técnico (`walmart`).
4. Cualquier otro módulo que necesite "¿qué tiendas ve este household?" (catálogo, dashboard, sugerencias futuras) debe reusar la misma consulta de lectura — no reimplementar el filtro de forma distinta en cada lugar.

## Edge cases & errors

- Household recién creado, sin ninguna fila en `household_store_preferences`: las 3 tiendas deben aparecer visibles (toggle activado) — no debe verse como "cargando" ni como error.
- Dos pestañas del mismo usuario cambiando el mismo toggle casi al mismo tiempo: el `upsert` debe ser la última escritura gana (comportamiento estándar, no se requiere manejo especial de conflictos para el alcance de esta spec).
- Usuario sin household (uso solo, permitido por el documento sección 4.1): esta funcionalidad no debería ni mostrarse — no tiene sentido "preferencia de household" sin household. Quien construya la UI debe ocultar esta sección completa si `household_id` es null, no mostrarla deshabilitada.
- Las políticas RLS de `household_store_preferences` son temporales (`using (true)`, ver referencia técnica sección 6) porque el módulo de autenticación/households todavía no existe en este proyecto de Supabase — cualquier implementación de esta spec debe funcionar hoy con esas policies abiertas, sabiendo que se van a endurecer después sin que el contrato de lectura/escritura cambie.

## Constraints

- Usar directamente la tabla `household_store_preferences` ya existente — no crear una tabla paralela ni cambiar su estructura sin coordinarlo primero con Daniel (dueño del módulo de catálogo/scraping).
- La consulta de lectura debe poder ejecutarse vía PostgREST directo (no requiere una función RPC nueva, es un `select` con `left join` estándar) — documentar el query exacto usado para que otros módulos lo reutilicen literalmente.

## Acceptance criteria

- [ ] Un household nuevo, sin filas previas en `household_store_preferences`, muestra las 3 tiendas con toggle activado.
- [ ] Desactivar el toggle de "Walmart Costa Rica" crea (o actualiza) una fila `(household_id, store_id_walmart, visible=false)` — verificable en el Table Editor de Supabase.
- [ ] Volver a activar el toggle actualiza esa misma fila a `visible=true`, no crea una fila duplicada.
- [ ] Invocar `search_catalog` (spec 2) con ese `household_id` después de ocultar Walmart excluye los precios de Walmart del rango calculado.
- [ ] Repetir el cambio de toggle dos veces seguidas rápido (simulando doble click) no genera error de clave duplicada.
