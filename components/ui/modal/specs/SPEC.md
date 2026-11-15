# Feature: Modal — foco al abrir, atrapado y devuelto al cerrar

Historia: **[SCRUM-142](https://tacha.atlassian.net/browse/SCRUM-142) — Shared Modal: move the focus into the dialog, trap it, and return it on close.**

**Fuente funcional:** la descripción y los seis criterios de aceptación de SCRUM-142 en Jira, compartidos por la dueña de la historia el 2026-11-15. Jira sigue siendo la fuente de verdad. Los criterios están en §13 como CA-01 a CA-06.

Vive en `components/ui/modal/` porque es el primitivo compartido de `@/components/ui`. Su spec general, del formato anterior, es [components/ui/specs/SPEC.md](../../specs/SPEC.md), que hoy dice "no atrapa el foco todavía". El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md).

## 1. Objetivo

Que quien usa teclado o lector de pantalla quede dentro de un diálogo mientras está abierto, y vuelva a donde estaba al cerrarlo. Para eso, el diálogo hace tres cosas:

- **al abrir**, mueve el foco adentro;
- **mientras está abierto**, Tab y Shift+Tab no salen de él;
- **al cerrar**, el foco vuelve al elemento que lo abrió, sin pisar un foco que la pantalla ya movió a propósito (SCRUM-61).

**Contexto (Jira):** se encontró en el QA del PR #69 (SCRUM-61), el 2026-10-19; está en el comentario de QA de ese PR.

- **Qué pasa:** `components/ui/modal/Modal.tsx` tiene `role="dialog"` y `aria-modal="true"`, pero `useModalViewModel` solo maneja Escape ("No atrapa el foco todavía"). Al abrir un diálogo, el foco se queda en el botón que lo abrió, detrás del overlay.
- **No lo causa SCRUM-61:** todos los diálogos que usan el `Modal` compartido se comportan igual. Por ejemplo: salir de la familia, eliminar integrante y elegir supermercado en el modo compra.
- **Deuda ya anotada:** los planes de SCRUM-58, SCRUM-61, recetas y el planificador ya la mencionaban.

**Pasos para reproducirlo (Jira):**

1. Como admin de una familia, abrir `/household` y llegar con el teclado a "Eliminar integrante".
2. Pulsar Enter: el diálogo se abre, pero el foco sigue en el botón de la fila.
3. Pulsar Tab: hacen falta 5 Tabs para llegar a "Cancelar". En el camino pasa por "Copiar enlace", "Generar nuevo enlace" y "Salir de la familia", que están detrás del overlay.

**Esperado (Jira):**

- al abrir el diálogo, el foco entra en él;
- Tab y Shift+Tab se quedan adentro;
- al cerrarlo, el foco vuelve al botón que lo abrió, o al lugar que decida la feature, como hace SCRUM-61 después de eliminar.

## 2. Alcance

Incluye:

- **Foco inicial** al abrir (D1).
- **Foco atrapado:** Tab desde el último elemento enfocable vuelve al primero, y Shift+Tab desde el primero va al último.
- **Diálogo sin elementos enfocables:** el foco queda en el diálogo.
- **Devolver el foco** al cerrar, por cualquier vía (Escape, clic fuera, un botón del contenido o un cambio de estado del padre) y al desmontarse abierto. Respeta la regla 9: no pisa un foco movido a propósito.
- **Foco que sale con un clic fuera que no cierra:** vuelve de inmediato al diálogo (D3).
- **Quitar la devolución propia de `useMealSlotDialog`** y delegarla en el `Modal` (D4), con sus tests. El espacio se enfoca antes de abrir su diálogo (duda 7, opción B). `useWeekListAddition` no se toca (D4).
- **Sin regresiones** en las 14 instancias de `Modal` de §11. En particular, el foco al título de la sección después de eliminar un integrante (SCRUM-61).
- **Tests del componente**, los primeros del `Modal` (§13).

