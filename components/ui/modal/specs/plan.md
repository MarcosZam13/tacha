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
  hooks/useModalViewModel.ts                           Foco inicial, Tab circular, Escape, devolución y vuelta del foco (D3): oyente focusout en el diálogo
  utils/getFocusableElements.ts                        Pura: enfocables de un contenedor (regla 6)
  utils/modalFocus.ts                                  Funciones de foco que usa el hook (inicial, Tab, vuelta, devolución)
  specs/E2E.md                                         Escenarios E2E-MODAL-01 a 04
  Modal.tsx                                            Ref y tabIndex={-1} en el diálogo; onMouseDown en el fondo (D3)
  models/ModalProps.interface.ts                       Sin cambios (D2)
  models/ModalViewModel.interface.ts                   Props y retorno del hook (dialogRef)
  tests/Modal.page.ts                                  Page Object
  tests/Modal.test.tsx                                 Casos de "Pruebas"
  tests/getFocusableElements.test.ts                   Selector y exclusiones
components/ui/specs/SPEC.md                            La línea del Modal enlaza a esta spec
e2e/features/modal/modal-focus.spec.ts                 E2E del Modal sobre /ui-kit (E2E-MODAL-01 a 04)
features/meal-planner/hooks/useMealSlotDialog.ts       Sin openerRef, wasOpenRef ni el efecto de foco (D4)
features/meal-planner/components/MealSlot.tsx          Enfoca su botón antes de abrir (duda 7, opción B)
features/meal-planner/components/MealPlannerDay.tsx    Deja de pasar el botón tocado a onSlotOpen
features/meal-planner/components/models/MealSlotProps.interface.ts  onOpen sin el botón, si deja de hacer falta
features/meal-planner/tests/useMealSlotDialog.test.ts  Sin los 4 tests de foco (pasan al Modal y a pantalla)
features/meal-planner/specs/SPEC.md                    Nota en §9: el foco de vuelta del espacio lo hace el Modal (SCRUM-142)
```

**No se tocan (D4):** `features/meal-planner/hooks/useWeekListAddition.ts`, `features/meal-planner/components/AddWeekToListButton.tsx`, `features/meal-planner/tests/useWeekListAddition.test.ts` y `features/meal-planner/tests/MealPlannerWeekList.test.tsx`.

`getFocusableElements` quedó en `components/ui/modal/utils/`, porque no es un hook (project-structure: lo de una pieza vive en su carpeta). El comentario del hook ("No atrapa el foco todavía") ya se actualizó.

## Diseño propuesto

1. **Al abrir** (regla 5, D1):
   - Un efecto que depende solo de `isOpen` guarda `document.activeElement` (regla 8).
   - Después enfoca `getFocusableElements(dialog)[0]` o, si no hay, el diálogo.
   - **`onClose` va con `useEffectEvent`** (implementado; antes el plan decía un ref). El oyente llama siempre al `onClose` más nuevo sin que el efecto vuelva a correr. Es el mismo resultado que el ref y el patrón que el repo ya usa en `features/shopping-list/hooks/useItemRemoval.ts`. Si el efecto dependiera de `onClose`, como el `useEffect` anterior, una función nueva en cada render volvería a mover el foco.
2. **Tab** (regla 7). Implementado con **un solo oyente `keydown` en `document`**, el mismo de Escape, en vez de un `onKeyDown` en el diálogo más otro en `document`. Un oyente cubre el foco dentro y fuera del diálogo, sin repetir la lógica. Con `Tab` o `Shift+Tab` calcula los enfocables en ese momento:
   - si el foco está en el último (o en el primero, con Shift), `preventDefault` y lo mueve al otro extremo;
   - si no hay enfocables, `preventDefault` y lo deja en el diálogo;
   - si el foco ya salió (está fuera del diálogo), `preventDefault` y lo trae al primero. Es un respaldo de D3: en Chromium el botón deshabilitado sí avisa (duda 4).
3. **Vuelta inmediata (D3, regla 11).** Implementada (2.4). Dos piezas:
   - **Fondo:** el `onMouseDown` del fondo llama a `preventDefault` solo si el `mousedown` es sobre el fondo mismo (`event.target === event.currentTarget`). Dentro del diálogo no cancela nada, así que los campos se siguen enfocando con un clic.
     - En desktop, el clic en el fondo, que no es enfocable, no le quita el foco al diálogo.
     - El `click`, y con él `onClose`, siguen igual (CA-04). Si el padre cierra, aplica la devolución; si no, el foco nunca salió.
     - La función la devuelve el ViewModel (`onOverlayMouseDown`).
   - **Salida del diálogo:** un oyente nativo `focusout` en el diálogo, que agrega y quita el mismo efecto de apertura. Reemplaza al `onBlur` de React que proponía el plan: así vive y se limpia junto con el resto del foco, sin una prop más.
     - Si `relatedTarget` está dentro del diálogo, no hace nada: el foco solo se mueve adentro.
     - Si no, agenda la vuelta con un **`setTimeout` de 0 ms** (`MODAL_FOCUS_RETURN_DELAY_MS`), en la próxima tarea. Antes, el plan proponía una microtarea. Es una precaución: la vuelta corre después de que React aplique un cierre del mismo evento, sin depender de cómo React ordena su trabajo. Una mutación con microtarea también pasó los tests en jsdom, así que **no está medido** que la microtarea falle.
     - **Al cerrar o desmontarse,** la limpieza del efecto cancela la vuelta pendiente (`clearTimeout`). Además, la vuelta solo actúa si el diálogo sigue `isConnected`, porque Chromium dispara `focusout` al quitar el diálogo, cuando todavía está conectado (duda 4, hallazgo adicional). Las dos son defensivas: enfocar un nodo ya quitado no hace nada, y la mutación C no rompió ningún test.
     - **Destino:** el elemento que perdió el foco, si sigue conectado y habilitado; si no, el primer enfocable; si no hay, el diálogo. Si el foco ya volvió adentro (por ejemplo, con Tab), no hace nada.
     - Cubre toques en mobile (duda 3) y botones que se deshabilitan: Chromium avisa con `focusout` (duda 4).
4. **Escape** (regla 10): igual que hoy, en `document`, con el `onClose` más nuevo vía `useEffectEvent`.
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

| Duda | Estado (Etapa 1, 2026-11-15) | Bloquea |
|---|---|---|
| 1 | Resuelta por análisis y confirmada en Chrome (3.3) | Nada |
| 2 | Resuelta | Nada (3.1 desbloqueada) |
| 3 | Resuelta por verificación manual | Nada (2.4 desbloqueada) |
| 4 | Resuelta | Nada |
| 5 | Resuelta | Nada (2.2 desbloqueada) |
| 6 | Resuelta | Nada |
| 7 | Resuelta (opción B) | — |
| 8 | Resuelta por análisis del código y por un test de pantalla (navegador real en TC-05) | Nada (4.4 desbloqueada) |

**Cómo se comprobó:** con experimentos desechables fuera del repo (scratchpad), usando las versiones del proyecto: React 19.2.8, jsdom 29 y el Chromium 153 de Playwright 1.63, sin pantalla. No se cambió código ni pruebas del repo.

1. **Orden real de los efectos en SCRUM-61. Resuelta por análisis.** El análisis del orden está en SPEC §15.
   - **Qué se probó:** una simulación con React 19.2.8 en jsdom, con el mismo patrón:
     - una sección que enfoca su título en un `useEffect` cuando sube `titleFocusKey`;
     - un `Modal` que guarda el elemento al abrir y devuelve el foco en la limpieza con la regla 9;
     - las dos cosas cambiando en la misma actualización, después de un `await`, como `useHouseholdMemberRemoval`.
   - **Resultado:**
     - la limpieza corre primero: el diálogo ya salió del DOM, `activeElement` es `body` y el foco vuelve a "Eliminar integrante Beto";
     - después corre el efecto de la sección y el foco termina en el título;
     - al cancelar, el foco termina en el botón de la fila.
   - **Confirmación (3.3, 2026-11-15):** el test existente de SCRUM-61 pasa sin cambios. En Chrome, con el código real, la dueña de la historia comprobó a mano que:
     - al eliminar un integrante, el foco queda en `h2#household-members-title` («Integrantes de la familia»), y Tab lo lleva a «Buscar por nombre»;
     - al cancelar, con Escape y con un clic fuera, el foco vuelve al botón de la fila.

     No se registró la versión del navegador.
