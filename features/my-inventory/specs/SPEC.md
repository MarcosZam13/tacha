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
| Sin fecha estimada | sin fecha: "No vence" con una sola compra, o ajustado a "No vence" (SCRUM-106) |

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

- "Ya se acabó" y ajustar la fecha desde esta pantalla: SCRUM-106 (HU-71c), §16.
- Agregar algo a mano: SCRUM-107 (HU-71d).
- El menú "Más": sprint de UI/UX.
- Que el historial sobreviva a borrar lo tachado (OBS-2 de la PR #120): igual que las sugerencias.

## 15. Notas de implementación

- **Una sola función con el cálculo.** Antes, cada cambio de las sugerencias (061, 063, 064) copiaba el cálculo entero. Ahora `inventory_estimates` lo tiene una vez; las sugerencias y el inventario solo filtran.
- **Cortes de 7 y 30 días y el cuarto grupo "Más adelante":** confirmados con el equipo el 2026-11-25.

## 16. SCRUM-106: "Ya se acabó" y ajustar la fecha

Historia: HU-71c ([SCRUM-106](https://tacha.atlassian.net/browse/SCRUM-106)). Migración `067_adjust_inventory_items.sql`.

### Objetivo

Que el inventario sea más preciso sin empezar de cero: decir que algo se acabó antes de lo esperado, o cambiar cuánto creo que me dura.

### Reglas de negocio

1. **"Ya se acabó" (CA-01).** Cada producto tiene el botón. Al tocarlo sale de la pantalla en el momento, sin confirmar. En la base, el producto se acaba "ahora": pasa a "¿Se te acabó?" para reponerlo, salvo que ya esté pendiente en la lista (entonces no está en ninguno de los dos, como en §5 regla 3). Si falla, el producto vuelve con "No se pudo guardar. Intenta de nuevo.".
2. **Ajustar la fecha (CA-02).** "Ajustar fecha" abre debajo del producto los mismos chips de HU-70b (SCRUM-103): "Vence en pocos días", "2-4 semanas", "1-3 meses" y "No vence / no aplica". Un toque guarda, sin selector de fecha. Se cuenta **desde ahora**, porque responde "¿cuánto me queda?": 4, 21 o 60 días; "No vence" deja el producto en "Sin fecha estimada". La pantalla vuelve a pedir el inventario y el producto queda en su grupo nuevo. Si falla, los chips siguen abiertos con el error.
3. **No toca el historial ni Finanzas (CA-03).** Lo que el usuario dice se guarda aparte, en `inventory_adjustments`. No cambia `list_items` (las compras, el chip al tachar, quién compró y cuándo) ni nada de Finanzas.
4. **Una compra nueva vuelve a empezar.** El ajuste queda atado a la última compra del producto. Si se vuelve a comprar, el ajuste deja de aplicar y vuelve el cálculo de §5 con la compra nueva. Lo mismo si se desmarca esa compra: vuelve el cálculo con la compra anterior (un producto marcado "Ya se acabó" puede volver al inventario).
5. **Reemplaza la ✕.** Las dos acciones borran lo pospuesto con la ✕ de ese producto (SCRUM-104): lo que el usuario dice ahora vale más que el "todavía lo tengo" de antes. Si después toca la ✕ en "¿Se te acabó?", vuelve al inventario, como cualquier producto pospuesto.
6. **En familia,** el ajuste es de la lista general compartida: lo ven todos los miembros, igual que la ✕. Quien tiene la pantalla abierta lo ve al recargar (no hay tiempo real).
8. **Tope de sugerencias.** "¿Se te acabó?" muestra hasta 20, de lo que se acabó hace más a lo que se acabó hace menos (065). Lo marcado "Ya se acabó" se acaba ahora, así que con más de 20 sugerencias queda al final, fuera de las 20. Se acepta: con ese volumen, la fila ya tiene de sobra para reponer.
9. **Si se guardó pero falla la recarga** después de un chip, la lista queda en pantalla y esa fila dice "Se guardó, pero no se pudo actualizar la pantalla. Recarga la página.".
7. **Volver a ajustar** reemplaza el ajuste anterior (una fila por lista y producto).

### Errores de la base

| Caso | Código |
|---|---|
| Sin sesión | `42501` |
| Sin presentación, presentación que no está en la lista general de quien llama, producto sin compras o chip no válido | `22023` |
| Sin lista general | `P0002` |

La pantalla muestra el mismo texto para todos: "No se pudo guardar. Intenta de nuevo.".

### Contratos externos

- `mark_inventory_item_used_up(target_variant_id uuid)` → nada.
- `adjust_inventory_item(target_variant_id uuid, target_choice text)` → nada. `target_choice`: `few_days`, `two_to_four_weeks`, `one_to_three_months` o `no_expiry`.
- `inventory_estimates()`: misma firma; el ajuste de la última compra manda sobre el cálculo. `get_my_inventory` y `get_inventory_suggestions` no cambian.

### Accesibilidad

- Los botones dicen la acción y el nombre accesible incluye el producto: "Ajustar fecha: Leche", "Ya se acabó: Leche". Empieza con el texto visible.
- "Ajustar fecha" tiene `aria-expanded` y `aria-controls` hacia los chips.
- Los chips son el mismo grupo de SCRUM-103 ("¿Cuánto te va a durar Leche?") y caben sin mover la página de lado.
- El foco no se pierde: después de "Ya se acabó" va al título (la fila ya no existe); después de un chip, a "Ajustar fecha" de ese producto en su grupo nuevo. Cada acción se avisa en una región `status` oculta ("Leche ya no está en tu inventario.", "Leche: fecha actualizada.").
- Los botones miden al menos 40 px de alto, para tocarlos en el celular sin errar.

### Casos de aceptación

- [x] CA-01: "Ya se acabó" saca el producto en el momento y pasa a sugerencias. (`MyInventory.test.tsx`, E2E-MINV-05, prueba SQL de la `067`)
- [x] CA-02: los chips de HU-70b ajustan la fecha desde ahora, sin selector de fecha. (`MyInventory.test.tsx`, E2E-MINV-06, prueba SQL)
- [x] CA-03: no cambia `list_items`. (prueba SQL, paso 3)

### Mapa de pruebas

| Caso | Clasificación | Por qué | Archivo | Escenario E2E |
|---|---|---|---|---|
| Botones, chips, errores y deshabilitado | Unitario | Estados del ViewModel | `features/my-inventory/tests/MyInventory.test.tsx` | — |
| Llamadas a la base | Unitario | Contrato del servicio | `features/my-inventory/tests/my-inventory.service.test.ts` | — |
| "Ya se acabó" en un navegador | E2E | Pantalla real | `e2e/features/my-inventory/my-inventory.spec.ts` | E2E-MINV-05 |
| Chips en el celular y cambio de grupo | E2E | Ancho real y navegación | mismo | E2E-MINV-06 |
| Cálculo, permisos, familia, compra nueva | SQL | La regla vive en la base | `supabase/tests/067_adjust_inventory_items.test.sql` | — |

### Fuera de alcance

- Deshacer un ajuste (se puede volver a ajustar, o tocar la ✕ en "¿Se te acabó?").
- Agregar algo a mano: SCRUM-107, §17.

## 17. SCRUM-107: agregar algo a mi inventario a mano

Historia: HU-71d ([SCRUM-107](https://tacha.atlassian.net/browse/SCRUM-107)). Migración `068_manual_inventory_items.sql`.

### Objetivo

Que el inventario y las sugerencias tengan en cuenta lo que ya había en casa y no vino de una compra hecha en Tacha.

### Reglas de negocio

1. **Entrada (CA-01).** "+ Agregar a mi inventario" se ve debajo del título, con productos y también en el estado vacío (el texto del vacío sigue sin pedir que se llene a mano, CA-04 de SCRUM-105). No se ve mientras carga ni si el inventario no cargó.
2. **Elegir el producto.** El panel usa el buscador del catálogo de la lista general (`components/product-search`, catálogo global): una opción por presentación, con su tamaño. "Cambiar producto" vuelve al buscador.
3. **Cuánto le queda (CA-01, opcional).** Los mismos chips de HU-70b. Tocar el elegido lo quita. Con chip, cuenta desde ahora: 4, 21 o 60 días. Es exactamente el chip al tachar (063), porque lo agregado es una llegada más: "No vence" deja el producto sin fecha si es su primera llegada, y si ya se había comprado antes usa el promedio entre llegadas, igual que al tachar con "No vence". Sin chip, como una compra de hoy: la categoría, o 14 días (o el promedio, si ya se había comprado).
4. **Aparece como cualquier otro (CA-02).** En la base, lo agregado es una llegada más del producto, igual que lo tachado: entra al mismo cálculo (§5), al promedio entre llegadas si ya se había comprado, y "Ya se acabó" y "Ajustar fecha" funcionan igual. La pantalla no lo distingue.
5. **No es una compra.** No crea filas en la lista (`list_items`): no aparece en el historial de compras ni en Finanzas.
6. **Volver a agregar** el mismo producto es otra llegada: como volver a comprarlo, deja sin efecto un ajuste anterior (§16 regla 4). El mismo día y la misma presentación, no se crea otra fila: se actualizan la hora y el chip (el promedio cuenta días, así que no cambia). Es también un tope: nadie puede llenar la tabla de una familia con llamadas seguidas.
7. **Qué se puede agregar.** Lo del catálogo global; un producto propio solo en una lista personal; uno compartido con la familia, en la lista de esa familia. Un producto personal sin compartir no entra a la lista de una familia (como en SCRUM-163): el resto no podría verlo. Con el buscador del catálogo global solo aparecen los del catálogo; la base igual lo revisa.
8. **Sin lista general todavía:** la base la crea (como al agregar el primer producto a la lista).
9. **En familia,** lo agregado es de la lista general compartida: lo ven todos los miembros.
11. **Lo pospuesto con la ✕ sigue pospuesto** al agregar (igual que al volver a tachar): la ✕ vence sola a los 7 días. Solo "Ya se acabó" y "Ajustar fecha" la borran (§16 regla 5), porque son una corrección explícita.
12. **Un solo grupo de chips a la vez:** abrir el panel cierra los chips de "Ajustar fecha". Si lo agregado se guarda pero no se puede recargar, la lista sigue en pantalla y debajo del título dice "Se guardó, pero no se pudo actualizar la pantalla. Recarga la página.".
10. **Al agregar** se cierra el panel, se vuelve a pedir el inventario, se avisa "Leche se agregó a tu inventario." y el foco va a "Ajustar fecha" de ese producto. Si falla, el panel sigue abierto con "No se pudo agregar. Intenta de nuevo.". "Cancelar" cierra sin guardar y el foco vuelve a "+ Agregar a mi inventario".

### Correcciones de la PR #124 (QA de SCRUM-106)

- **OBS-1:** si "Ya se acabó" falla, el foco vuelve a la fila ("Ajustar fecha" de ese producto), no se queda en el título.
- **OBS-2:** dos avisos iguales seguidos (por ejemplo, ajustar dos veces el mismo producto) se leen los dos: el texto de la región `status` alterna un espacio duro invisible.

### Errores de la base

| Caso | Código |
|---|---|
| Sin sesión | `42501` |
| Sin presentación, chip no válido, o un producto que esa lista no puede usar (personal ajeno, propio sin compartir en una familia, de otra familia, archivado) | `22023`, el mismo mensaje para todos |

### Contratos externos

- `add_inventory_item(target_variant_id uuid, target_choice text default null)` → nada.
- `inventory_estimates()` y `save_inventory_adjustment(...)`: misma firma; también leen `inventory_manual_items`.

### Accesibilidad

- El panel es un grupo con nombre ("Agregar a mi inventario"), no una región: las regiones de la pantalla son los grupos por urgencia.
- Al abrirse, el foco va a su título; al cerrarse, al botón que lo abrió.
- Botones de al menos 40 px de alto.

### Casos de aceptación

- [x] CA-01: "+ Agregar a mi inventario" permite elegir un producto del catálogo y, si se quiere, el chip. (`MyInventory.test.tsx`, E2E-MINV-07, prueba SQL de la `068`)
- [x] CA-02: aparece igual que cualquier otro, también para "Ya se acabó" y "Ajustar fecha". (`MyInventory.test.tsx`, E2E-MINV-07, prueba SQL pasos 3 y 6)

### Mapa de pruebas

| Caso | Clasificación | Por qué | Archivo | Escenario E2E |
|---|---|---|---|---|
| Panel: abrir, buscar, elegir, chip opcional, cambiar, cancelar, error, foco | Unitario | Estados del ViewModel | `features/my-inventory/tests/MyInventory.test.tsx` | — |
| OBS-1 y OBS-2 de la #124 | Unitario | Foco y avisos | mismo | — |
| Llamada a la base | Unitario | Contrato del servicio | `features/my-inventory/tests/my-inventory.service.test.ts` | — |
| Agregar con un chip en un navegador | E2E | Pantalla real y celular | `e2e/features/my-inventory/my-inventory.spec.ts` | E2E-MINV-07 |
| Cálculo, qué se puede agregar, familia, lista nueva | SQL | La regla vive en la base | `supabase/tests/068_manual_inventory_items.test.sql` | — |

### Fuera de alcance

- Agregar productos personales desde este buscador (usa el catálogo global, como la lista general).
- Borrar algo agregado por error: se marca "Ya se acabó".
- Cantidad (cuántas unidades hay en casa): el inventario es por producto, no por unidades.
