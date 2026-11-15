# Tasks: Modal — foco al abrir, atrapado y devuelto al cerrar (SCRUM-142)

El qué está en [SPEC.md](SPEC.md) y el cómo en [plan.md](plan.md).

**Commits:** las etapas 2 a 5 terminan cada una en un commit que compila por sí solo y se revisa antes de seguir. La Etapa 1 no cambia código y no tiene commit; sus resultados se anotan acá.

**Bloqueos:**

- La implementación (etapas 2 a 5) empieza después de 0.5.
- Cada duda bloquea solo la tarea que indica la tabla del plan, "Dudas":

  | Duda | Bloquea |
  |---|---|
  | 2 | 3.1 |
  | 3 | 2.4 |
  | 5 | 2.2 |
  | 8 | 4.4 |
  | 1 | Se comprueba en 3.3 |
  | 4 y 6 | No bloquean |

## Etapa 0 — Fuente funcional, decisiones y specs

- [x] 0.1 Confrontar SPEC §2 y §13 con la descripción y los criterios de SCRUM-142 en Jira (2026-11-15). Se usó el texto de la tarjeta que compartió la dueña de la historia:
  - los seis criterios quedan como CA-01 a CA-06 en SPEC §13;
  - el contexto del QA del PR #69 y los pasos para reproducirlo, en §1;
  - lo que queda fuera de alcance (una librería o `<dialog>` nativo), en §14 y en la regla 13;
  - D1 queda limitada a las dos opciones de CA-01.
- [x] 0.2 Decisiones de la dueña de la historia (2026-11-15), SPEC §5:
  - **D1:** el primer enfocable o, si no hay, el diálogo.
  - **D2:** devolución automática, salvo que la funcionalidad mueva el foco a propósito.
  - **D3:** si el clic fuera no cierra, el foco vuelve de inmediato al diálogo.
  - **D4, lectura (ii):** quitar la devolución propia de `useMealSlotDialog` y delegarla en el `Modal`. `useWeekListAddition` queda fuera de alcance, sin cambios, y conserva la suya.
- [x] 0.3 **Duda 7 del plan (D4 en Safari):** opción B (2026-11-15).
  - **Qué se hace:** el espacio del planificador se enfoca antes de abrir su diálogo, para que el `Modal` guarde el elemento correcto.
  - **Qué se mantiene:** D2 y D4, sin prop nueva ni devolución en `useMealSlotDialog`.
  - **"Agregar semana a la lista" (opción A):** sin cambios; su limitación en Safari con mouse es un comportamiento conocido.
- [x] 0.4 `components/ui/modal/specs/SPEC.md`, `plan.md` y `tasks.md` (2026-11-15), actualizados con D1 a D4 y la duda 7, y revisados entre sí.
- [x] 0.5 Revisión y aprobación de la documentación por el equipo. Aprobada (2026-11-15), incluido D4 con la lectura (ii). Las dudas 1 a 6 y 8 siguen pendientes, con los bloqueos de arriba. Puntos revisados:
  - [x] **Criterios:** CA-01 a CA-06 de Jira en SPEC §13, cada uno con sus pruebas.
  - [x] **Decisiones:** D1 a D4 (D4 con la lectura (ii)) y la duda 7 (opción B), en SPEC §5.
  - [x] **Alcance:**
    - el planificador (`MealSlot.tsx`, `MealPlannerDay.tsx`, `useMealSlotDialog` y sus tests) en SPEC §2 y §10;
    - lo que queda fuera, en §14: "Agregar semana a la lista" (hook, botón, comportamiento y tests sin cambios; opción A).
  - [x] **Dos fuentes en "Agregar semana":** el `Modal` y `useWeekListAddition` devuelven el foco al mismo botón (plan, "Riesgos").
  - [x] **SCRUM-61:** el foco al título después de eliminar (regla 9, SPEC §15, casos 11 y 18, `TC-SCRUM-142-02`).
  - [x] **Dudas y bloqueos:** la tabla del plan, "Dudas". Las 3 y 8 son verificaciones manuales pendientes.
  - [x] **Riesgos:** plan, "Riesgos".
  - [x] **Pruebas:**
    - los 19 casos unitarios y su cobertura;
    - la regresión del planificador (espacios con tests movidos; "Agregar semana" sin cambios) y de SCRUM-61;
    - los E2E existentes;
    - `TC-SCRUM-142-01` a `13`.
- [ ] 0.6 Commit `docs(SCRUM-142): add modal focus management planning`, push y PR hacia `develop` con un solo label; Jira en el estado equivalente.

## Etapa 1 — Comprobar el comportamiento actual (sin cambiar código)

- [ ] 1.1 Dudas 2, 3 y 4 del plan. Anotar el resultado acá.
  - **Duda 2:** `activeElement` en jsdom al quitar el nodo enfocado. Bloquea 3.1.
  - **Duda 3 (verificación manual pendiente):** clic y toque en el fondo, en Chrome desktop y mobile. Que `preventDefault` en `mousedown` conserva el foco sin cancelar el `click`, y qué `focusout` llega. Bloquea 2.4.
  - **Duda 4:** el botón deshabilitado con foco, en Chrome. No bloquea.

  La duda 1 (orden de los efectos en SCRUM-61) no se puede observar sin la devolución; se comprueba en 3.3.
