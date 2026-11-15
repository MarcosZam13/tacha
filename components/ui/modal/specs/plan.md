# Plan: Modal — foco al abrir, atrapado y devuelto al cerrar (SCRUM-142)

El qué está en [SPEC.md](SPEC.md), con los criterios de Jira como CA-01 a CA-06 (§13) y las decisiones D1 a D4 tomadas el 2026-11-15 (§5). La duda 7 está resuelta (opción B). Las demás dudas técnicas de abajo se comprueban en la Etapa 1 de tasks.

## Lo que hay hoy

- **`Modal.tsx`:**
  - devuelve `null` si `!isOpen`; si no, dibuja un fondo `fixed` con `onClick={onClose}` y un `div role="dialog" aria-modal="true" aria-label={title}`;
  - ese `div` corta la propagación del clic y no es enfocable;
  - el título es un `<h2>` sin `id` ni `tabIndex`.
- **`useModalViewModel.ts`:** un `useEffect` con `[isOpen, onClose]` que, abierto, agrega un `keydown` en `document` y llama a `onClose` con Escape. No devuelve nada.
- **Tests:** el `Modal` no tiene. Lo prueban de forma indirecta los tests de las features, con sus Page Objects (`HouseholdLeave.page.ts`, `HouseholdRemoveMember.page.ts`, `MealPlanner.page.ts`, `RecipeDeleteDialog.page.ts`, `CreateProductForm.page.ts` y `SignOutButton.page.ts`).
- **Foco que ya se maneja fuera del `Modal`:**
  - **SCRUM-61:** `titleFocusKey` en `useHouseholdViewModel` y `HouseholdMembersSection`. **Se queda.**
  - **El planificador:** `openerRef` y `wasOpenRef` en `useMealSlotDialog` y `useWeekListAddition`, con un efecto que enfoca `openerRef` al pasar a cerrado.
    - **`useMealSlotDialog`: se quita (D4).** `onSlotOpen(target, opener?)` recibe el botón tocado desde `MealPlannerDay` ("en Safari un clic no lo enfoca y `activeElement` sería el body") y, si no lo recibe, usa `document.activeElement`.
    - **`useWeekListAddition`: se queda sin cambios (D4, fuera de alcance).** Usa solo `document.activeElement`.
    - **Tests de foco de los hooks:**
      - `useMealSlotDialog.test.ts`: "gives the focus back to the button that opened it", "…even when the click did not focus it", "…after saving" y "…after removing";
      - `useWeekListAddition.test.ts`: "gives the focus back to the button that opened it".
    - **Tests de foco de pantalla:**
      - `MealPlannerAssign.test.tsx`: "closes without saving and gives the focus back to the slot that opened it";
      - `MealPlannerWeekList.test.tsx`: "gives the focus back to the button when it closes".
- **Herramientas:** Vitest 4, jsdom 29, Testing Library y `user-event` 14. El entorno por defecto es Node; los tests de componente piden jsdom.

## Archivos

```
constants/ui.constants.ts                              KEYBOARD_KEY (ESCAPE, TAB) y FOCUSABLE_SELECTOR
components/ui/modal/
  hooks/useModalViewModel.ts                           Foco inicial, Tab circular, vuelta del foco (D3), Escape y devolución
  hooks/getFocusableElements.ts                        Pura: enfocables de un contenedor (regla 6)
  Modal.tsx                                            Ref, onKeyDown, onBlur (focusout) y tabIndex={-1} en el diálogo; onMouseDown en el fondo
  models/ModalProps.interface.ts                       Sin cambios (D2)
  tests/Modal.page.ts                                  Page Object
  tests/Modal.test.tsx                                 Casos de "Pruebas"
  tests/getFocusableElements.test.ts                   Selector y exclusiones
components/ui/specs/SPEC.md                            La línea del Modal enlaza a esta spec
features/meal-planner/hooks/useMealSlotDialog.ts       Sin openerRef, wasOpenRef ni el efecto de foco (D4)
features/meal-planner/components/MealSlot.tsx          Enfoca su botón antes de abrir (duda 7, opción B)
features/meal-planner/components/MealPlannerDay.tsx    Deja de pasar el botón tocado a onSlotOpen
features/meal-planner/components/models/MealSlotProps.interface.ts  onOpen sin el botón, si deja de hacer falta
features/meal-planner/tests/useMealSlotDialog.test.ts  Sin los 4 tests de foco (pasan al Modal y a pantalla)
features/meal-planner/specs/SPEC.md                    Nota en §9: el foco de vuelta del espacio lo hace el Modal (SCRUM-142)
```

