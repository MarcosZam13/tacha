# Tasks: Modal — foco al abrir, atrapado y devuelto al cerrar (SCRUM-142)

El qué está en [SPEC.md](SPEC.md) y el cómo en [plan.md](plan.md).

**Commits:** las etapas 2 a 5 terminan cada una en un commit que compila por sí solo y se revisa antes de seguir. La Etapa 1 no cambia código y no tiene commit; sus resultados se anotan acá.

**Bloqueos:**

- La implementación (etapas 2 a 5) empieza después de 0.5.
- Cada duda bloquea solo la tarea que indica la tabla del plan, "Dudas":

  | Duda | Bloquea | Estado (2026-11-15) |
  |---|---|---|
  | 8 | — (4.4 desbloqueada) | Resuelta por análisis del código y por un test de pantalla (1.4) |
  | 3 | — (2.4 desbloqueada) | Resuelta por verificación manual |
  | 2 | — (3.1 desbloqueada) | Resuelta |
  | 5 | — (2.2 desbloqueada) | Resuelta |
  | 1 | — | Resuelta por análisis y confirmada en Chrome (3.3) |
  | 4 y 6 | — | Resueltas |

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
  - [x] **Dudas y bloqueos:** la tabla del plan, "Dudas". Al revisar, las 3 y 8 eran verificaciones manuales pendientes; la 3 ya se resolvió (1.1).
  - [x] **Riesgos:** plan, "Riesgos".
  - [x] **Pruebas:**
    - los 19 casos unitarios y su cobertura;
    - la regresión del planificador (espacios con tests movidos; "Agregar semana" sin cambios) y de SCRUM-61;
    - los E2E existentes;
    - `TC-SCRUM-142-01` a `13`.
- [ ] 0.6 Commit `docs(SCRUM-142): add modal focus management planning`, push y PR hacia `develop` con un solo label; Jira en el estado equivalente.

## Etapa 1 — Comprobar el comportamiento actual (sin cambiar código)

Experimentos desechables en el scratchpad, fuera del repo, con React 19.2.8, jsdom 29 y el Chromium 153 de Playwright 1.63. El detalle está en el plan, "Dudas".

- [x] 1.1 Dudas 1 a 4 del plan.
  - [x] **Duda 1 (2026-11-15):** una simulación con React confirma que la limpieza del `Modal` corre antes que el efecto que enfoca el título, así que el título gana. Confirmada en Chrome en la 3.3.
  - [x] **Duda 2 (2026-11-15):** en jsdom, al quitar el nodo enfocado, `activeElement` pasa a `body` y no se dispara `focusout`. La regla 9 no necesita otra condición. Desbloquea 3.1.
  - [x] **Duda 3 (verificación manual, 2026-11-15):** clic y toque en el fondo, en Chrome desktop y mobile. Se quería saber si `preventDefault` en `mousedown` conserva el foco sin cancelar el `click`, y qué `focusout` llega.
    - **Resultado:** según la verificación manual de la dueña de la historia, las pruebas del fondo funcionaron como se esperaba en Chrome desktop y mobile.
    - **No registrado:** el detalle de cada corrida (`focusout`, `relatedTarget`, foco a los 100 ms), la versión del navegador ni el dispositivo móvil.
    - **Desbloquea 2.4:** el diseño conserva las dos piezas de D3 (`mousedown` y `focusout`), así que no depende de ese detalle.
  - [x] **Duda 4 (2026-11-15):** en Chromium, un botón con foco que pasa a `disabled` manda el foco a `body` en el siguiente cuadro, con `blur` y `focusout` (`relatedTarget` en `null`); sin D3, el siguiente Tab sale al fondo.
    - **Hallazgo:** Chromium también dispara `focusout` al quitar el diálogo, con el diálogo todavía conectado. La condición de D3 se evalúa en la vuelta agendada (2.4).
    - **Diferencia con jsdom:** no dispara ninguno de los dos eventos, así que los casos 17 y 18 los disparan a mano.
- [x] 1.2 Duda 5 (2026-11-15): ninguno de los 14 diálogos ni sus componentes internos tiene controles enfocables ocultos con clases. Los `sr-only` son texto dentro de botones. Desbloquea 2.2.
- [x] 1.3 Duda 6 (2026-11-15): los E2E de `date-lists`, `meal-planner` y `shopping-list` usan los diálogos solo con localizadores, sin teclado, aserciones de foco ni clics en el fondo. No se esperan cambios; la 5.3 los corre igual.
- [x] 1.4 **Duda 8 (2026-11-15), resuelta por análisis del código y por un test de pantalla:** el espacio del planificador sigue siendo el mismo nodo después de guardar y de quitar.
  - El plan se actualiza en el lugar (`plan.saveEntry` y `plan.removeEntry`), `WeekGrid` no se desmonta y las `key` no cambian (plan, duda 8).
  - `MealPlannerAssign.test.tsx` lo comprueba con `toBe` sobre el nodo.
  - En el navegador real queda en `TC-SCRUM-142-05`, sin ejecutar.

