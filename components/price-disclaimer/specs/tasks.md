# Tasks: Aviso de precios estimados

El qué está en [SPEC.md](SPEC.md) y el cómo en [plan.md](plan.md).

## SCRUM-75: aviso de precios estimados

### Etapa 0 — Decisiones

- [x] 0.1 Alcance de la dueña de la historia (2026-10-19): componente compartido, recuadro con título y texto exactos, una vez por pantalla, ubicaciones de SPEC §2; Finanzas e Historial cuando existan.
- [x] 0.2 P1 confirmado (2026-10-19): en `/lista`, el aviso va dentro del detalle de producto, justo debajo de «Precio de referencia por supermercado». SPEC §5.

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 `components/price-disclaimer/specs/SPEC.md`, `plan.md` y `tasks.md`.
- [x] 1.2 Revisión y aprobación de la documentación (la dueña de la historia aprobó el alcance, 2026-10-19).
- [ ] 1.3 Commit `docs(SCRUM-75): add estimated prices notice planning`, push y abrir el PR hacia `develop` con label `in progress`; SCRUM-75 a In Progress en Jira.

### Etapa 2 — Componente (commit `feat`)

- [ ] 2.1 `PriceDisclaimer`, sus constantes y sus tests.

### Etapa 3 — Pantallas (commit `feat`)

- [ ] 3.1 Catálogo "Buscar" (al final de los resultados), "Mis productos" (debajo de las tarjetas) y detalle de producto en `/lista`, con un test por pantalla.
- [ ] 3.2 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`.

### Etapa 4 — Finanzas (después del merge de #70)

- [ ] 4.1 Traer `develop` y agregar el aviso al Dashboard, con su test.

### Etapa 5 — QA y cierre

- [ ] 5.1 Prueba manual en desktop y mobile (CA-01 a CA-03), con capturas.
- [ ] 5.2 Marcar SPEC §13 solo con lo validado; `documento-proyecto.md` §4.6.
- [ ] 5.3 `code-reviewer` y `qa-checker`.
- [ ] 5.4 Descripción del PR, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] El aviso en el Historial: lo integra HU-59 (SCRUM-90).