2. **`activeElement` al quitar el nodo enfocado. Resuelta.**
   - **Qué pasa en jsdom 29:** al quitar del DOM el diálogo con el foco adentro, `document.activeElement` pasa a `body` (igual que en los navegadores) y no se dispara `focusout`.
   - **Qué cambia en la regla 9:** no hace falta aceptar un `activeElement` desconectado. Alcanza con "`body`, `null` o dentro del diálogo".
3. **Clic y toque en el fondo** (D3). **Resuelta por verificación manual** (2026-11-15). Se quería comprobar en Chrome desktop y en mobile:
   - que `preventDefault` en `mousedown` conserva el foco y no cancela el `click`;
   - si un toque en mobile saca el foco, y si `focusout` llega con `relatedTarget` en `null`.

   - **Resultado:** según la verificación manual de la dueña de la historia, las pruebas del fondo funcionaron como se esperaba en desktop y en mobile. Se hicieron con una sonda en la consola: `mousedown` cancelado o no, y cierre frenado o no.
   - **No registrado:** el detalle de cada corrida (`focusout`, `relatedTarget`, foco a los 100 ms), la versión del navegador ni el dispositivo móvil.
   - **Por qué alcanza para la 2.4:** el diseño conserva las dos piezas ("Diseño propuesto", punto 3). El `mousedown` cancelado evita que el foco salga, y el `focusout` lo devuelve si sale igual, por ejemplo con un toque. La 2.4 no depende de cuál de las dos actúe en cada plataforma.