**No se tocan (D4):** `features/meal-planner/hooks/useWeekListAddition.ts`, `features/meal-planner/components/AddWeekToListButton.tsx`, `features/meal-planner/tests/useWeekListAddition.test.ts` y `features/meal-planner/tests/MealPlannerWeekList.test.tsx`.

`getFocusableElements` va en `hooks/` o en un `utils/` dentro de `components/ui/modal/`; se elige según project-structure al crearlo. No es un hook. El comentario del hook ("No atrapa el foco todavía") se actualiza.

## Diseño propuesto

1. **Al abrir** (regla 5, D1):
   - Un efecto que depende solo de `isOpen` guarda `document.activeElement` (regla 8).
   - Después enfoca `getFocusableElements(dialog)[0]` o, si no hay, el diálogo.
   - `onClose` se lee de un ref actualizado en cada render. Así una función nueva no vuelve a ejecutar el efecto del foco, que es el problema que tendría juntarlo con el `useEffect` de hoy, que depende de `onClose`.
2. **Tab** (regla 7): `onKeyDown` en el diálogo. Con `Tab` o `Shift+Tab` calcula los enfocables en ese momento:
   - si el foco está en el último (o en el primero, con Shift), `preventDefault` y lo mueve al otro extremo;
   - si no hay enfocables, `preventDefault` y lo deja en el diálogo.

   Si el foco ya salió y el navegador no avisó (duda 4), un `keydown` de Tab en `document` lo trae al primero.
3. **Vuelta inmediata (D3, regla 11).** Dos piezas:
   - **Fondo:** `onMouseDown` del fondo llama a `preventDefault`. En desktop, el clic en el fondo, que no es enfocable, no le quita el foco al diálogo, y el `click`, y con él `onClose`, siguen igual (CA-04). Si el padre cierra, aplica la devolución; si no, el foco nunca salió.
   - **Salida del diálogo:** un oyente `focusout` en el diálogo (`onBlur` de React, que burbujea).
     - Si `relatedTarget` es `null` o está fuera del diálogo, se agenda la vuelta con una microtarea.
     - La vuelta se hace solo si el diálogo sigue `isConnected` y abierto (un ref de estado).
     - Destino: el elemento que perdió el foco, si sigue conectado y habilitado; si no, el primer enfocable; si no hay, el diálogo.
     - Cubre toques en mobile (duda 3) y, si el navegador avisa, botones que se deshabilitan (duda 4).
     - **No actúa al cerrar:** el diálogo ya no está conectado, así que no compite con la devolución ni con SCRUM-61 (SPEC §15).
4. **Escape** (regla 10): igual que hoy, en `document`, leyendo `onClose` del ref.
5. **Devolver** (regla 9, D2): en la limpieza del efecto de apertura, que corre al pasar a cerrado y al desmontarse:
   - si el elemento guardado `isConnected`;
   - y `document.activeElement` es `body`, `null` o está dentro del diálogo;

   entonces se llama a `focus()`.

   **Por qué en la limpieza:** corre antes que los efectos nuevos del mismo commit, como el foco al título de SCRUM-61. Aun así, la condición sobre `activeElement` es lo que protege SCRUM-61, no el orden.
