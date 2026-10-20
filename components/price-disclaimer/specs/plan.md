# Plan: Aviso de precios estimados

El qué está en [SPEC.md](SPEC.md) y los pasos en [tasks.md](tasks.md).

## SCRUM-75: aviso de precios estimados

> **Verificado el 2026-10-19** contra `develop` en `edaa8bb`: no hay ningún aviso de precios en el código. Muestran precios: las tarjetas del catálogo (`components/catalog-card/CatalogCard.tsx`, usadas por `CatalogSearch` y `MyProducts`) y el detalle de producto de `/lista` (`ShoppingListItemDetail`). Las filas de `/lista` y `ProductSearch` no muestran precios. Finanzas está en el PR #70 (SCRUM-69) y el Historial (HU-59) no existe.

### Archivos

```
components/price-disclaimer/
  PriceDisclaimer.tsx                       nuevo: el recuadro (<aside> con título y texto)
  constants/price-disclaimer.constants.ts   nuevo: PRICE_DISCLAIMER_TEXT (TITLE, BODY)
  tests/PriceDisclaimer.test.tsx            nuevo

features/catalog/CatalogSearch.tsx                              + <PriceDisclaimer /> al final de los resultados
features/my-products/MyProducts.tsx                             + <PriceDisclaimer /> debajo de las tarjetas
features/shopping-list/components/ShoppingListItemDetail.tsx    + <PriceDisclaimer /> bajo "Precio de referencia…"
+ un caso en el test de cada pantalla: el aviso aparece una sola vez

Después del merge de #70:
features/finance/FinanceDashboard.tsx                           + <PriceDisclaimer /> cerca del gasto y el presupuesto
```

No cambian los precios, los servicios, `CatalogCard` ni `components/ui`.

### Decisiones

- **Componente propio, no `components/ui`:** es un texto de producto, no un primitivo visual. Mismo criterio que `catalog-card/` o `app-shell/`.
- **Fuera de `CatalogCard`:** si fuera dentro, se repetiría en cada tarjeta (SPEC regla 2).
- **Sin props:** el texto es fijo; el espacio alrededor lo pone cada pantalla.
- **`<aside aria-labelledby>`:** nombre accesible sin interrumpir (SPEC §9).

### Pruebas

- **Componente:** el título y el texto exactos (CA-03); es un `aside` con nombre «Precios estimados»; no tiene `role="alert"`, `role="status"` ni botones (CA-02).
- **Cada pantalla:** el aviso aparece una sola vez, también con varias tarjetas o resultados (CA-01, CA-02); en "Buscar", también sin resultados.
- **Manual:** desktop y mobile; que no tape tarjetas, botones ni la barra de navegación de mobile.
- Sin E2E: no hay flujo nuevo; lo cubren los tests de pantalla.

### Dependencias y Gitflow

- Rama `ticket/SCRUM-75-aviso-precios-estimados` desde `develop` (`edaa8bb`).
- El PR abre con label `in progress`: la autora no tiene otro en `in progress` (#69 y #70 en `waiting qa`).
- **Dashboard:** cuando se mergee #70, traer `develop` a esta rama y agregar el aviso. El resto de la historia no espera.
- **Historial:** lo integra HU-59 (SCRUM-90) con este componente; queda anotado en su ticket.

### Documento del proyecto

§4.6 ya pide el aviso; no cambia ninguna decisión de producto. Al cerrar, una línea en §4.6 con el texto aprobado y dónde se muestra.

### Commits y PR

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-75): add estimated prices notice planning` | `components/price-disclaimer/specs/` |
| 2 | `feat(SCRUM-75): add price disclaimer component` | componente, constantes y test |
| 3 | `feat(SCRUM-75): show price disclaimer next to product prices` | catálogo, mis productos, detalle de `/lista` y sus tests |
| 4 | `feat(SCRUM-75): show price disclaimer in Finanzas` | después del merge de #70 |
| 5 | `docs(SCRUM-75): …` | `tasks.md`, SPEC §13 con lo validado, `documento-proyecto.md` §4.6 |
