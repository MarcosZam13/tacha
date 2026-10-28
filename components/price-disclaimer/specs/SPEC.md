# Feature: Aviso de precios estimados

Historia (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-75 / HU-43](https://tacha.atlassian.net/browse/SCRUM-75): aviso de precios estimados. Sprint 3, epic SCRUM-11, en planificación.

El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md). Producto: [documento-proyecto.md §4.6](../../../docs/documento-proyecto.md#46-historial-de-compras) («aviso obligatorio y siempre visible»); diseño: `price-disclaimer-banner` en [DESIGN.md](../../../docs/DESIGN.md) (componentes nuevos, §7.9 y §7.11).

## 1. Objetivo

Que nadie confunda un precio o un total de Tacha con un precio garantizado: los precios del catálogo vienen de scraping y pueden no coincidir con lo que se cobra en caja, y Tacha no está afiliado a ningún supermercado.

## 2. Alcance

Incluye un componente compartido `PriceDisclaimer` (el `price-disclaimer-banner` de DESIGN.md): un recuadro informativo pequeño con un título y un texto fijos. Va **una sola vez por pantalla o sección**, nunca en cada tarjeta, en las pantallas que hoy muestran precios (verificado el 2026-10-19 en `develop`, `edaa8bb`):

| Pantalla | Ruta | Dónde va el aviso |
|---|---|---|
| Catálogo → "Buscar" | `/catalogo` (`features/catalog/CatalogSearch.tsx`) | Al final de los resultados de búsqueda (es también el final del catálogo) |
| Catálogo → "Mis productos" | `/catalogo/mis-productos` (`features/my-products/MyProducts.tsx`) | Debajo de las tarjetas |
| Lista general → detalle de un producto | `/lista` (`features/shopping-list/components/ShoppingListItemDetail.tsx`) | Justo debajo de "Precio de referencia por supermercado" (P1, confirmado) |

**Pantallas con dependencias** (no existen en `develop`; se integran cuando estén):

| Pantalla | Dependencia | Cuándo |
|---|---|---|
| Finanzas → Dashboard | SCRUM-69, PR #70 (`waiting qa`, sin mergear) | En esta historia, después del merge de #70 |
| Finanzas → Historial | HU-59 / SCRUM-90 (sin empezar) | Lo integra esa historia con este componente |

No incluye: crear las pantallas de Finanzas o Historial, ni cambiar cómo se calculan o muestran los precios.

## 3. Entradas

No aplica: el componente no recibe datos. El título y el texto son constantes.

## 4. Salidas

- El recuadro con el título y el texto, en cada pantalla de §2.
- No cambia ningún precio, total ni control de esas pantallas.

## 5. Reglas de negocio

**Decididas por la dueña de la historia** (2026-10-19):

1. **Texto exacto** (CA-03):
   - Título: **«Precios estimados»**.
   - Texto: **«Los precios son aproximados y pueden variar según el supermercado. Tacha no está afiliado a ningún supermercado.»**
2. **Una sola vez por pantalla o sección**, nunca en cada tarjeta ni en cada fila (CA-02; DESIGN.md: «sin volverse ruido visual repetido»).
3. **Finanzas e Historial** se integran cuando existan sus pantallas y se resuelvan sus dependencias (§2).
4. **P1. Lista general (confirmado 2026-10-19):** las filas de `/lista` no muestran precios. El aviso va dentro del detalle de un producto, justo debajo de «Precio de referencia por supermercado», y no debajo de la lista. Si en el futuro las filas muestran precio, se agrega debajo de la lista.

**Reglas:**

5. Siempre visible en esas pantallas (CA-01): no se puede cerrar ni depende de los datos. Si una búsqueda no tiene resultados, el aviso puede seguir.
6. Discreto y sin tapar nada (CA-02): va en el flujo normal de la página (no flotante, no fijo, no modal), después del contenido con precios, y no se superpone a controles ni a la barra de navegación de mobile.

## 6. Estados

No aplica: el aviso no tiene estados.

## 7. Errores

No aplica: no hace llamadas ni recibe datos.

## 8. UI esperada

- Recuadro pequeño con borde fino `border-tacha-border`, fondo suave (`bg-tacha-surface` o similar) y esquinas redondeadas; ancho del contenido de la pantalla.
- Título «Precios estimados» en `text-sm font-semibold`; texto en `text-xs`, color secundario (`text-tacha-textsec`).
- Sin colores ni íconos de alerta (no es un error).
- En mobile, el texto se parte en varias líneas sin cortar palabras.

## 9. Accesibilidad

- Es un `<aside>` con nombre accesible «Precios estimados» (`aria-labelledby` hacia su título): el lector de pantalla lo encuentra, pero no interrumpe.
- **No** lleva `role="alert"` ni `role="status"`, ni se puede cerrar.
- Contraste AA de los dos textos sobre su fondo.
- No recibe foco: no tiene controles.

## 10. Restricciones técnicas

- Vive en `components/price-disclaimer/` (lo usan varias features; project-structure). Título y texto en constantes, sin strings sueltos.
- Componente de presentación sin props, sin estado ni efectos.
- Las pantallas solo lo importan y lo ponen; no cambia su lógica ni sus datos.
- Tests del componente y de cada pantalla que lo incluye (CONTRIBUTING §7).

## 11. Dependencias

| Dependencia | Estado (2026-10-19) | Efecto |
|---|---|---|
| Catálogo "Buscar" y "Mis productos" (`components/catalog-card/`) | En `develop` | Se agrega el aviso a las dos pantallas |
| `/lista`, detalle de producto | En `develop` | Se agrega bajo "Precio de referencia por supermercado" (P1) |
| SCRUM-69 (Finanzas, Dashboard) | PR #70 en `waiting qa`, sin mergear | Se agrega después del merge |
| HU-59 / SCRUM-90 (Historial) | Sin empezar | Lo integra esa historia |

## 12. Contratos externos

No aplica: no usa Supabase ni otras APIs.

## 13. Casos de aceptación

### HU-43 (SCRUM-75)

Validado el 2026-10-19: tests automáticos y prueba manual de la dueña de la historia en las 3 pantallas existentes (`/catalogo`, `/catalogo/mis-productos` y el detalle de `/lista`), con capturas adjuntas al PR #72. No se registró la prueba en mobile.

- [ ] **CA-01:** el aviso está siempre visible cerca de los precios en "Buscar" (al final de los resultados), "Mis productos" (debajo de las tarjetas) y el detalle de producto de `/lista`. Finanzas (Dashboard), después del merge de #70. Historial, con HU-59.
  - Validado en las 3 pantallas existentes; en `/catalogo`, también antes de buscar y sin resultados.
  - Sin marcar hasta Finanzas (#70, sin mergear) e Historial (HU-59, sin empezar).
- [x] **CA-02:** el aviso es discreto: aparece una sola vez por pantalla, no tapa contenido ni controles y no interrumpe (sin `role="alert"`). Validado con los tests y las capturas.
- [x] **CA-03:** muestra el título «Precios estimados» y el texto exacto de la regla 1. Validado con los tests y las capturas.
- [x] Tests del componente y de cada pantalla; `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

## 14. Casos fuera de alcance

- Crear las pantallas de Finanzas o Historial.
- Mostrar precios en las filas de `/lista`.
- Cambiar cómo se calculan o muestran los precios.
- Un aviso que se pueda cerrar o recordar.

## 15. Notas de implementación

- El texto aprobado es distinto del ejemplo de DESIGN.md §7.9 («Los precios son estimados, Tacha no está afiliado a ningún supermercado»); manda el de la regla 1.
- `ProductSearch` (buscador de `/lista` y de recetas) no muestra precios, así que no lleva aviso.