6. **Diálogo enfocable:** `tabIndex={-1}` en el `div role="dialog"`, con `outline-none`. Entra en el foco solo por código, nunca por Tab.
7. **Planificador (D4):**
   - **Se borran** `openerRef`, `wasOpenRef` y el efecto de foco de `useMealSlotDialog`.
   - **Lo que no cambia:** el resto de su lógica (abrir, guardar, quitar, el bloqueo mientras guarda).
   - **El `Modal` devuelve el foco** al espacio que estaba enfocado al abrir. Tiene que ser el mismo nodo del DOM después de guardar o quitar (duda 8).
   - **`useWeekListAddition` no cambia.** Al cerrar "Agregar semana a la lista" el foco se devuelve dos veces, al mismo botón:
     - primero el `Modal`, en la limpieza de su efecto;
     - después el efecto del hook.

     El hook guarda `document.activeElement` igual que el `Modal`, así que los dos apuntan al mismo elemento. Si la pantalla moviera el foco a propósito, el hook sí lo pisaría, porque no tiene la condición de la regla 9; es su comportamiento de hoy y queda fuera de alcance.
   - **Safari (duda 7, opción B):**
     - **En `MealSlot`:** el `onClick` del espacio hace `event.currentTarget.focus()` antes de llamar a `onOpen`. Así, cuando el `Modal` abre y guarda `document.activeElement` (regla 8), el elemento es el espacio aunque el clic no lo haya enfocado.
     - **En el hook:** `onSlotOpen` deja de recibir el botón y `useMealSlotDialog` ya no lo guarda.
     - **Lo que no se agrega:** ninguna prop al `Modal` (D2) ni devolución en `useMealSlotDialog` (D4).

## Casos y cómo los cubre

| Caso | Qué pasa | Regla |
|---|---|---|
| Escape, y el padre cierra | `onClose` → `isOpen=false` → limpieza → devolución | 9, 10 |
| Escape mientras elimina (Household) | `onClose` no cierra; el foco sigue adentro | 10 |
| Clic fuera, y el padre cierra | Igual que Escape | 9, 11 |
| Clic fuera que no cierra (desktop) | `preventDefault` en `mousedown`: el foco no sale | 11, D3 |
| Toque fuera que no cierra (mobile) | Si el foco sale, `focusout` lo devuelve de inmediato | 11, D3 |
| Sin enfocables (términos del registro) | Foco en el diálogo; Tab no sale | 7, D1 |
| Botones deshabilitados mientras guarda | Salen del ciclo; si el foco sale y el navegador avisa, vuelve; si no, lo trae el siguiente Tab | 6, 11 |
| Contenido que aparece después (opciones del planificador, errores) | Se cuenta en el siguiente Tab | 6 |
| SCRUM-61: eliminar | La pantalla enfoca el título; la devolución no lo pisa; D3 no actúa porque el diálogo ya no está | 9, 11 |
| SCRUM-61: cancelar | Vuelve a "Eliminar integrante {nombre}" | 9 |
| Salir de la familia | "Salir" desaparece; no hay a dónde devolver y el foco queda en `body`, como hoy | 9 |
| Elegir súper e iniciar compra | Si "Iniciar compra" desaparece, no se fuerza | 9 |
| Cerrar sesión confirmado | Navega a `/login`; el `Modal` se desmonta; la limpieza quita los oyentes | 9 |
| Planificador, espacio: cancelar, guardar, quitar | Vuelve al espacio; lo hace solo el `Modal` | 9, D4 |
| Planificador, "Agregar semana a la lista" | Vuelve al botón; lo hacen el `Modal` y el hook, al mismo elemento | 9, D4 |
| Planificador en Safari con mouse | El espacio se enfoca antes de abrir; el `Modal` lo guarda y vuelve ahí | 8, D4, duda 7 (B) |
| Detalle de un producto de la lista | El título cambia con el producto; el foco no se mueve otra vez | 5 |
| Reabrir desde otro botón | Se guarda el nuevo | 12 |

## Dudas a resolver al implementar (no inventadas)