4. **Botón deshabilitado con foco. Resuelta.**
   - **Qué pasa en Chromium 153:** el botón conserva el foco en el mismo instante. En el siguiente cuadro el foco pasa a `body`, y se disparan `blur` y `focusout` con `relatedTarget` en `null`. Sin D3, el siguiente Tab salta al fondo, al elemento que sigue en el documento.
   - **Qué significa:** la vuelta de D3 cubre el caso. Va al primer enfocable habilitado; si todos están deshabilitados, como en las confirmaciones mientras eliminan, va al diálogo.
   - **Diferencia con jsdom:** jsdom no mueve el foco ni dispara `focusout`. El caso 17 tiene que disparar `focusout` a mano ("Pruebas").
5. **Elementos ocultos con CSS. Resuelta.**
   - **Qué se revisó:** los 14 diálogos de SPEC §11 y sus componentes internos (`CreateDateListForm`, `MealSlotRecipeList`, `MealSlotCookField`, `MealSlotServingsField`, `StorePicker`, `ShoppingListItemDetail` y los primitivos de `@/components/ui`).
   - **Resultado:** ninguno tiene un control enfocable oculto con `hidden`, `invisible`, `opacity-0` ni `sr-only`. Las únicas clases `sr-only` son texto dentro de los botones de porciones, que no se enfocan por separado. `Icon` y las marcas decorativas son `aria-hidden`, no enfocables.
   - **Consecuencias:**
     - el selector por atributos de la regla 6 alcanza;
     - el diálogo de términos del registro no tiene enfocables, así que el foco va al diálogo (D1).
