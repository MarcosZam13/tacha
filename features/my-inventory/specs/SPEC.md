# Feature: MyInventory

Historia: HU-71b (SCRUM-105), [docs/historias-usuario.md](../../../docs/historias-usuario.md). Contexto de producto: [docs/documento-proyecto.md §4.10](../../../docs/documento-proyecto.md#410-inventario-doméstico). Completa las sugerencias de inventario (`features/inventory-suggestions/`, SCRUM-102 y 104) y los chips de duración (`features/shopping-list/`, SCRUM-103).

## 1. Objetivo

Ver en una pantalla todo lo que la app cree que hay en casa, agrupado por urgencia, para saber qué se vence pronto sin adivinar.

## 2. Alcance

- Pantalla `/lista/inventario` con los productos agrupados en "Vence pronto", "Este mes", "Más adelante" y "Sin fecha estimada".
- Cada producto con su nombre, su presentación y, si tiene fecha, cuánto le queda.
- Entradas desde General: un enlace en el encabezado y otro en la fila "¿Se te acabó?".
- Estado vacío simple.
- En la base, el cálculo pasa a una sola función (`inventory_estimates`) que usan el inventario y las sugerencias.

## 3. Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Lo tachado en la lista general | filas de `list_items` (con `shelf_life_choice`, 063) | la base; la lista la elige `find_general_list_id` |
| Duración por categoría | `category_shelf_life` (061) | la base |

El usuario no ingresa nada.

## 4. Salidas

Hasta 200 productos, cada uno con la presentación de la última compra, su nombre, su tamaño y la fecha estimada en que se acaba (o ninguna).

## 5. Reglas de negocio

1. **Qué hay en casa.** Un producto está en el inventario si se compró en los últimos 180 días, no está archivado y: todavía no se acabó (la fecha estimada es posterior a ahora), no tiene fecha estimada, o se pospuso con la ✕ de "¿Se te acabó?" (SCRUM-104): quien descarta dice "todavía lo tengo", así que sigue en casa. Lo pospuesto ya pasó su fecha y sale en "Vence pronto" con "Se acaba hoy". Es el mismo cálculo que las sugerencias (SPEC de `inventory-suggestions` §5 y §16; chips en `shopping-list` §19), en una sola función de la base.
2. **Lo que ya se acabó no está acá.** Eso es una sugerencia de "¿Se te acabó?". Un producto nunca está en los dos lugares.
3. **Lo pendiente.** Si no se acabó, sí está: tener el producto en la lista para comprar más no quiere decir que se acabó. Si ya se acabó y está pendiente, no está en ninguno de los dos: se acabó y ya se va a comprar.
4. **Grupos (CA-01), por días del calendario que quedan:**

| Grupo | Días que quedan |
|---|---|
| Vence pronto | 0 a 7 |
| Este mes | 8 a 30 |
| Más adelante | más de 30 (decidido con el equipo el 2026-11-25: no cabe en los otros tres) |
| Sin fecha estimada | sin fecha: "No vence" con una sola compra |

5. **Cuánto le queda (CA-02):** "Se acaba hoy", "Te queda 1 día", "Te quedan N días". En "Sin fecha estimada", solo el producto.
6. **Orden:** los grupos en el orden de la tabla; dentro de cada uno, lo que se acaba antes primero y después por nombre.
7. **Complemento (CA-03):** la fila de sugerencias de General no cambia; esta pantalla no la reemplaza.
8. **Entrada (CA-01):** el menú "Más" no existe todavía (queda para el sprint de UI/UX, `components/app-shell`). Mientras tanto: enlace "Mi inventario" en el encabezado de General y "Ver mi inventario" en la fila de sugerencias. Cuando exista el menú, se agrega ahí.

## 6. Estados

| Estado | Qué se ve |
|---|---|
| Cargando | Spinner "Cargando tu inventario" |
| Con productos | Los grupos que tienen productos |
| Vacío | "Todavía no hay nada en tu inventario. Se llena solo cuando tachas productos al comprar." (CA-04) |
| Error | "No se pudo cargar tu inventario. Intenta de nuevo." y "Reintentar" |

## 7. Errores

Si la consulta falla se muestra el error con "Reintentar". La base: sin sesión, `42501`.

## 8. UI esperada

"← Volver a la lista", el título "Mi inventario" y un bloque por grupo: título (`h2`) y una lista con el nombre y la presentación a la izquierda y cuánto le queda a la derecha.

## 9. Accesibilidad

- Cada grupo es una región (`section` con `aria-labelledby`) con su título.
- Los productos son una lista (`ul`/`li`).
- El error usa `role="alert"` y la carga `role="status"`.

## 10. Restricciones técnicas

- El cálculo vive en la base (`security invoker`, sin parámetros del cliente); el cliente solo agrupa y arma los textos.
- Presentación / ViewModel / servicio separados; textos y cortes en `constants/`.
- Los días se cuentan con `utils/calendarDaysBetween.ts`, compartido con "Lo compraste hace N días".

## 11. Dependencias

- Migraciones 061, 063 y 064 (PR #121 y #122): la 065 usa `shelf_life_choice` y lo pospuesto, y vuelve a definir `get_inventory_suggestions`. Se aplica y se mergea después de ellas.

## 12. Contratos externos

- `get_my_inventory()` → `{ product_catalog_variant_id, product_name, base_quantity, base_unit, last_purchased_at, expected_out_at | null }[]`.
- `inventory_estimates()`: interna (la llaman las otras dos), `authenticated` necesita `execute` porque son invoker.
- `get_inventory_suggestions()`: misma firma y resultado que en la 064.

## 13. Casos de aceptación

- [x] CA-01: los cuatro grupos en orden; se entra desde el encabezado de General y desde la fila de sugerencias. (E2E-MINV-01 y 03, `toInventoryGroups.test.ts`, tests de los enlaces)
- [x] CA-02: nombre, presentación y "Te quedan N días"; sin fecha, solo el producto. (`MyInventory.test.tsx`, E2E-MINV-01)
- [x] CA-03: la fila de sugerencias sigue igual. (tests de `inventory-suggestions`)
- [x] CA-04: estado vacío sin pedir llenarlo a mano. (`MyInventory.test.tsx`, E2E-MINV-02)
- [x] Qué entra y en qué orden; lo pendiente sí; lo que se acabó no; mismo cálculo que las sugerencias. (prueba SQL de la `065`)

### Mapa de pruebas

| Caso | Clasificación | Por qué | Archivo | Test | Escenario E2E |
|---|---|---|---|---|---|
| Grupos y cortes | Unitario | Lógica pura | `features/my-inventory/tests/toInventoryGroups.test.ts` | `toInventoryGroup`, `toInventoryGroups` | — |
| Textos de días | Unitario | Lógica pura | mismo y `utils/tests/calendarDaysBetween.test.ts` | `toRemainingText` | — |
| Pantalla y estados | Unitario | Estados del ViewModel | `features/my-inventory/tests/MyInventory.test.tsx` | todos | — |
| Pantalla real | E2E | Grupos y ancho en un navegador | `e2e/features/my-inventory/my-inventory.spec.ts` | E2E-MINV-01 y 02 | E2E-MINV-01, 02 |
| Entrada y salida | E2E | Navegación real | mismo | E2E-MINV-03 | E2E-MINV-03 |
| Cálculo | SQL | La regla vive en la base | `supabase/tests/065_my_inventory.test.sql` | pasos 3 a 6 | — |

## 14. Casos fuera de alcance

- "Ya se acabó" y ajustar la fecha desde esta pantalla: SCRUM-106 (HU-71c).
- Agregar algo a mano: SCRUM-107 (HU-71d). Con esas dos llega la tabla de inventario.
- El menú "Más": sprint de UI/UX.
- Que el historial sobreviva a borrar lo tachado (OBS-2 de la PR #120): igual que las sugerencias.

## 15. Notas de implementación

- **Una sola función con el cálculo.** Antes, cada cambio de las sugerencias (061, 063, 064) copiaba el cálculo entero. Ahora `inventory_estimates` lo tiene una vez; las sugerencias y el inventario solo filtran.
- **Cortes de 7 y 30 días y el cuarto grupo "Más adelante":** confirmados con el equipo el 2026-11-25.