Ninguna bloquea el PR de planificación. Cada una bloquea solo la tarea que indica:

| Duda | Tipo | Cuándo | Bloquea |
|---|---|---|---|
| 1 | Comprobación con el código nuevo | Etapa 3 | El cierre de la 3.3: no se puede observar antes de que exista la devolución |
| 2 | Comprobación en jsdom | Etapa 1 (1.1) | La 3.1 (condición de la regla 9) |
| 3 | **Verificación manual pendiente** | Etapa 1 (1.1) | La 2.4 (D3) |
| 4 | Comprobación en el navegador | Etapa 1 (1.1) | Nada: define si el caso lo cubre la vuelta (D3) o el siguiente Tab, y se anota |
| 5 | Revisión del código | Etapa 1 (1.2) | La 2.2 (selector de enfocables) |
| 6 | Revisión de los E2E | Etapa 1 (1.3) | Nada antes de la 5.3; avisa qué E2E pueden fallar |
| 7 | Resuelta (opción B) | — | — |
| 8 | **Verificación manual pendiente** | Etapa 1 (1.4) | El cierre de la Etapa 4 (4.4) |

1. **Orden real de los efectos en SCRUM-61.** Hay que confirmar con el test existente y en Chrome que el título queda enfocado al final. El análisis del orden está en SPEC §15. Hoy el `Modal` no devuelve el foco, así que esto solo se puede comprobar después de la 3.1.
2. **`activeElement` al quitar el nodo enfocado.** Al cerrar, el `Modal` devuelve `null` y el botón enfocado sale del DOM.
   - **En los navegadores**, el foco pasa a `body`.
   - **En jsdom 29 no está verificado:** puede quedar apuntando al nodo quitado. Si pasa, la condición "dentro del diálogo" tiene que aceptar también un `activeElement` que no `isConnected`.
3. **Clic y toque en el fondo** (D3). Hay que comprobar en Chrome desktop y en mobile:
   - que `preventDefault` en `mousedown` conserva el foco y no cancela el `click`;
   - si un toque en mobile saca el foco, y si `focusout` llega con `relatedTarget` en `null`.
4. **Botón deshabilitado con foco.** Hay que comprobar qué pasa en Chrome cuando el botón con foco pasa a `disabled`: si dispara `focusout` y adónde va el foco. Es lo que pasa en las confirmaciones mientras guardan. Si dispara, la vuelta de D3 lo cubre; si no, el siguiente Tab.
5. **Elementos ocultos con CSS.** Un elemento con la clase `hidden` de Tailwind (`display: none`) no lleva el atributo `[hidden]`. La regla 6 lo contaría como enfocable, aunque el navegador no lo enfoca. Hay que revisar si algún diálogo de SPEC §11 tiene controles ocultos así. Si hay, se decide entre excluirlo por otro medio o dejarlo documentado.
6. **E2E existentes.** `date-lists`, `meal-planner` y `shopping-list` abren diálogos. Hay que comprobar que ninguno depende de que el foco quede fuera del diálogo, por ejemplo con `keyboard.press` sin `click` previo.
7. **Safari y el botón que abre el diálogo (D4). Resuelta: opción B** (la dueña de la historia, 2026-11-15).
   - **El problema:** en Safari, un clic no enfoca el botón. El `Modal`, sin prop nueva (D2), solo conoce `document.activeElement`, que en ese caso es `body`.
   - **La solución:** el espacio se enfoca a sí mismo antes de abrir ("Diseño", punto 7).
   - **Descartadas:**
     - **(a)** aceptar la pérdida;
     - **(c)** una prop del `Modal`.
   - **"Agregar semana a la lista": opción A, fuera de alcance** (la dueña de la historia, 2026-11-15).
     - Su botón (`AddWeekToListButton`) no se enfoca antes de abrir.
     - En Safari con mouse el foco no vuelve al cerrar. Es el comportamiento conocido de hoy, no una regresión ni trabajo pendiente.
     - Su hook `useWeekListAddition` tampoco se toca (D4, lectura (ii)).