No incluye ([§14](#14-casos-fuera-de-alcance)):

- volver inerte el fondo (`inert`, `aria-hidden`);
- bloquear el scroll;
- diálogos anidados;
- cambios en el contenido de cada diálogo.

## 3. Entradas

Sin props nuevas (D2). Las de hoy (`ModalProps`):

- `isOpen: boolean`
- `onClose: () => void`
- `title?: string`
- `children: React.ReactNode`

Del navegador:

- `Tab` y `Shift+Tab` con el diálogo abierto;
- `Escape`;
- clic o toque en el fondo;
- el elemento que tenía el foco justo antes de abrir (`document.activeElement`).

## 4. Salidas

- **Al abrir:** el foco en el destino de D1.
- **Con Tab o Shift+Tab:** el foco circula dentro del diálogo, en el orden del documento.
- **Al cerrar o desmontarse:** el foco vuelve al elemento guardado, o no se toca (regla 9).
- **Escape y clic fuera** llaman a `onClose`, igual que hoy. Cerrar o no lo sigue decidiendo quien usa el `Modal`.

## 5. Reglas de negocio

**Decididas por la dueña de la historia** (2026-11-15):

1. **D1. Foco inicial:** al abrir, el foco va al **primer elemento enfocable** del diálogo (regla 6). Si no hay ninguno, va al **propio diálogo**, que recibe `tabIndex={-1}`. Cumple CA-01. Dónde cae en cada diálogo:

   | Diálogo | El foco cae en |
   |---|---|
   | Confirmaciones destructivas | "Cancelar", que va primero en todas |
   | Salir de la familia | El campo de confirmación |
   | Crear producto | El primer campo |
   | Términos del registro | El diálogo, si no tiene enfocables |
2. **D2. Devolución:** al cerrar, el foco **vuelve automáticamente** al elemento que lo tenía antes de abrir, **solo si la funcionalidad no lo movió a propósito** (regla 9).
   - No hay una prop para desactivarla ni para elegir otro destino.
   - Con esto queda cubierto SCRUM-61 (CA-03).
3. **D3. Clic fuera que no cierra:** si el foco sale del diálogo por un clic o un toque fuera y el `Modal` sigue abierto (por ejemplo, mientras elimina), el foco **vuelve de inmediato** al interior del diálogo (regla 11).
   - No espera al siguiente Tab.
   - El clic fuera sigue llamando a `onClose` igual que hoy (CA-04).
4. **D4. Planificador** (resuelta con la lectura (ii), 2026-11-15):
   - **Qué se quita:** la devolución de foco propia de `useMealSlotDialog`, es decir, `openerRef`, `wasOpenRef` y su efecto.
   - **Quién la hace:** para el diálogo de un espacio, el `Modal` compartido, que pasa a ser el único responsable.
   - **Qué se conserva:** el comportamiento que describe la SPEC del planificador (§9): al cerrar, el foco vuelve al espacio que abrió el diálogo, también después de guardar o quitar.
   - **`useWeekListAddition` no se toca:** quedan sin cambios su hook, su botón (`AddWeekToListButton`), su comportamiento y sus tests.
     - Conserva su devolución de foco actual (`openerRef`, `wasOpenRef` y su efecto), aunque el `Modal` también haga la suya.
     - Las dos mandan el foco al mismo botón, que el hook guarda de `document.activeElement` igual que el `Modal` (regla 8), así que no se pisan.
     - Ver plan, "Riesgos".
   - **Safari (duda 7, opción B, decidida el 2026-11-15):** en Safari un clic no enfoca el botón.
     - **Qué se hace:** antes de abrir el diálogo desde un espacio, el planificador **enfoca explícitamente el botón de ese espacio**. Así el `Modal` guarda el elemento correcto (regla 8) y devuelve el foco al cerrar, también en Safari con mouse.
     - **Qué no se hace:** no se agrega una prop al `Modal` (D2) ni se recupera la devolución propia de `useMealSlotDialog` (D4).
     - **Solo para los espacios.** `MealSlot.tsx` es el único que enfoca su botón antes de abrir.
   - **"Agregar semana a la lista": opción A, fuera de alcance** (la dueña de la historia, 2026-11-15).
     - Esta historia no le aplica la opción B: su botón (`AddWeekToListButton`) no se enfoca antes de abrir.
     - **Comportamiento conocido:** en Safari con mouse, al cerrar, el foco no vuelve al botón.
       - Ya pasa hoy, porque el clic no enfoca el botón, y su hook y el `Modal` solo usan `document.activeElement`.
       - No es una regresión ni un trabajo pendiente de esta historia (§14).

**Reglas:**

5. **Una sola fuente del foco inicial:**
   - Se mueve **una vez por apertura**: cuando `isOpen` pasa de `false` a `true`, o cuando el `Modal` se monta ya abierto.
   - Un render nuevo no lo vuelve a mover. Tampoco lo mueven otro `onClose` (muchos usos pasan una función nueva en cada render) ni un cambio de `title` o de contenido.
6. **Qué es enfocable:** un elemento que se alcanza con Tab dentro del diálogo:
   - `a[href]`, `button`, `input`, `select`, `textarea`, `[tabindex]` y `[contenteditable]`;
   - **sin** `disabled`, sin `tabindex="-1"`, y que no esté dentro de `[hidden]` ni de `[inert]`.

   La lista se calcula **en cada Tab** y no al abrir, porque el contenido cambia mientras el diálogo está abierto: carga, errores o botones que se deshabilitan mientras guarda.
7. **Tab circular:**
   - Desde el último enfocable, Tab va al primero; desde el primero, Shift+Tab va al último.
   - Entre los demás, el navegador sigue su orden, que no se reemplaza.
   - Con un solo enfocable, el foco se queda en él.
   - Con ninguno, se queda en el contenedor.
8. **Qué se guarda para devolver:** el elemento que tenía el foco justo antes de abrir. Si era `body`, o no había ninguno, no se devuelve a ningún lado.
9. **Cuándo se devuelve:** al cerrar, o al desmontarse abierto, se devuelve el foco solo si se cumplen las dos condiciones:
   - **el elemento guardado sigue en el documento** (`isConnected`);
   - **el foco no está en otro lugar elegido por la pantalla**, es decir, quedó en `body`, en nada, o dentro del diálogo que se cierra.

   Si la pantalla ya movió el foco a otro elemento (SCRUM-61: el título "Integrantes"), no se toca. Si el elemento guardado desapareció (por ejemplo, la fila del integrante eliminado), no se fuerza el foco.
10. **Escape:** cierra igual que hoy, llamando a `onClose`. Quien usa el `Modal` decide si cierra (Household no cierra mientras elimina, SCRUM-61 §9). Si no cierra, el foco sigue en el diálogo.
11. **Clic fuera:** igual que hoy, llama a `onClose`.
    - **Si cierra,** aplica la regla 9.
    - **Si no cierra** (D3), el foco no queda fuera del diálogo:
      - vuelve al elemento del diálogo que lo tenía, si sigue conectado y habilitado;
      - si no, al primer enfocable;
      - y si no hay ninguno, al diálogo.
    - **Lo mismo vale para cualquier foco que salga del diálogo abierto,** por ejemplo un botón con foco que se deshabilita mientras guarda, si el navegador avisa la salida (plan, duda 4).
    - **Nada de esto corre cuando el diálogo se está cerrando,** para no competir con la regla 9 ni con SCRUM-61.
12. **Reabrir:** cada apertura guarda su propio elemento. Abrir desde otro botón devuelve el foco a ese.
13. **Sin reemplazar el `Modal`:** esta historia no lo cambia por una librería (por ejemplo `focus-trap`) ni por el elemento nativo `<dialog>` (fuera de alcance en Jira). Cualquiera de los dos se puede proponer en otra historia. El plan propone lógica propia, porque AGENTS.md pide no sumar "librerías o wrappers innecesarios".

## 6. Estados

El `Modal` no guarda estado de UI nuevo: `isOpen` lo controla el padre. Internamente:

- **cerrado:** no dibuja nada y no tiene oyentes;
- **abierto:** con el foco adentro, con oyentes de teclado y con los oyentes de la vuelta del foco (D3);
- **cerrándose:** devuelve el foco según la regla 9 y quita los oyentes.

Estos estados no se exponen como una unión, porque solo existen dentro del hook.

## 7. Errores

No hay errores que se muestren. Los casos que no pueden romper nada:

- **El elemento guardado ya no existe:** no se llama a `focus`, así que no falla (regla 9).
- **El diálogo no tiene enfocables:** no hay un bucle ni una excepción; el foco se queda en el contenedor (regla 7).
- **El `Modal` se desmonta abierto** (navegar, o que el padre deje de dibujarlo): los oyentes se quitan y se aplica la regla 9.
- **Los botones se deshabilitan mientras guarda:** el navegador puede sacar el foco del botón deshabilitado y mandarlo a `body`.
  - Si avisa la salida, el foco vuelve al diálogo (regla 11).
  - Si no avisa, lo trae el siguiente Tab (regla 7).

  Se comprueba en el navegador (plan, duda 4).

## 8. UI esperada

Sin cambios visuales. El contenedor del diálogo puede recibir foco (D1) sin mostrar un anillo propio: el foco visible de los controles no cambia.

## 9. Accesibilidad

- Se conservan `role="dialog"`, `aria-modal="true"` y `aria-label={title}`.
- **Al abrir,** el lector anuncia el diálogo, porque el foco entra en él.
- **Mientras está abierto,** con el teclado no se puede llegar a nada detrás del diálogo (WAI-ARIA APG, "Dialog (Modal)").
- **Al cerrar,** se puede seguir desde donde se estaba, salvo que la pantalla decida otro lugar estable (regla 9).
- **Todo se puede hacer con teclado,** en desktop y en mobile con teclado externo.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- La lógica vive en `useModalViewModel`, y `Modal.tsx` solo presenta (component-architecture §3).
- **Constantes:** las teclas y el selector de enfocables van en `constants/ui.constants.ts` (constants-standards). La constante local `ESCAPE_KEY` del hook se mueve ahí.
- **Detección de enfocables solo por atributos y DOM:** sin `offsetWidth` ni `getClientRects`. jsdom no calcula layout, y el criterio tiene que dar lo mismo en los tests y en el navegador (plan, "Riesgos").
- **Sin librerías nuevas ni `<dialog>` nativo** (regla 13).
- **Sin cambios en otras features,** con dos excepciones:
  - **El planificador (D4):**
    - `features/meal-planner/hooks/useMealSlotDialog.ts` pierde su devolución de foco.
    - `MealSlot.tsx` enfoca su botón antes de abrir (duda 7, opción B). `MealPlannerDay.tsx` y `MealSlotProps` dejan de pasar el botón.
    - Los tests de foco de `useMealSlotDialog` pasan al `Modal` y a las pruebas de pantalla del planificador.
    - Su `specs/SPEC.md` recibe una nota en §9: el foco de vuelta del espacio lo hace el `Modal`.
    - **Sin cambios:** `useWeekListAddition.ts`, `AddWeekToListButton.tsx` y sus tests (D4).
  - **Tests ajustados:** cualquier otro test que haga falta ajustar se anota en tasks.

## 11. Dependencias

- **Del primitivo:**
  - `components/ui/modal/Modal.tsx`
  - `components/ui/modal/hooks/useModalViewModel.ts`
  - `components/ui/modal/models/ModalProps.interface.ts`
  - `constants/ui.constants.ts`
- **Usos compartidos (14 instancias en 12 archivos):**

| # | Archivo | Diálogo | Dónde se abre |
|---|---|---|---|
| 1 | `app/(demo)/ui-kit/page.tsx` | Demo "Confirmar acción" | `/ui-kit` (solo en local) |
| 2 | `features/household/components/HouseholdLeaveDialog.tsx` | Salir de la familia | `/household` |
| 3 | `features/household/components/HouseholdRemoveMemberDialog.tsx` | Eliminar integrante (SCRUM-61) | `/household` |
| 4 | `features/date-lists/DateLists.tsx` | Nueva lista por fecha | `/fechas` |
| 5 | `features/meal-planner/components/MealSlotDialog.tsx` | Asignar comida a un espacio | `/recetas/planificador` |
| 6 | `features/meal-planner/components/AddWeekToListDialog.tsx` | Agregar semana a la lista | `/recetas/planificador` |
| 7 | `features/recipes/components/RecipeDeleteDialog.tsx` | Eliminar receta | `/recetas` |
| 8 | `features/recipes/components/RecipeRepeatAddDialog.tsx` | Volver a agregar receta | `/recetas` |
| 9 | `features/registro-manual/RegistroManual.tsx` | Términos y condiciones | `/registro` |
| 10 | `features/shopping-list/ShoppingListInner.tsx` | Detalle de un producto | `/lista` |
| 11 | `features/shopping-list/ShoppingListInner.tsx` | Elegir supermercado (`StorePicker`) | `/lista` |
| 12 | `components/create-product-form/CreateProductForm.tsx` | Crear producto | `/catalogo` (`CatalogSearch`, `CatalogEmptyState`) y `/catalogo/mis-productos` |
| 13 | `components/sign-out-button/SignOutButton.tsx` | Confirmar cierre de sesión, en el sidebar | Cualquier pantalla privada en desktop |
| 14 | `components/sign-out-button/SignOutButton.tsx` | Confirmar cierre de sesión, en Perfil | `/perfil` |

Las filas 13 y 14 son el mismo archivo dibujado en dos lugares: el sidebar (`components/app-shell/components/AppSidebar.tsx`) y Perfil (`features/profile/Profile.tsx`).

## 12. Contratos externos

No aplica: no hay base, API ni almacenamiento. El único contrato es el del DOM:

- `document.activeElement` y `focus()`;
- los eventos `keydown`;
- el `mousedown` del fondo y el `focusout` del diálogo (D3).

## 13. Casos de aceptación

Ninguno validado. Criterios de SCRUM-142 en Jira, con su texto traducido y cómo se verifica cada uno:

- [ ] **CA-01:** al abrir un `Modal`, el foco va a su primer elemento enfocable, o al propio diálogo.
  - D1: el primer enfocable y, si no hay ninguno, el diálogo.
  - En los pasos de reproducción, el foco ya no se queda en "Eliminar integrante" de la fila.
  - **Se verifica con:** casos 1 y 2 del plan, y manual.
- [ ] **CA-02:** mientras está abierto, Tab y Shift+Tab recorren solo los elementos del diálogo.
  - En los pasos de reproducción, el foco no pasa por "Copiar enlace", "Generar nuevo enlace" ni "Salir de la familia".
  - Ver la regla 7.
  - **Se verifica con:** casos 2 a 6 del plan, y manual.
- [ ] **CA-03:** al cerrarlo, el foco vuelve al elemento que lo tenía antes de abrir, salvo que la feature lo mueva a propósito.
  - SCRUM-61 enfoca el título de la sección después de eliminar, y eso tiene que seguir funcionando.
  - En el planificador lo hace ahora el `Modal` (D4).
  - Ver las reglas 8 y 9 y D2.
  - **Se verifica con:**
    - casos 7, 8, 10, 11, 12, 14, 18 y 19 del plan;
    - el test existente de `features/household/tests/HouseholdRemoveMember.test.tsx` ("keeps the focus stable"), que sigue pasando sin cambios;
    - las pruebas de pantalla del planificador (plan, "Regresión");
    - manual.
- [ ] **CA-04:** Escape y el clic fuera siguen funcionando igual que hoy.
  - Llaman a `onClose`, y quien usa el `Modal` decide si cierra.
  - Un clic dentro del diálogo no lo cierra.
  - Si el clic fuera no cierra, el foco vuelve de inmediato al diálogo (D3).
  - Ver las reglas 10 y 11.
  - **Se verifica con:** casos 7, 8, 9, 15, 16 y 17 del plan, los tests de las features y manual.
- [ ] **CA-05:** los tests de `components/ui` cubren el foco al abrir, la trampa y el foco al cerrar.
  - `components/ui/modal/tests/Modal.test.tsx` con Page Object.
  - `getFocusableElements.test.ts`.
  - **Se verifica con:** plan, "Pruebas".
- [ ] **CA-06:** cada pantalla que usa `Modal` se revisa una vez con el teclado después del cambio.
  - Las 14 instancias de §11.
  - **Se verifica con:** `TC-SCRUM-142-01` a `13`, en plan, "Verificación manual".

Casos de cada flujo:

- [ ] **Reproducción de Jira:** con los pasos de §1, después del cambio:
  - el foco entra al diálogo al pulsar Enter;
  - Tab no llega a nada del fondo.
- [ ] **SCRUM-61 (CA-03):** después de eliminar un integrante, el foco queda en el título "Integrantes" y la devolución no lo pisa. Se verifica a mano en `TC-SCRUM-142-02`.
- [ ] **SCRUM-61, cancelar:** cerrar el diálogo de eliminar sin eliminar devuelve el foco a "Eliminar integrante {nombre}".
- [ ] **Escape bloqueado (regla 10):** mientras elimina, Escape no cierra y el foco sigue en el diálogo.
- [ ] **Clic fuera bloqueado (D3):** mientras elimina, un clic o toque en el fondo no cierra el diálogo, y el foco vuelve de inmediato a él, sin esperar a Tab. El toque en mobile depende de la duda 3 del plan (verificación manual pendiente).
- [ ] **SCRUM-61 con D3:** al eliminar, el diálogo se cierra y el foco queda en el título. La vuelta de D3 no se activa durante el cierre (regla 11).
- [ ] **Enfocables que cambian (regla 6):** un botón que se deshabilita o aparece mientras el diálogo está abierto entra o sale del ciclo de Tab.
- [ ] **Elemento guardado que desaparece (regla 9):**
  - salir de la familia quita el botón "Salir";
  - empezar una compra puede reemplazar "Iniciar compra".

  En los dos casos, cerrar no da error y no fuerza el foco.
- [ ] **Desmontaje abierto:** navegar con el diálogo abierto (por ejemplo, confirmar el cierre de sesión) no deja oyentes ni errores en la consola.
- [ ] **Reabrir (regla 12):** abrir desde dos botones distintos devuelve el foco a cada uno.
- [ ] **Renders (regla 5):** escribir en un campo del diálogo (Salir de la familia o Crear producto) no mueve el foco al primer campo en cada render.
- [ ] **Planificador, espacios (D4):**
  - **Sin devolución propia:** `useMealSlotDialog` ya no tiene `openerRef` ni el efecto de foco.
  - **El foco sigue volviendo al espacio** que abrió el diálogo:
    - al cancelar;
    - después de guardar o quitar una comida, si el espacio sigue siendo el mismo elemento (duda 8 del plan, verificación manual pendiente).
  - **Tests:** los de foco de `useMealSlotDialog` se quitan o pasan a otro nivel, y `MealPlannerAssign.test.tsx` ("gives the focus back to the slot that opened it") sigue pasando.
- [ ] **Planificador, "Agregar semana a la lista" (D4, fuera de alcance):**
  - `useWeekListAddition`, su botón y sus tests no cambian.
  - Con la devolución del hook y la del `Modal`, el foco sigue volviendo al botón al cerrar.
  - `useWeekListAddition.test.ts` y `MealPlannerWeekList.test.tsx` ("gives the focus back to the button when it closes") siguen pasando sin cambios.
  - En Safari con mouse no vuelve: es el comportamiento conocido, no una regresión.
  - **Safari (opción B):** un clic sobre un espacio que no lo enfoca (como en Safari) igual deja el foco en el espacio antes de abrir, y al cerrar el foco vuelve ahí. Se verifica con un test de pantalla y, si hay un Safari disponible, a mano.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` y `git diff --check` pasan. La suite E2E que abre diálogos (`date-lists`, `meal-planner`, `shopping-list`) sigue pasando.

## 14. Casos fuera de alcance

- **Reemplazar el `Modal` por una librería o por el elemento nativo `<dialog>`** (fuera de alcance en Jira). Se puede proponer, pero esta historia no lo exige.
- **Volver inerte el contenido de fondo** (`inert` o `aria-hidden` en el resto de la página) para el cursor virtual del lector. `aria-modal="true"` ya lo indica; ampliarlo es otra historia.
- **Bloquear el scroll del fondo.**
- **Diálogos anidados o dos `Modal` abiertos a la vez:** hoy no se encontró ningún caso.
- **Cambiar el contenido, los textos o el orden de los botones de cualquier diálogo.**
- **La constante `ESCAPE_KEY` repetida en Finanzas** (`InlineTotalEditor` y `SpendingBudget`).
- **Pasar diálogos que no usan el `Modal`** (editores inline de Finanzas) a este comportamiento.
- **El foco perdido al pulsar una flecha deshabilitada del planificador:** límite conocido de su SPEC §9, del `Button`.
- **"Agregar semana a la lista" (opción A y D4):** no se cambian su hook (`useWeekListAddition`), su botón, su comportamiento ni sus tests.
  - Conserva su devolución de foco propia.
  - Que en Safari con mouse el foco no vuelva al botón es un comportamiento conocido de hoy, no una regresión ni trabajo de esta historia.
- **E2E nuevos de foco** (ver plan, "Pruebas").

## 15. Notas de implementación

- **Orden de los efectos en SCRUM-61:**
  - **Qué pasa al eliminar:** `useHouseholdMemberRemoval` cierra el diálogo (`setState(IDLE_STATE)`) y sube `titleFocusKey` en la misma actualización, y `HouseholdMembersSection` enfoca el título en un `useEffect`.
  - **Si la devolución corre al limpiar el efecto del `Modal`:** se ejecuta antes que los efectos nuevos del mismo commit, así que el título gana.
  - **Si corre como efecto nuevo, o después** (`setTimeout`, `requestAnimationFrame`): puede pisar el título.

  La regla 9 lo evita en cualquier orden, porque con el título enfocado el foco ya no está "perdido". Igual hay que comprobar el orden real (plan, "Dudas").
- **D3 y el cierre:** al cerrar, el botón con foco sale del DOM, y el navegador puede avisar que el foco salió del diálogo.
  - **Qué no puede pasar:** la vuelta de D3 no puede actuar entonces. Si actuara, intentaría enfocar un diálogo que se está quitando, o competiría con el título de SCRUM-61.
  - **Cuándo actúa:** solo si el diálogo sigue en el documento y abierto después de ese aviso (plan, "Diseño propuesto", punto 3).
- **Dónde va la spec:** las piezas de `components/` con spec propia la tienen en su carpeta (`components/sign-out-button/specs/`, `components/price-disclaimer/specs/`). La spec general de `components/ui/specs/SPEC.md` es del formato anterior y no se migra (component-architecture, "Specs existentes"). Al implementar se actualiza su línea del `Modal` para que enlace a esta.
