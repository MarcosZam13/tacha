# Plan E2E: Modal — foco al abrir, atrapado y devuelto al cerrar (SCRUM-142)

Deriva de [SPEC.md](SPEC.md) §13 (CA-01 a CA-04) y de [plan.md](plan.md#pruebas). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests van en `e2e/features/modal/modal-focus.spec.ts` (escenarios `E2E-MODAL-nn`), y cada `test(...)` lleva el ID del escenario en el nombre.

## Qué validan y qué no

**Validan el foco en un navegador real** (Chromium desktop y Pixel 7), que jsdom no reproduce del todo (plan, dudas 2 y 4). Lo hacen sobre la demo del `Modal` en `/ui-kit`.

- **Por qué `/ui-kit`:** es una ruta de desarrollo (`proxy.ts` la corta en producción) que Playwright levanta con `npm run dev`. No necesita sesión ni datos de la base compartida.
- **Por qué el mismo `Modal`:** es el componente que usan las 14 instancias de SPEC §11, así que el mecanismo es el mismo para todas.

**No validan:**

- **Cada pantalla que usa el `Modal`:** lo cubre la revisión manual con teclado (`TC-SCRUM-142-01` a `17`, CA-06).
- **El caso de SCRUM-61:** lo cubren `features/household/tests/HouseholdRemoveMember.test.tsx` y la verificación manual de la 3.3, porque necesita una familia real.
- **Un clic fuera que no cierra (D3):** la demo siempre cierra. Lo cubren los casos 16 y 17 de `components/ui/modal/tests/Modal.test.tsx` y la verificación manual de la duda 3.
- **El planificador:** lo cubren `features/meal-planner/tests/MealPlannerAssign.test.tsx` y los E2E existentes de `meal-planner`.

## Datos y entorno

- **Ruta:** `/ui-kit`, sección «Modal», botón «Abrir modal».
- **Diálogo:** «Confirmar acción», con los botones «Cancelar» y «Confirmar». Los dos cierran.
- **Sin sesión, sin datos y sin respuestas simuladas.** No hay nada que limpiar.

## Escenarios

### E2E-MODAL-01: al abrir, el foco pasa al primer elemento del diálogo

- **Cubre:** CA-01, D1.
- **Pasos:** abrir `/ui-kit` y tocar «Abrir modal».
- **Resultado esperado:** «Cancelar», el primer elemento enfocable del diálogo, tiene el foco.

### E2E-MODAL-02: Tab y Shift+Tab no salen del diálogo

- **Cubre:** CA-02, regla 7.
- **Pasos:** abrir el diálogo; Tab, Tab, Shift+Tab.
- **Resultado esperado:** el foco pasa a «Confirmar», vuelve a «Cancelar» y con Shift+Tab va a «Confirmar». Nunca llega a «Abrir modal» ni a la página de atrás.

### E2E-MODAL-03: Escape cierra y devuelve el foco

- **Cubre:** CA-03, CA-04, D2.
- **Pasos:** abrir el diálogo y pulsar Escape.
- **Resultado esperado:** el diálogo se cierra y «Abrir modal» tiene el foco.

### E2E-MODAL-04: un clic en el fondo cierra y devuelve el foco

- **Cubre:** CA-03, CA-04, D2, y que cancelar el `mousedown` del fondo (D3) no rompe el clic fuera.
- **Pasos:** abrir el diálogo y hacer clic en la esquina superior izquierda, sobre el fondo oscuro.
- **Resultado esperado:** el diálogo se cierra y «Abrir modal» tiene el foco.

## Cobertura

| Criterio | Escenarios E2E | Otros niveles |
|---|---|---|
| CA-01 | E2E-MODAL-01 | `Modal.test.tsx` (casos 1 y 2), manual |
| CA-02 | E2E-MODAL-02 | `Modal.test.tsx` (casos 2 a 6), manual |
| CA-03 | E2E-MODAL-03 y 04 | `Modal.test.tsx` (casos 7, 8, 10 a 12, 14, 18 y 19), `HouseholdRemoveMember.test.tsx`, `MealPlannerAssign.test.tsx`, manual |
| CA-04 | E2E-MODAL-03 y 04 | `Modal.test.tsx` (casos 7 a 9 y 15 a 17), manual (duda 3) |
| CA-05 | — | `components/ui/modal/tests/` |
| CA-06 | E2E-MODAL-01 a 04 (solo `/ui-kit`, TC-01) | Manual: `TC-SCRUM-142-02` a `17` |

**Última corrida:** 2026-11-15, `npx playwright test e2e/features/modal`: 8 de 8 (E2E-MODAL-01 a 04, en `chromium` y `mobile-chrome`). Se volvió a correr después de las correcciones de la revisión, con el mismo resultado.

**E2E existentes con diálogos** (`date-lists`, `meal-planner`, `shopping-list`), corridos por regresión:

- **Primera corrida:** pasaron los 23 de `chromium` y fallaron 11 de 23 en `mobile-chrome`.
- **Corridas siguientes:** fallaron también en `chromium`.
- **Clasificación:** entorno. Las capturas muestran que la página no pudo cargar datos del backend compartido antes de abrir ningún diálogo, y el código del `Modal` no participa en esa carga.
- **Tercera corrida (2026-11-15):** 14 de 46. Mismos errores de carga, y en el planificador los espacios quedan deshabilitados sin plan.
- **Pendiente:** volver a correrlos cuando el backend responda (tasks 5.3).