- [ ] 1.2 Duda 5: buscar controles ocultos con clases (`hidden`, `sr-only`) dentro de los diálogos de SPEC §11. Bloquea 2.2.
- [ ] 1.3 Duda 6: revisar los E2E de `date-lists`, `meal-planner` y `shopping-list` que abren diálogos. No bloquea; anticipa 5.3.
- [ ] 1.4 **Duda 8 (verificación manual pendiente):** comprobar que el espacio del planificador sigue siendo el mismo nodo después de guardar y de quitar. No está resuelta. Bloquea el cierre de la Etapa 4 (4.4).

## Etapa 2 — Foco inicial, Tab circular y vuelta inmediata

- [ ] 2.1 `KEYBOARD_KEY` y `FOCUSABLE_SELECTOR` en `constants/ui.constants.ts`; mover `ESCAPE_KEY` del hook.
- [ ] 2.2 `getFocusableElements`, con sus tests.
- [ ] 2.3 `useModalViewModel`:
  - `onClose` en un ref;
  - efecto de apertura solo con `isOpen`;
  - foco inicial (D1);
  - `onKeyDown` con Tab y Shift+Tab (regla 7);
  - Tab en `document` si el foco ya salió;
  - Escape como hoy.

  En `Modal.tsx`: ref, `onKeyDown` y `tabIndex={-1}` en el diálogo.
- [ ] 2.4 Vuelta inmediata (D3, regla 11):
  - `onMouseDown` del fondo con `preventDefault`;
  - `focusout` en el diálogo, con microtarea y la condición de diálogo conectado y abierto.
- [ ] 2.5 `Modal.page.ts` y los casos 1 a 6, 9, 13, 15, 16 y 17 del plan, "Pruebas".

## Etapa 3 — Devolver el foco

- [ ] 3.1 Devolución en la limpieza del efecto de apertura, con las dos condiciones de la regla 9 (D2).
- [ ] 3.2 Casos 7, 8, 10, 11, 12, 14, 18 y 19 del plan, "Pruebas".
- [ ] 3.3 Regresión: `npm test` completo.
  - El test de SCRUM-61 ("keeps the focus stable") pasa **sin cambios**.
  - Si algún test de otra feature, fuera del planificador, tiene que cambiar, anotar cuál y por qué.
  - **Duda 1:** comprobar en Chrome que, al eliminar un integrante, el foco termina en el título. Anotar el resultado.

## Etapa 4 — Planificador (D4 y duda 7, opción B)

- [ ] 4.1 Quitar `openerRef`, `wasOpenRef` y el efecto de foco de `useMealSlotDialog`.
  - **No tocar (D4, lectura (ii)):** `useWeekListAddition`, `AddWeekToListButton` ni su comportamiento. Conservan su devolución de foco.
- [ ] 4.2 Opción B:
  - `MealSlot.tsx` enfoca su botón (`event.currentTarget.focus()`) antes de llamar a `onOpen`;
  - `onSlotOpen` y `MealPlannerDay` dejan de pasar el botón;
  - `MealSlotProps` se ajusta si `onOpen` ya no lo necesita.
- [ ] 4.3 Tests:
  - quitar los 4 de foco de `useMealSlotDialog.test.ts`;
  - no tocar `useWeekListAddition.test.ts` ni `MealPlannerWeekList.test.tsx` (D4);
  - pasar "…after saving" y "…after removing" a `MealPlannerAssign.test.tsx`;
  - reemplazar "…even when the click did not focus it" por la prueba de pantalla con `fireEvent.click` del plan, "Regresión".
- [ ] 4.4 Regresión:
  - `MealPlannerAssign.test.tsx` pasa sin cambios en su caso de foco existente;
  - `MealPlannerWeekList.test.tsx` y `useWeekListAddition.test.ts` pasan sin ningún cambio.
- [ ] 4.5 Nota en `features/meal-planner/specs/SPEC.md` (§9): el foco de vuelta del espacio lo hace el `Modal` compartido (SCRUM-142). La §16.8 ("Agregar semana") no cambia.

## Etapa 5 — Documentación, verificación y cierre

- [ ] 5.1 La línea del `Modal` en `components/ui/specs/SPEC.md` enlaza a esta spec; actualizar el comentario de `useModalViewModel`.
- [ ] 5.2 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check`.
- [ ] 5.3 E2E existentes con diálogos: `npx playwright test e2e/features/date-lists e2e/features/meal-planner e2e/features/shopping-list`.
- [ ] 5.4 Verificación manual con teclado, `TC-SCRUM-142-01` a `13` (plan), incluidos D3 en `TC-SCRUM-142-02` y D4 en `TC-SCRUM-142-05` y `06`.
- [ ] 5.5 Marcar SPEC §13 solo con lo validado.
- [ ] 5.6 `code-reviewer` y `qa-checker`.
- [ ] 5.7 Descripción del PR con la evidencia, `waiting qa` y Jira.

## Fuera de esta historia

- [ ] Fondo inerte y bloqueo de scroll (SPEC §14).
- [ ] Unificar `ESCAPE_KEY` en Finanzas.
- [ ] Notas antiguas de "el `Modal` no atrapa el foco" en los planes de household, recetas y el planificador: son registro de esas historias, no se reescriben.

Comportamiento conocido, no es trabajo pendiente: en "Agregar semana a la lista", en Safari con mouse, el foco no vuelve al botón al cerrar (opción A, SPEC §14).