## Etapa 2 — Foco inicial, Tab circular y vuelta inmediata

- [x] 2.1 (2026-11-15) `KEYBOARD_KEY` y `FOCUSABLE_SELECTOR` en `constants/ui.constants.ts`. `ESCAPE_KEY` ya no está en el hook.
- [x] 2.2 (2026-11-15) `components/ui/modal/utils/getFocusableElements.ts`, con `tests/getFocusableElements.test.ts` (4 tests). Excluye deshabilitados (también dentro de un `fieldset` deshabilitado), `tabindex="-1"`, `input type="hidden"`, enlaces sin `href` y lo que está dentro de `[hidden]` o `[inert]`.
- [x] 2.3 (2026-11-15) `useModalViewModel` y `Modal.tsx`:
  - `onClose` con `useEffectEvent`, en vez de un ref (plan, "Decisiones");
  - efecto de apertura solo con `isOpen`;
  - foco inicial (D1);
  - Tab y Shift+Tab circulares (regla 7), y Tab con el foco fuera del diálogo;
  - Escape como hoy.

  Todo en **un solo oyente `keydown` en `document`**, en vez de un `onKeyDown` en el diálogo (plan, "Diseño propuesto", punto 2). En `Modal.tsx`: `ref`, `tabIndex={-1}` y `outline-none` en el diálogo. El retorno del hook está tipado en `models/ModalViewModel.interface.ts`.
- [x] 2.4 (2026-11-15) Vuelta inmediata (D3, regla 11). Se desbloqueó con la duda 3 (1.1).
  - **Fondo:** `onMouseDown` con `preventDefault`, solo si el `mousedown` es sobre el fondo mismo. Lo devuelve el ViewModel (`onOverlayMouseDown`); el clic fuera sigue llamando a `onClose`.
  - **Salida del diálogo:** un oyente nativo `focusout` en el diálogo, dentro del efecto de apertura (en vez del `onBlur` que proponía el plan). La vuelta se agenda con `setTimeout` de 0 ms (`MODAL_FOCUS_RETURN_DELAY_MS`, en `constants/ui.constants.ts`) en vez de una microtarea; es una precaución, no algo medido (plan, "Diseño propuesto", punto 3). La limpieza la cancela, y además solo actúa si el diálogo sigue conectado.
  - **Destino:** el elemento que perdió el foco, si sigue conectado y habilitado; si no, el primer enfocable; si no hay, el diálogo.
  - **Tests:** casos 16 (2 tests), 17 (3 tests) y la parte de D3 del caso 18 (1 test).
    - El test del respaldo de Tab pasa a timers falsos, para que la vuelta de D3 no lo tape.
    - `Modal.page.ts` suma `isOverlayMouseDownCancelled`, `isDialogMouseDownCancelled` y `pressTabWithFakeTimers`. Los dos primeros se llamaban `mouseDownOnOverlay` y `mouseDownInsideDialog`; se renombraron por la revisión de QA (5.6).
  - **Resultados:** pasan los 29 tests del Modal, y también `npm test` (154 archivos, 1628 tests), `npx tsc --noEmit`, `npm run lint` y `git diff --check`.
  - **Mutaciones temporales:**
    - sin `focusout`, fallan los 3 tests del caso 17;
    - sin el `preventDefault`, falla el del `mousedown`;
    - con microtarea, o sin cancelar ni mirar `isConnected`, no falla ninguno (plan, "Pruebas", resultado).
  - **Sin cambios:** `useWeekListAddition`, su botón y la Etapa 4.
- [x] 2.5 (2026-11-15) `tests/Modal.page.ts` y `tests/Modal.test.tsx`: casos 1 a 6, 9, 13 y 15 del plan, más Tab con el foco fuera del diálogo (11 tests). Los casos 16 y 17 pasan a 2.4.

## Etapa 3 — Devolver el foco