8. **Mismo nodo después de guardar o quitar (D4).** Al guardar o quitar, el espacio muestra su nuevo estado. Hay que comprobar que el botón sigue siendo el mismo nodo (misma `key`) y no uno nuevo.
   - Si es uno nuevo, la regla 9 no devuelve el foco (`isConnected` es `false`), y los hooks de hoy tampoco lo harían.
   - Los tests "…after saving" y "…after removing" usan un botón suelto en `document.body`, así que no lo prueban.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| D1: primer enfocable o el diálogo | Siempre el diálogo | Decidida; en las confirmaciones cae en "Cancelar", que es lo seguro, y en los formularios en el primer campo |
| D2: devolución automática con la regla 9, sin prop | Prop `shouldReturnFocus` / `returnFocusRef` | Decidida; SCRUM-61 ya mueve el foco a propósito (CA-03) y la regla lo respeta sin que cada uso tenga que acordarse |
| D3: vuelta inmediata (`mousedown` + `focusout`) | Esperar al siguiente Tab | Decidida; el foco nunca queda en el fondo mientras el diálogo sigue abierto |
| D4 (ii): en el diálogo de un espacio, el `Modal` es el único que devuelve el foco; `useWeekListAddition` no se toca | (i) quitar también la devolución de `useWeekListAddition` | Decidida; los espacios quedan con una sola fuente, y "Agregar semana a la lista" queda fuera de alcance, sin cambios, aunque conserve dos fuentes que apuntan al mismo botón |
| Duda 7 (B): el espacio se enfoca antes de abrir | (a) aceptar la pérdida en Safari; (c) prop del `Modal` | Decidida; el `Modal` guarda el elemento correcto sin cambiar su API (D2) ni volver a la devolución de `useMealSlotDialog` (D4) |
| Lógica propia | Librería `focus-trap` o `<dialog>` nativo | Jira los deja fuera de alcance ("se puede proponer, no se exige"); AGENTS.md pide no sumar librerías para algo de pocas líneas |
| Enfocables por atributos | Filtrar por visibilidad (`offsetWidth`) | jsdom no tiene layout: los tests darían otro resultado que el navegador |
| Calcular enfocables en cada Tab | Una vez al abrir | El contenido cambia con el diálogo abierto (carga, errores, botones deshabilitados) |
| Devolver en la limpieza del efecto | En un efecto al pasar a cerrado | La limpieza corre antes que los efectos de la pantalla, y cubre también el desmontaje |
| Vuelta de D3 solo con el diálogo conectado y abierto | Siempre que el foco salga | Al cerrar, el foco sale del diálogo; volver ahí pisaría la devolución y SCRUM-61 |
| `onClose` en un ref | Dependencia del efecto | Muchos usos pasan una función nueva en cada render, y el foco saltaría al primer campo mientras se escribe |

## Pruebas

**Unitarias** (`components/ui/modal/tests/`, `// @vitest-environment jsdom`, Page Object `Modal.page.ts`, con `user-event` para Tab, Shift+Tab, Escape y clics). Un arnés de test con un botón "Abrir" y estado `isOpen`, porque el `Modal` es controlado:

1. Al abrir, el foco va al primer enfocable (D1).
2. Sin enfocables, el foco va al diálogo, y Tab y Shift+Tab lo dejan ahí (D1).
3. Tab desde el último va al primero; Shift+Tab desde el primero va al último.
4. Con un solo enfocable, Tab y Shift+Tab no salen.
5. Se saltan `disabled`, `tabindex="-1"` y lo que está dentro de `[hidden]`.
6. Un botón que se deshabilita con el diálogo abierto sale del ciclo; uno que aparece, entra.
7. Escape llama a `onClose` una vez; con el padre que cierra, el foco vuelve a "Abrir" (D2).
8. Clic en el fondo llama a `onClose`; con el padre que cierra, el foco vuelve a "Abrir" (D2).
9. `onClose` que no cierra, con Escape: el diálogo sigue abierto y el foco sigue adentro.
10. Si el botón "Abrir" se quita antes de cerrar, cerrar no da error y no fuerza el foco.
11. Si al cerrar el foco ya está en otro elemento fuera del diálogo, no se pisa (D2, simula SCRUM-61).
12. Desmontar el `Modal` abierto quita los oyentes (Escape ya no llama a `onClose`) y devuelve el foco si se puede.
13. Rerender con otro `onClose` y otro `title`: el foco no se mueve.
14. Reabrir desde un segundo botón devuelve el foco a ese.
15. Clic dentro del diálogo no llama a `onClose`, como hoy.
16. **D3, clic fuera que no cierra:**
    - `onClose` se llama;
    - el diálogo sigue abierto;
    - el foco queda en el mismo elemento del diálogo, sin pulsar Tab;
    - el `mousedown` del fondo está cancelado (`defaultPrevented`).
17. **D3, foco que sale del diálogo abierto** (`focus()` sobre un botón de fuera, o `focusout` con `relatedTarget` `null`):
    - vuelve de inmediato al elemento que lo tenía;
    - si ese elemento se deshabilitó, vuelve al primer enfocable;
    - sin enfocables, vuelve al diálogo.
18. **D3 no compite con el cierre:** al cerrar desde un botón del contenido, si el padre mueve el foco a otro elemento en el mismo cambio (como SCRUM-61), el foco termina en ese elemento. Ni la vuelta ni la devolución lo pisan.
19. **D4, cierre desde el contenido:**
    - el padre cierra después de una acción asíncrona, como guardar;
    - el foco vuelve al botón que abrió el diálogo, si sigue conectado.

`getFocusableElements.test.ts`: el selector, las exclusiones y el orden del documento.

Cobertura de los criterios y decisiones (CA-05):

| Criterio o decisión | Casos |
|---|---|
| CA-01 / D1 | 1 y 2 |
| CA-02 | 2 a 6 |
| CA-03 / D2 | 7, 8, 10, 11, 12, 14, 18 y 19, más el test de SCRUM-61 |
| CA-04 / D3 | 7, 8, 9, 15, 16 y 17 |
| D4 y duda 7 (B) | 19, más las pruebas de pantalla de los espacios en `MealPlannerAssign.test.tsx` (incluida la de Safari) |
| D4, "Agregar semana" sin cambios | `useWeekListAddition.test.ts` y `MealPlannerWeekList.test.tsx`, sin cambios |

**Regresión** (sin cambiarlos, salvo lo que exige D4 o un motivo justificado, que se anota en tasks):

- **`features/household/tests/HouseholdRemoveMember.test.tsx`:** foco en el título después de eliminar y Escape mientras elimina. Sin cambios.
- **Pruebas de pantalla del planificador:**
  - **`MealPlannerAssign.test.tsx`:** su caso de foco no cambia y ahora prueba la devolución del `Modal` real. Recibe las pruebas nuevas de abajo.
  - **`MealPlannerWeekList.test.tsx`:** sin ningún cambio. Lo cubren el `Modal` y el hook a la vez.
- **Tests de foco de los hooks:**
  - **se quitan (D4):** los 4 de `useMealSlotDialog.test.ts`;
  - **se quedan sin cambios (D4):** `useWeekListAddition.test.ts`, incluido "gives the focus back to the button that opened it";
  - **"…after saving" y "…after removing":** se pasan a `MealPlannerAssign.test.tsx`, como pruebas de pantalla;
  - **"…even when the click did not focus it":** se reemplaza por una prueba de pantalla en `MealPlannerAssign.test.tsx` (opción B).
    - Abrir un espacio con un clic que no mueve el foco (`fireEvent.click`, como Safari; `user-event` sí lo mueve).
    - Comprobar que el foco queda en el espacio antes de que el diálogo lo mueva adentro.
    - Comprobar que, al cancelar, el foco vuelve al espacio.