6. **E2E existentes. Resuelta.**
   - **Qué hacen:** los E2E de `date-lists`, `meal-planner` y `shopping-list` usan los diálogos solo con localizadores (`click`, `check`, `fill` y `getByRole("dialog")`). No hay `keyboard.press`, aserciones de foco ni clics en el fondo.
   - **Los únicos E2E con teclado y foco** son de Finanzas (`edit-totals.spec.ts`, `finance.spec.ts`), sobre editores inline que no usan el `Modal`.
   - **Conclusión:** no se espera que el cambio afecte a los E2E. La 5.3 los corre igual.

**Hallazgo adicional (D3 y el cierre, SPEC §15):** en Chromium 153, quitar del DOM un diálogo con el foco adentro **sí dispara `focusout`** (con `relatedTarget` en `null`), y en ese momento el diálogo **todavía está conectado**. Por eso:

- la condición "diálogo conectado y abierto" de D3 se evalúa en la vuelta agendada, no al recibir el evento ("Diseño propuesto", punto 3: un `setTimeout` de 0 ms, cancelado por la limpieza al cerrar);
- jsdom no dispara ese evento, así que el caso 18 lo provoca a mano antes de cerrar ("Pruebas").

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
8. **Mismo nodo después de guardar o quitar (D4). Resuelta por análisis del código y por un test de pantalla** (2026-11-15). Hacía falta saber si el botón del espacio sigue siendo el mismo nodo (misma `key`) o uno nuevo. Si fuera uno nuevo, la regla 9 no devolvería el foco (`isConnected` en `false`).
   - **Código:**
     - al guardar o quitar, `useMealSlotDialog` llama a `onSaved` y `onRemoved`, que son `plan.saveEntry` y `plan.removeEntry`. Actualizan el plan en el lugar, sin volver a leerlo;
     - `WeekGrid` no se desmonta: solo cambia `isDisabled`, por `!plan.isPlanReady || weekAddition.isOpen`;
     - las `key` son `day.dateKey` y `slot.mealType`, que no cambian.

     Por eso React conserva el mismo `<button>` y solo cambia su texto y su nombre accesible.
   - **Test:** `MealPlannerAssign.test.tsx`, con los componentes reales y el servicio simulado. Guarda el nodo del espacio antes de abrir y comprueba con `toBe` que, después de guardar y de quitar, el espacio con su nombre nuevo es **el mismo nodo** y tiene el foco.
   - **Límite:** el servicio está simulado. Un cambio futuro que vuelva a leer el plan después de guardar podría montar la grilla de nuevo; ese test lo detectaría. La comprobación en el navegador real queda en `TC-SCRUM-142-05`.

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
| Vuelta de D3 en un `setTimeout` de 0 ms, cancelado por la limpieza | Una microtarea | Precaución: corre después de que React aplique un cierre del mismo evento. Una mutación con microtarea también pasó en jsdom, así que no está medido que la microtarea falle |
| `focusout` nativo en el efecto | `onBlur` de React en `Modal.tsx` | Se agrega y se quita junto con el resto del foco, sin otra prop del ViewModel |
| `onClose` con `useEffectEvent` (antes: un ref) | Dependencia del efecto | Muchos usos pasan una función nueva en cada render, y el foco saltaría al primer campo mientras se escribe. `useEffectEvent` ya se usa en el repo y evita escribir el ref a mano |
| Un solo oyente `keydown` en `document` | `onKeyDown` en el diálogo más un oyente en `document` | Cubre Tab con el foco dentro y fuera del diálogo y Escape en un mismo lugar, sin repetir la lógica |

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

    Para el botón deshabilitado, jsdom no mueve el foco ni dispara `focusout` (duda 4), y `blur()` no actúa sobre un botón ya deshabilitado. El test hace `blur()` y después deshabilita, en el mismo tramo sincrónico. Así la vuelta encuentra el mismo estado que en Chromium: foco en `body` y el botón deshabilitado.