- [x] 3.1 (2026-11-15) Devolución en la limpieza del efecto de apertura (`returnFocus`), con las dos condiciones de la regla 9 (D2).
- [x] 3.2 (2026-11-15) Casos 7, 8, 10, 11, 12, 14 y 19 del plan, y la parte del caso 18 que no depende de D3: la pantalla enfoca el título en la misma actualización, como SCRUM-61 (8 tests).
  - Una mutación temporal (quitar la condición de la regla 9) hizo fallar el caso 11, así que el test protege esa condición.
  - La parte de D3 del caso 18 pasa a 2.4.
- [x] 3.3 Regresión:
  - [x] `npm test` completo (2026-11-15): 154 archivos y 1622 tests pasan.
  - [x] El test de SCRUM-61 ("keeps the focus stable") pasa **sin cambios**. Ningún test de otra feature tuvo que cambiar, y los del planificador también pasan sin cambios.
  - [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan (2026-11-15).
  - [x] **Duda 1 confirmada en Chrome** (verificación manual de la dueña de la historia, 2026-11-15), en `/household`, diálogo «¿Eliminar a este integrante?». No se registró la versión del navegador.
    - **CA-01:** al abrir, el foco pasa a «Cancelar».
    - **CA-02:** Tab y Shift+Tab mantienen el foco dentro del diálogo.
    - **CA-03:** al cancelar, el foco vuelve al botón «Eliminar integrante {nombre}» que lo abrió.
    - **Escape:** cierra y devuelve el foco a ese botón.
    - **CA-04:** el clic fuera cierra el diálogo y devuelve el foco.
    - **SCRUM-61:** al eliminar, el foco queda en `h2#household-members-title` («Integrantes de la familia»), y Tab lo lleva al campo «Buscar por nombre».

    Cubre la parte de `TC-SCRUM-142-02` que no depende de D3. El clic fuera mientras elimina (D3) y las demás pantallas siguen en 5.4.

## Etapa 4 — Planificador (D4 y duda 7, opción B)

- [x] 4.1 (2026-11-15) `useMealSlotDialog` ya no tiene `openerRef`, `wasOpenRef` ni el efecto de foco. `onSlotOpen(target)` dejó de recibir el botón, también en `MealSlotDialogViewModel` (`models/meal-plan.interfaces.ts`).
  - **Sin tocar (D4, lectura (ii)):** `useWeekListAddition`, `AddWeekToListButton` y su comportamiento. Conservan su devolución de foco.
- [x] 4.2 (2026-11-15) Opción B:
  - `MealSlot.tsx` hace `event.currentTarget.focus()` antes de `onOpen()`;
  - `MealPlannerDay.tsx` dejó de pasar el botón;
  - `MealSlotProps.onOpen` es `() => void`.
- [x] 4.3 (2026-11-15) Tests:
  - **Quitados:** los 4 tests de foco de `useMealSlotDialog.test.ts`, con una nota de dónde quedó la cobertura.
  - **Sin tocar:** `useWeekListAddition.test.ts` y `MealPlannerWeekList.test.tsx`.
  - **Nuevos en `MealPlannerAssign.test.tsx`:**
    - el foco vuelve al mismo espacio después de guardar;
    - el foco vuelve al mismo espacio después de quitar;
    - el foco vuelve al espacio aunque el clic no lo haya enfocado, como en Safari (con `fireEvent.click`).

    Para el último, `MealPlanner.page.ts` suma `openSlotWithoutFocusing`. Una mutación temporal (quitar el `focus()` de `MealSlot`) hace fallar el test de Safari.
- [x] 4.4 (2026-11-15) Regresión: pasan los 306 tests de `features/meal-planner` y `components/ui/modal`.
  - El caso de foco que ya tenía `MealPlannerAssign.test.tsx` no cambió.
  - `MealPlannerWeekList.test.tsx` y `useWeekListAddition.test.ts` pasan sin ningún cambio.
  - La duda 8 está resuelta (1.4).
- [x] 4.5 (2026-11-15) Nota en `features/meal-planner/specs/SPEC.md` §9: el foco de vuelta del espacio lo hace el `Modal` compartido, el espacio se enfoca antes de abrir y es el mismo nodo después de guardar o quitar. La §16.8 ("Agregar semana") no cambia.

## Etapa 5 — Documentación, verificación y cierre

- [x] 5.1 (2026-11-15) La línea del `Modal` en `components/ui/specs/SPEC.md` describe el manejo del foco y enlaza a esta spec. El comentario de `useModalViewModel` está actualizado.
  - **Por el code-reviewer:** las funciones de foco se movieron del hook a `components/ui/modal/utils/modalFocus.ts`. El hook quedó solo con el efecto.
- [x] 5.2 (2026-11-15, después de las correcciones de 5.6) pasan:
  - `npm test`: 154 archivos y 1628 tests;
  - `npx tsc --noEmit`, `npm run lint` y `npm run build`;
  - `git diff --check`.
- [ ] 5.3 E2E:
  - [x] **Nuevo** `e2e/features/modal/modal-focus.spec.ts` (E2E-MODAL-01 a 04, [E2E.md](E2E.md)): 8 de 8 en `chromium` y `mobile-chrome`, también después de las correcciones.
  - [ ] **Existentes** con diálogos (`date-lists`, `meal-planner`, `shopping-list`).
    - **Primera corrida, con el código de las etapas 2 a 4:** pasaron los 23 de `chromium` y fallaron 11 de 23 en `mobile-chrome`.
    - **Corridas siguientes:** fallaron también en `chromium` (15 de 23).
    - **Por qué se clasifica como entorno** (playwright-e2e, healing):
      - en todas las capturas la página muestra errores de carga del backend compartido («No pudimos cargar tus sublistas», «No se pudo cargar tu lista»), antes de abrir cualquier diálogo;
      - con el mismo código ya habían pasado en `chromium`.
    - **Tercera corrida (2026-11-15, después de las pruebas manuales):** 14 de 46 pasan.
      - En 22 de los 32 fallos, la página muestra el error de carga del backend.
      - Los otros 10 son del planificador: los espacios no se habilitan porque el plan no llega a cargar (la grilla queda deshabilitada sin plan).
      - Ninguno llega a abrir un diálogo.
    - **Causa sin confirmar:** la comprobación del límite de sesiones anónimas de Supabase no se pudo hacer, porque el permiso fue denegado. Hay que volver a correrlos cuando el backend responda.
- [x] 5.4 (2026-11-15) Verificación manual con teclado, `TC-SCRUM-142-01` a `17` (plan, reescritos con la plantilla de QA en 5.6). **Los 17 pasaron.**
  - **TC-01:** automatizado (E2E-MODAL-01 a 04).
  - **TC-02 y TC-14:** validados en la 3.3; no se repitieron.
  - **TC-03 a TC-13 y TC-15 a TC-17:** pasaron en la verificación manual de la dueña de la historia, incluido TC-17 en Safari. La duda 3 ya estaba resuelta (1.1) y no se repitió.
  - **Ambiente:** no se registró el navegador, la versión ni el dispositivo de esta ejecución.
- [x] 5.5 (2026-11-15) SPEC §13 marcada solo con lo validado: CA-01 a CA-06 y los casos de cada flujo. Queda abierta una sola casilla, la de los E2E existentes (5.3).
- [x] 5.6 (2026-11-15) Revisores:
  - **`security-reviewer`:** sin hallazgos.
  - **`code-reviewer`:** sin bloqueantes.
    - Corregido: las funciones de foco pasaron a `utils/modalFocus.ts`.
    - Faltaba el `E2E.md`: ya estaba creado.
    - El `ESCAPE_KEY` de Finanzas queda fuera de alcance (SPEC §14).
  - **`qa-checker`:** corregidos en `Modal.test.tsx`:
    - los excluidos ahora están en los extremos del ciclo;
    - hay un test para un control que desaparece y otro para uno que aparece;
    - la vuelta del foco va al elemento que lo tenía y no al primero;
    - se espera la vuelta de D3 antes de comprobar;
    - los métodos del Page Object que dicen si el `mousedown` se canceló tienen nombres claros.

    Las mutaciones confirman los tests nuevos. Los casos manuales se reescribieron con precondición, foco esperado y estado, con dos casos nuevos: un botón que se deshabilita mientras guarda (TC-15) y un toque fuera en mobile (TC-16).
- [ ] 5.7 Descripción del PR preparada con la evidencia (5.4 incluida). Falta:
  - volver a correr los E2E existentes (5.3);
  - los commits y el push;
  - pegar la descripción en el PR;
  - pasar a `waiting qa` y mover Jira, después de confirmar el label (0.6).

## Fuera de esta historia

- [ ] Fondo inerte y bloqueo de scroll (SPEC §14).
- [ ] Unificar `ESCAPE_KEY` en Finanzas (`InlineTotalEditor`, `SpendingBudget`) con `KEYBOARD_KEY.ESCAPE`, en un ticket aparte.
- [ ] Notas antiguas de "el `Modal` no atrapa el foco" en los planes de household, recetas y el planificador: son registro de esas historias, no se reescriben.

Comportamiento conocido, no es trabajo pendiente: en "Agregar semana a la lista", en Safari con mouse, el foco no vuelve al botón al cerrar (opción A, SPEC §14).
