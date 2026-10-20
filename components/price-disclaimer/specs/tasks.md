# Tasks: Aviso de precios estimados

El qué está en [SPEC.md](SPEC.md) y el cómo en [plan.md](plan.md).

## SCRUM-75: aviso de precios estimados

### Etapa 0 — Decisiones

- [x] 0.1 Alcance de la dueña de la historia (2026-10-19): componente compartido, recuadro con título y texto exactos, una vez por pantalla, ubicaciones de SPEC §2; Finanzas e Historial cuando existan.
- [x] 0.2 P1 confirmado (2026-10-19): en `/lista`, el aviso va dentro del detalle de producto, justo debajo de «Precio de referencia por supermercado». SPEC §5.

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 `components/price-disclaimer/specs/SPEC.md`, `plan.md` y `tasks.md`.
- [x] 1.2 Revisión y aprobación de la documentación (la dueña de la historia aprobó el alcance, 2026-10-19).
- [x] 1.3 Commit `docs(SCRUM-75): add estimated prices notice planning` (`e99484e`), push y abrir el PR hacia `develop` con label `in progress` (PR #72); SCRUM-75 a In Progress en Jira.

### Etapa 2 — Componente (commit `feat`)

- [x] 2.1 `PriceDisclaimer`, sus constantes (`constants/price-disclaimer.constants.ts`, en el barrel `constants/index.ts`) y sus tests (`tests/PriceDisclaimer.page.ts` y `tests/PriceDisclaimer.test.tsx`).

### Etapa 3 — Pantallas (commit `feat`)

- [x] 3.1 Catálogo "Buscar" (al final de los resultados), "Mis productos" (debajo de las tarjetas) y detalle de producto en `/lista`, con un test por pantalla.
  - Tests: `features/catalog/tests/CatalogSearch.test.tsx` (nuevo), un caso en `features/my-products/tests/MyProducts.test.tsx` y `features/shopping-list/tests/ShoppingListItemDetail.test.tsx` (nuevo).
  - Comprueban que el aviso aparece una sola vez y en su lugar: después de los resultados y de las tarjetas (fuera de la grilla), y en `/lista` como el elemento inmediato después de "Precio de referencia por supermercado".
- [x] 3.2 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` (2026-10-19): los cuatro sin errores; Vitest completo, 837 tests en 93 archivos; `git diff --check` limpio.

### Etapa 4 — Finanzas (después del merge de #70)

- [ ] 4.1 Traer `develop` y agregar el aviso al Dashboard, con su test. **Bloqueada:** el PR #70 (SCRUM-69) sigue en `waiting qa`, sin mergear (2026-10-19).

### Etapa 5 — QA y cierre

- [ ] 5.1 Prueba manual en desktop y mobile (CA-01 a CA-03), con capturas.
  - Hecho por la dueña de la historia (2026-10-19), con 3 capturas (adjuntas al PR #72):
    1. `/catalogo`: el aviso al final de los resultados; también visible antes de buscar y sin resultados;
    2. `/catalogo/mis-productos`: debajo de las tarjetas, una sola vez y fuera de la grilla;
    3. `/lista`: inmediatamente debajo de «Precio de referencia por supermercado» cuando se muestran los precios.
  - Falta: la prueba en mobile (no está registrada).
- [ ] 5.2 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.6.
  - Hecho: SPEC §13, con CA-02, CA-03 y los tests marcados; CA-01, sin marcar hasta Finanzas e Historial.
  - Falta: la línea de §4.6.
- [ ] 5.3 `code-reviewer` y `qa-checker`.
- [ ] 5.4 Descripción del PR, `waiting qa` y Jira.
  - Hecho: la descripción final del PR, preparada.
  - Falta: publicarla, `waiting qa` y Jira (la dueña de la historia).

### Fuera de esta historia

- [ ] El aviso en el Historial: lo integra HU-59 (SCRUM-90).