18. **D3 no compite con el cierre:** al cerrar desde un botón del contenido, si el padre mueve el foco a otro elemento en el mismo cambio (como SCRUM-61), el foco termina en ese elemento. Ni la vuelta ni la devolución lo pisan.

    El test provoca `focusout` (con `blur()`) justo antes de cerrar, como hace Chromium al quitar el diálogo, y espera a que corra la vuelta. Comprueba que el foco termina en el título (duda 4, hallazgo adicional).

**Resultado (2026-11-15):** los casos 1 a 19 están implementados en `tests/Modal.test.tsx`. Con `getFocusableElements.test.ts` son 30 tests, y pasan.

- **Revisión de QA (tasks 5.6):** sumó un test (el control que aparece) y endureció otros (los excluidos en los extremos, la vuelta al elemento que tenía el foco).

- **Caso 16:** son dos tests, el clic fuera que no cierra y el `mousedown` cancelado solo en el fondo.
- **Caso 17:** son tres tests (foco fuera, botón deshabilitado y sin enfocables).
- **Respaldo de Tab:** el test "Tab con el foco fuera del diálogo" ahora usa timers falsos, para que la vuelta de D3 no corra antes y quede probado solo ese respaldo.
- **Mutaciones temporales (el código quedó como estaba):**
  - sin el oyente `focusout`, fallan los tres tests del caso 17;
  - sin el `preventDefault` del fondo, falla el test del `mousedown`;
  - con una microtarea en lugar del `setTimeout`, o sin cancelar la vuelta y sin mirar `isConnected`, no falla ningún test. Son precauciones, no comportamiento medido (punto 3 del diseño).
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

**E2E:**

- **Nuevo:** `e2e/features/modal/modal-focus.spec.ts` (E2E-MODAL-01 a 04, [E2E.md](E2E.md)), sobre la demo de `/ui-kit`. Valida en Chromium real lo que jsdom no reproduce del todo: el foco al abrir, Tab y Shift+Tab, Escape y el clic en el fondo. No usa datos ni sesión.
- **Por pantalla:** ninguna tiene un E2E de foco propio (SPEC §14); se revisan a mano (CA-06).
- **Existentes:** se corren los que abren diálogos, para detectar cambios por el foco inicial y por D3:

```
npx playwright test e2e/features/date-lists e2e/features/meal-planner e2e/features/shopping-list
```

## Verificación manual con teclado

Cubre CA-06: cada pantalla que usa `Modal` se revisa una vez con el teclado después del cambio (formato de qa-testing-practices).

**Resultado (2026-11-15): los 17 casos pasaron.**

- **TC-01:** automatizado.
- **TC-02 y TC-14:** validados en la tarea 3.3.
- **TC-03 a TC-13 y TC-15 a TC-17:** pasaron en la verificación manual de la dueña de la historia.

**Cómo se ejecuta y qué se anota:**

- **Navegador:** Chrome desktop, solo teclado (Tab, Shift+Tab, Enter, Escape). Los casos de mouse o toque están aparte (TC-15 y TC-16) y lo dicen.
- **Ambiente:** en cada ejecución se anota el navegador, su versión y, en mobile, el dispositivo. En la ejecución del 2026-11-15 no se registró ninguno de los tres; los resultados quedan como los informó la dueña de la historia.
- **Foco que no se ve:** para el título de la sección y el diálogo, que tienen `outline-none`, se usa la *live expression* `document.activeElement` de DevTools.
- **Capturas:** solo si se piden, sin correos.

**Verificación común** (pasos 1 a 4 de TC-01 a TC-13):