- **Otros tests:** los de `HouseholdLeave`, `RecipeDeleteDialog`, `CreateProductForm` y `SignOutButton`.
- **La suite completa** (`npm test`).

**E2E:** no se agregan escenarios nuevos (SPEC §14). Se corren los existentes que abren diálogos para detectar cambios por el foco inicial y por D3:

```
npx playwright test e2e/features/date-lists e2e/features/meal-planner e2e/features/shopping-list
```

## Verificación manual con teclado

Cubre CA-06: cada pantalla que usa `Modal` se revisa una vez con el teclado después del cambio. Chrome desktop, solo teclado. Los casos marcados "mobile" se repiten en un Pixel o en el emulador, con teclado externo cuando se pueda.

`TC-SCRUM-142-02` empieza por los pasos para reproducirlo de Jira (SPEC §1):

1. Enter sobre "Eliminar integrante".
2. El foco tiene que entrar al diálogo.
3. Tab no puede llegar a "Copiar enlace", "Generar nuevo enlace" ni "Salir de la familia".

En cada diálogo se verifica:

- **(a)** al abrir, el foco está en el primer enfocable o en el diálogo (D1);
- **(b)** Tab y Shift+Tab dan la vuelta sin salir;
- **(c)** Escape cierra y el foco vuelve al botón (D2);
- **(d)** clic fuera cierra y el foco vuelve (D2);
- **(e)** el caso propio de la tabla.

| ID | Pantalla y diálogo | Cómo se abre | Caso propio (e) |
|---|---|---|---|
| TC-SCRUM-142-01 | `/ui-kit`, demo | "Abrir modal" | Ciclo entre "Cancelar" y "Confirmar" |
| TC-SCRUM-142-02 | `/household`, eliminar integrante (SCRUM-61) | "Eliminar integrante {nombre}" | Ver abajo |
| TC-SCRUM-142-03 | `/household`, salir de la familia | "Salir" | Escribir en el campo no mueve el foco; al salir, el botón desaparece y no hay error |
| TC-SCRUM-142-04 | `/fechas`, nueva lista | "Nueva lista" | Crear o cancelar devuelve el foco al botón |
| TC-SCRUM-142-05 | `/recetas/planificador`, espacio | Un espacio de comida | Ver abajo |
| TC-SCRUM-142-06 | `/recetas/planificador`, agregar semana | "Agregar semana a la lista" | Con teclado, al cerrar vuelve al botón. En Safari con mouse no vuelve: comportamiento conocido, fuera de alcance (opción A); no es un fallo de esta historia |
| TC-SCRUM-142-07 | `/recetas`, eliminar receta | Acción de eliminar de una receta | Si la receta desaparece, no hay error ni foco forzado |
| TC-SCRUM-142-08 | `/recetas`, volver a agregar | Agregar una receta ya agregada | Cancelar y confirmar |
| TC-SCRUM-142-09 | `/registro`, términos | Enlace de términos | Sin enfocables o con pocos: el foco queda en el diálogo y no sale (D1) |
| TC-SCRUM-142-10 | `/lista`, detalle de un producto | Tocar una fila (mobile también) | El foco vuelve a la fila |
| TC-SCRUM-142-11 | `/lista`, elegir supermercado | "Iniciar compra" | Elegir un súper: si el botón desaparece, no hay error |
| TC-SCRUM-142-12 | `/catalogo` y `/catalogo/mis-productos`, crear producto | "Crear producto" (también desde el vacío del catálogo) | Escribir en campos y `select` no mueve el foco; Tab recorre todo el formulario |
| TC-SCRUM-142-13 | Sidebar (desktop) y `/perfil` (mobile), cerrar sesión con cambios sin guardar | "Cerrar sesión" con un borrador | Cancelar vuelve al botón; confirmar navega a `/login` sin errores en la consola |

