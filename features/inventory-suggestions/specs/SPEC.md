# Feature: InventorySuggestions

Historia: HU-70 (SCRUM-102), [docs/historias-usuario.md](../../../docs/historias-usuario.md). Contexto de producto: [docs/documento-proyecto.md §4.10](../../../docs/documento-proyecto.md#410-inventario-doméstico).

## 1. Objetivo

Mostrar en la vista General los productos que probablemente ya se acabaron, calculados solos a partir de lo que ya se compró, para reponerlos sin llevar un registro a mano.

## 2. Alcance

- Calcular las sugerencias en la base a partir de lo tachado en la lista general.
- Mostrarlas en una fila que se desliza, debajo del encabezado de `/lista` y antes de la lista.
- Una duración por categoría para los productos que se compraron una sola vez.

## 3. Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Lo tachado en la lista general | filas de `list_items` con `checked_at` | la base; la lista la elige `find_general_list_id` (familia o personal) |
| Categoría del producto | `product_catalog.category_id` | catálogo |
| Duración por categoría | `category_shelf_life.shelf_life_days` | tabla nueva (061) |

El usuario no ingresa nada (CA-02).

## 4. Salidas

Hasta 20 sugerencias, cada una con la presentación de la última compra, el nombre del producto, su tamaño, la fecha de la última compra y la fecha estimada en que se acabó. Se dibujan como tarjetas con el nombre, el tamaño y "Lo compraste hace N días".

## 5. Reglas de negocio

1. **Por producto.** Las compras se agrupan por producto madre (como `household_inventory_items` en documento-proyecto §6). La sugerencia lleva la presentación de la última compra, que es la que SCRUM-104 va a agregar con ✓.
2. **Una compra es un día.** Varias filas del mismo producto tachadas el mismo día cuentan como una compra. El día es el de Costa Rica (`America/Costa_Rica`), no el de UTC: en UTC el día cambia a las 6 p. m.
3. **Duración.** Con 2 compras o más: el promedio de días entre la primera y la última. Con 1 compra: la de su categoría en `category_shelf_life`; sin categoría o sin fila: 14 días.
4. **Cuándo se sugiere.** Si la última compra más la duración ya pasó.
5. **Cuándo no.** Si alguna presentación del producto ya está pendiente en la lista, si la última compra fue hace más de 180 días o si el producto está archivado (un producto personal eliminado que una lista todavía usa, migración 052).
6. **Orden.** Primero la que se acabó hace más tiempo; empate por nombre.
7. **Familia.** En una familia cuenta lo que tachó cualquier miembro en la lista de la familia: es la misma lista que ve la pantalla.
8. **Vencimiento (HU-70b).** CA-02 lo menciona "si existe". Todavía no existe: lo agrega SCRUM-103 y entonces se suma a esta regla.

## 6. Estados

| Estado | Qué se ve |
|---|---|
| Cargando | Nada (la lista no espera a las sugerencias) |
| Con sugerencias | La fila con su título "¿Se te acabó?" |
| Sin sugerencias | Nada |
| Error | Nada |

## 7. Errores

Si la consulta falla, no se muestra la fila ni un mensaje de error: las sugerencias son un extra y la lista sigue igual (CA-03).

## 8. UI esperada

- Región con título `h2` "¿Se te acabó?" debajo del encabezado de `/lista` y antes del buscador y la lista. En modo compra va debajo de la barra del modo compra, que sigue siendo lo primero.
- Fila horizontal con scroll y snap, tarjetas de ancho fijo, sin mover la página de lado en el celular.
- Tarjeta: nombre, tamaño ("1000 ml") y "Lo compraste hoy / hace 1 día / hace N días" (días del calendario local).

## 9. Accesibilidad

- `section` con `aria-labelledby` hacia su título: es una región con nombre.
- Las tarjetas son una lista (`ul`/`li`), así que el lector de pantalla anuncia cuántas hay.
- En SCRUM-102 las tarjetas no tienen acciones; las de SCRUM-104 serán botones con nombre accesible.

## 10. Restricciones técnicas

- El cálculo vive en la base (`get_inventory_suggestions`, `security invoker`): lee con la RLS de quien llama y no recibe parámetros.
- Presentación / ViewModel / servicio separados; textos en `constants/`.

## 11. Dependencias

- `find_general_list_id` (024) y el tachado de `list_items` (015, 035).
- `ShoppingListInner` monta `InventorySuggestions`.

## 12. Contratos externos

`get_inventory_suggestions()` → `{ product_catalog_variant_id, product_name, base_quantity, base_unit, last_purchased_at, expected_out_at }[]`. Sin sesión: 42501.

## 13. Casos de aceptación

- **CA-01:** con sugerencias, la fila aparece debajo del encabezado y antes de la lista, y se recorre deslizando (E2E-INV-01 y 02). Sin sugerencias no aparece (E2E-INV-03).
- **CA-02:** se calculan solas con el historial y la categoría (reglas 1 a 6, `supabase/tests/061_inventory_suggestions.test.sql`).
- **CA-03:** si fallan, la lista funciona igual (E2E-INV-04 y test unitario). Ninguna otra pantalla las usa.

### Mapa de pruebas

| Caso | Clasificación | Por qué | Archivo | Test | Escenario E2E |
|---|---|---|---|---|---|
| CA-01 posición | E2E | Solo un navegador mide dónde queda la fila | `e2e/features/inventory-suggestions/inventory-suggestions.spec.ts` | E2E-INV-01 | E2E-INV-01 |
| CA-01 deslizar | E2E | Scroll horizontal real, sin mover la página | mismo | E2E-INV-02 | E2E-INV-02 |
| CA-01 sin sugerencias | Unitario + E2E | Estado del componente y pantalla real | `features/inventory-suggestions/tests/InventorySuggestions.test.tsx` | "sin sugerencias no dibuja nada" | E2E-INV-03 |
| CA-01 tarjetas y textos | Unitario | Textos y orden, sin navegador | mismo y `toLastPurchaseText.test.ts` | "muestra una tarjeta por sugerencia…", "cada tarjeta muestra…" | — |
| CA-02 cálculo | SQL | La regla vive en la base | `supabase/tests/061_inventory_suggestions.test.sql` | pasos 4 a 11 | — |
| CA-03 error | Unitario + E2E | La lista sigue sin la fila | `InventorySuggestions.test.tsx` | "si la carga falla…" | E2E-INV-04 |
| Servicio | Unitario | Llamada y adaptación de la RPC | `inventory-suggestions.service.test.ts` | los 4 casos | — |

## 14. Casos fuera de alcance

- Confirmar (✓) o descartar (✕) una sugerencia: SCRUM-104 (HU-71).
- Chips de duración al tachar: SCRUM-103 (HU-70b).
- Pantalla "Mi inventario", "Ya se acabó", agregar a mano: SCRUM-105, 106 y 107.
- Tabla de inventario (`household_inventory_items`): llega con la primera historia que guarda algo que elige el usuario (SCRUM-103).
- Actualizar la fila al añadir un producto desde el buscador sin recargar: llega con SCRUM-104, que es la que agrega desde la fila.

## 15. Notas de implementación

- **Duraciones por categoría propuestas** (a confirmar con el PO): Lácteos 7, Repostería 60, Dulces y Chocolates 30, Cereales 30, Higiene y Belleza 45, Abarrotes 30, Congelados 30. Se cambian en `category_shelf_life` sin tocar el código.
- Las categorías se cargan por nombre en la 061: una categoría que no existe en la base no inserta nada y usa los 14 días.