1. Abrir el diálogo con Enter sobre el botón indicado. El foco queda en el «Foco al abrir» de la tabla (D1).
2. Tab y Shift+Tab: el foco da la vuelta dentro del diálogo y no llega a nada del fondo (CA-02).
3. Escape: el diálogo se cierra y el foco vuelve al botón del paso 1 (CA-03 y CA-04).
4. Reabrir y cerrar con el botón de cancelar o cerrar del diálogo: el foco vuelve al mismo botón.

| ID | Precondición | Botón que abre | Foco al abrir | Caso propio y resultado esperado | Estado |
|---|---|---|---|---|---|
| TC-SCRUM-142-01 | `npm run dev`; `/ui-kit` | «Abrir modal» | «Cancelar» | Pasos comunes | **Automatizado:** E2E-MODAL-01 a 04, 8 de 8 (Chromium desktop y Pixel 7, 2026-11-15) |
| TC-SCRUM-142-02 | Cuenta admin de una familia con otro integrante; `/household` | «Eliminar integrante {nombre}» | «Cancelar» | Reproducción de Jira (SPEC §1): Tab no llega a «Copiar enlace», «Generar nuevo enlace» ni «Salir de la familia». «Cancelar» vuelve al botón de la fila | **Validado** por la dueña de la historia en Chrome (3.3, 2026-11-15; versión no registrada) |
| TC-SCRUM-142-03 | Cuenta en una familia; `/household` | «Salir» de la sección «Salir de la familia» | El primer control del diálogo (el campo de confirmación, si aparece) | Escribir en el campo no mueve el foco (regla 5). Al confirmar la salida, el botón «Salir» desaparece: no hay error y el foco queda en `body` (regla 9) | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-04 | Cuenta registrada; `/fechas` | «+ Nueva sublista» | El campo «Nombre» | Crear una sublista o cancelar: el foco vuelve a «+ Nueva sublista» | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-05 | Al menos una receta propia; `/recetas/planificador` | Un espacio vacío (por ejemplo «Cena del lunes …, vacío, asignar») | El primer control disponible; mientras cargan las recetas puede ser el diálogo | Cuando aparecen las recetas, entran en el ciclo de Tab. Cancelar, guardar y quitar devuelven el foco al mismo espacio (D4) | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado). También automatizado en jsdom: `MealPlannerAssign.test.tsx` |
| TC-SCRUM-142-06 | Plan con comidas en la semana; `/recetas/planificador` | «Agregar semana a la lista» | «Cancelar» | Al cerrar, el foco vuelve al botón. En Safari con mouse no vuelve: es el comportamiento conocido, fuera de alcance (opción A) | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-07 | Una receta propia; `/recetas` | La acción de eliminar de esa receta | «Cancelar» | Al eliminar, la receta desaparece: no hay error y no se fuerza el foco | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-08 | Una receta ya agregada a la lista; `/recetas` | Volver a agregar esa receta | «Cancelar» | Cancelar y confirmar devuelven el foco al botón de agregar | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-09 | Sin sesión; `/registro` | El enlace de términos y condiciones | El diálogo (no tiene enfocables) | Tab y Shift+Tab no sacan el foco del diálogo. Escape cierra y vuelve al enlace | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-10 | Lista con al menos un producto; `/lista` | Enter sobre una fila de producto | El primer control del detalle | Al cerrar, el foco vuelve a esa fila | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-11 | Lista con productos; `/lista` | «Iniciar compra» | El primer supermercado | Elegir un súper: si el botón desaparece, no hay error y no se fuerza el foco | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-12 | Cuenta registrada; `/catalogo/mis-productos` (y `/catalogo`, desde el vacío del buscador) | «Crear producto» | El primer campo | Escribir en los campos y en los `select` no mueve el foco; Tab recorre todo el formulario y da la vuelta | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-13 | Cuenta registrada con un borrador sin guardar (por ejemplo, editar el perfil sin guardar); sidebar en desktop | «Cerrar sesión» | «Cancelar» | Cancelar vuelve a «Cerrar sesión». Confirmar navega a `/login` sin errores en la consola | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-14 | La de TC-02 | «Eliminar integrante {nombre}» → «Eliminar» | — | Al eliminar, el foco queda en `h2#household-members-title` («Integrantes de la familia»), y Tab lo lleva a «Buscar por nombre» (SCRUM-61, CA-03) | **Validado** por la dueña de la historia en Chrome (3.3, 2026-11-15; versión no registrada) |
| TC-SCRUM-142-15 | La de TC-02, con throttling lento de red en DevTools | «Eliminar» y, mientras elimina, Escape y un clic en el fondo | — | El diálogo no se cierra. El foco sigue dentro del diálogo, aunque los botones estén deshabilitados (D3, regla 11) | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado) |
| TC-SCRUM-142-16 | Chrome en un teléfono (o emulación, anotándolo); `/ui-kit` | «Abrir modal» y un toque en el fondo | — | El diálogo se cierra y el foco vuelve a «Abrir modal». Con la sonda de la duda 3 y el cierre frenado, el foco sigue en el diálogo | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado). Duda 3 resuelta antes |
| TC-SCRUM-142-17 | Safari con mouse, si hay uno disponible; la de TC-05 | Clic sobre un espacio | — | Al cancelar, el foco vuelve al espacio (duda 7, opción B) | **Pasó**: verificación manual de la dueña de la historia (2026-11-15; ambiente no registrado), en Safari. También automatizado en jsdom: `MealPlannerAssign.test.tsx` |