Casos propios largos:

- **TC-SCRUM-142-02 (eliminar integrante):**
  - Eliminar deja el foco en el título "Integrantes".
  - Escape mientras elimina no cierra.
  - Un clic o toque fuera mientras elimina no cierra, y el foco sigue en el diálogo sin pulsar Tab (D3).
  - Cancelar vuelve al botón de la fila.
- **TC-SCRUM-142-05 (espacio del planificador):**
  - Cuando cargan las opciones, entran en el ciclo.
  - Cancelar, guardar y quitar vuelven al espacio, ahora por el `Modal` (D4).
  - Repetir con mouse en Safari, si hay uno disponible: el foco vuelve al espacio (duda 7, opción B).
  - Después de guardar y de quitar, comprobar que vuelve al mismo espacio (duda 8, pendiente).

Capturas, si se piden, sin correos.

## Riesgos

- **Pisar el foco elegido por una pantalla:** SCRUM-61 hoy, y cualquiera que se agregue después. Lo mitigan la regla 9, la condición de conexión de D3, el test existente y los casos 11 y 18.
- **Foco que salta mientras se escribe** si el efecto depende de `onClose`. Lo mitigan el ref y el caso 13.
- **La vuelta de D3 cancela un clic necesario:** `preventDefault` en `mousedown` no cancela el `click`, pero hay que comprobarlo en mobile (duda 3).
- **Tests y navegador que no coinciden:** la detección de enfocables, `activeElement` y `focusout` en jsdom (dudas 2, 4 y 5). Lo mitiga la verificación manual.
- **Safari con mouse en el planificador:** resuelto para los espacios con la opción B. En "Agregar semana a la lista" es un comportamiento conocido y fuera de alcance (opción A), no un riesgo de esta historia.
- **Dos fuentes del foco en "Agregar semana a la lista"** (D4, lectura (ii)): el `Modal` y `useWeekListAddition` devuelven el foco al mismo botón.
  - **Hoy no se pisan,** porque los dos guardan `document.activeElement`.
  - **Límite conocido:** el hook no tiene la condición de la regla 9. Si algún día esa pantalla moviera el foco a propósito al cerrar, el hook lo pisaría. Esa pantalla no lo hace hoy y queda fuera de alcance.
  - **Lo vigilan** `MealPlannerWeekList.test.tsx` y `TC-SCRUM-142-06`.
- **Enfocar el espacio antes de abrir** mueve el foco una vez más. Con teclado no cambia nada, porque el espacio ya tenía el foco.
- **Espacio que se vuelve a crear al guardar** (duda 8): la devolución no tendría a dónde volver.
- **E2E que dependen del foco** (duda 6).

## Gitflow y commits

- Rama `ticket/SCRUM-142-modal-focus-management` (actual). PR hacia `develop` con un solo label; la regla de una sola PR `in progress` por persona aplica (gitflow §3).
- Commits propuestos, uno por etapa de tasks. Cada uno lleva sus tests. La Etapa 1 no tiene commit.
  - Etapa 0: `docs(SCRUM-142): add modal focus management planning`
  - Etapa 2: `feat(SCRUM-142): move and trap the focus in the shared modal`
  - Etapa 3: `feat(SCRUM-142): return the focus when the modal closes`
  - Etapa 4: `refactor(SCRUM-142): let the shared modal return the meal slot focus`
  - Etapa 5: `docs(SCRUM-142): link the modal focus spec and record the verification`

## Para la defensa

Conceptos nuevos:

- el orden de las limpiezas y los efectos en un commit de React;
- `document.activeElement` e `isConnected`;
- `focusout` y `relatedTarget`;
- `preventDefault` en `mousedown` frente a `click`;
- `tabIndex={-1}` frente a `0`;
- por qué `onClose` va en un ref;
- por qué jsdom no sirve para medir visibilidad;
- por qué una sola fuente del foco en los espacios, y por qué "Agregar semana" conserva dos (D4).