## Riesgos

- **Pisar el foco elegido por una pantalla:** SCRUM-61 hoy, y cualquiera que se agregue después. Lo mitigan la regla 9, la condición de conexión de D3, el test existente y los casos 11 y 18.
- **Foco que salta mientras se escribe** si el efecto depende de `onClose`. Lo mitigan el ref y el caso 13.
- **La vuelta de D3 cancela un clic necesario:** `preventDefault` en `mousedown` no cancela el `click`. La verificación manual de la duda 3 no mostró problemas en desktop ni mobile. Se vuelve a revisar con D3 implementado (2.4 y `TC-SCRUM-142-02`).
- **Tests y navegador que no coinciden:** jsdom no dispara `focusout` al deshabilitar un botón con foco ni al quitar el diálogo, y Chromium sí (duda 4). Los casos 17 y 18 lo disparan a mano. `activeElement` en `body` sí coincide (duda 2), y no hay controles ocultos con CSS (duda 5). Lo demás lo cubre la verificación manual.
- **Safari con mouse en el planificador:** resuelto para los espacios con la opción B. En "Agregar semana a la lista" es un comportamiento conocido y fuera de alcance (opción A), no un riesgo de esta historia.
- **Dos fuentes del foco en "Agregar semana a la lista"** (D4, lectura (ii)): el `Modal` y `useWeekListAddition` devuelven el foco al mismo botón.
  - **Hoy no se pisan,** porque los dos guardan `document.activeElement`.
  - **Límite conocido:** el hook no tiene la condición de la regla 9. Si algún día esa pantalla moviera el foco a propósito al cerrar, el hook lo pisaría. Esa pantalla no lo hace hoy y queda fuera de alcance.
  - **Lo vigilan** `MealPlannerWeekList.test.tsx` y `TC-SCRUM-142-06`.
- **Enfocar el espacio antes de abrir** mueve el foco una vez más. Con teclado no cambia nada, porque el espacio ya tenía el foco.
- **Espacio que se vuelve a crear al guardar** (duda 8): la devolución no tendría a dónde volver.
- **E2E que dependen del foco:** no se encontró ninguno (duda 6). La 5.3 los corre igual.

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
- por qué `onClose` va con `useEffectEvent` y no como dependencia del efecto;
- por qué jsdom no sirve para medir visibilidad;
- por qué una sola fuente del foco en los espacios, y por qué "Agregar semana" conserva dos (D4).
