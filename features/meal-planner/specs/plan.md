# Plan técnico: planificador semanal

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md). Este plan cubre **SCRUM-99** (ver el calendario); SCRUM-100 y SCRUM-101 le suman secciones cuando empiecen.

> **Verificado el 2026-10-09** contra `develop` (con SCRUM-66, SCRUM-135, SCRUM-97 y SCRUM-98 mergeadas): `/recetas` es la única ruta de la sección, sus sub-tabs viven en `features/recipes/components/RecipesTabs.tsx` con el planificador deshabilitado, el shell (`components/app-shell/`) ya marca "Recetas" activo en cualquier subruta, y no existe `meal_plans`. La `018` está tomada por la PR #55; esta historia no usa migraciones.

## Archivos

```
features/meal-planner/
  MealPlanner.tsx                       entrada ("use client"): sub-tabs + selector de semana + grilla (solo presentación)
  components/
    WeekSelector.tsx                    flecha atrás, rango, etiqueta "Esta semana"/"Próxima semana", flecha adelante
    WeekGrid.tsx                        lista de los 7 días (grilla en desktop, apilados en mobile)
    MealPlannerDay.tsx                  un día: etiqueta con su <time> y sus 3 espacios
    MealSlot.tsx                        un espacio vacío ("+ Almuerzo"); sin acción hasta SCRUM-100
    models/WeekSelectorProps.type.ts
    models/WeekGridProps.type.ts
    models/MealPlannerDayProps.interface.ts
    models/MealSlotProps.interface.ts
  hooks/
    useMealPlannerViewModel.ts          semana elegida, flechas, y la semana armada para dibujar
    useToday.ts                         "hoy" en hora local del navegador (useSyncExternalStore)
  models/
    meal-planner.interfaces.ts          WeekDay, WeekSlot, WeekSelectorState, MealPlannerViewModel
    meal-planner.types.ts               WeekOffsetType, MealTypeType
  utils/
    getWeekStart.ts                     fecha → su lunes (hora local)
    buildWeek.ts                        lunes + hoy → 7 WeekDay con sus 3 espacios y si es hoy
    formatWeekRange.ts                  lunes → "12 – 18 oct", "28 sep – 4 oct", "29 dic – 4 ene"
    toLocalDateKey.ts                   fecha → "2026-10-12" en hora local
    getWeekdayIndex.ts                  fecha → días desde el lunes (lunes = 0 … domingo = 6)
    getWeekStartForOffset.ts            hoy + semana (actual o próxima) → lunes de la semana a la vista
  constants/meal-planner.constants.ts   WEEK_OFFSET, MEAL_TYPE, MEAL_TYPES (orden), nombres de días y meses, textos
  specs/  SPEC.md · plan.md · tasks.md · E2E.md
  tests/  getWeekStart.test.ts · buildWeek.test.ts · formatWeekRange.test.ts · toLocalDateKey.test.ts
          useMealPlannerViewModel.test.ts · MealPlanner.page.ts · MealPlanner.test.tsx

components/recipes-tabs/
  RecipesTabs.tsx                       movido desde features/recipes/components/ (git mv); ahora son links
  models/RecipesTabsProps.interface.ts  movido igual

app/(app)/recetas/planificador/page.tsx   ruta delgada: solo renderiza <MealPlanner />
constants/routes.constants.ts             + APP_ROUTE.MEAL_PLANNER = "/recetas/planificador"
constants/recipes-tabs.constants.ts       RECIPES_TAB, RECIPES_TABS (ahora con href) movidos desde features/recipes/constants/
constants/index.ts                        + exporta recipes-tabs.constants
features/recipes/RecipeCatalog.tsx        importa RecipesTabs y RECIPES_TAB desde sus nuevos lugares
features/recipes/specs/                   se anota en el plan de recetas que los sub-tabs ya no viven ahí
e2e/features/meal-planner/                E2E-PLANNER-nn (ver E2E.md)
```

No se tocan `features/shopping-list/`, ni `types/database.types.ts`, ni `supabase/`.

## Datos

Ninguno. La pantalla no lee ni escribe en Supabase: todo sale del reloj del navegador y de los clics en las flechas.

### Fechas

Todo en hora local del navegador (SPEC regla 1). Con `new Date(año, mes, día)` y los getters locales (`getDay`, `getDate`), nunca con `toISOString()` para decidir un día (en Costa Rica daría el día siguiente después de las 6 p. m.).

- `getWeekStart(date)`: el lunes de la semana de `date`. `getDay()` devuelve 0 para domingo, así que el desfase al lunes es `(getDay() + 6) % 7` días hacia atrás. Un domingo pertenece a la semana que empezó el lunes anterior.
- `buildWeek(weekStart, today)`: 7 `WeekDay`, de `weekStart` en adelante, con `dateKey`, etiquetas corta y larga, `isToday` y los 3 espacios en el orden de `MEAL_TYPES`. Suma días con `new Date(año, mes, día + n)`: así un cambio de mes o de año, o un cambio de hora de verano, no desfasa nada.
- `formatWeekRange(weekStart)`: lunes y domingo ("12 – 18 oct"); repite el mes si cruza ("28 sep – 4 oct") y el año si cruza ("29 dic – 4 ene").
- `toLocalDateKey(date)`: `"2026-10-12"` armado con los getters locales. Es la clave que SCRUM-100 usará contra `meal_plans.date`.

## Flujo

1. `/recetas/planificador` → `page.tsx` → `MealPlanner` → `useMealPlannerViewModel`.
2. `useToday()` entrega el día local del navegador. En el servidor entrega `null` y la pantalla dibuja solo el encabezado y los sub-tabs; al hidratarse en el navegador pasa a la fecha real y dibuja la grilla.
3. El ViewModel guarda `weekOffset` (`current` por defecto). De ahí deriva: el lunes de la semana a la vista (`getWeekStart(hoy)` más 7 días si es `next`), la semana armada con `buildWeek`, el rango con `formatWeekRange`, la etiqueta y si cada flecha está deshabilitada.
4. Flecha adelante → `weekOffset = next`; flecha atrás → `current`. Si ya está en el extremo, el botón está deshabilitado y no hay nada que manejar.
5. `MealPlanner` conecta eso a `WeekSelector` y `WeekGrid`; `MealPlannerDay` y `MealSlot` solo dibujan.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Feature propia `features/meal-planner/` | Dentro de `features/recipes/` | documento-proyecto §4.9 pide el planificador como módulo propio y SCRUM-100/101 le suman tabla, flujo de asignar y agregar semana. Mezclarlo con recetas haría crecer una carpeta con dos responsabilidades (component-architecture §1) |
| Ruta `/recetas/planificador` | `/planificador` / parámetro en `/recetas` | Es un sub-tab de Recetas: la URL lo dice, el menú lateral ya marca "Recetas" activo por la regla de subrutas, y recargar o volver con "atrás" mantiene el tab |
| Sub-tabs en `components/recipes-tabs/` | Que el planificador importe de `features/recipes/` / duplicarlos | Ahora los usan dos pantallas: es el segundo consumidor que el plan de recetas pedía para promoverlos. Importar de otra feature ataría `meal-planner` a los detalles de `recipes`; duplicarlos dejaría dos barras que se desincronizan |
| 7 días, lunes a domingo | 5 días como el mockup | Decidido con el responsable: sigue el rango del título del mockup y no deja fuera los fines de semana |
| Flechas con el rango | Dos pestañas "Esta semana" / "Próxima semana" | Decidido con el responsable: no suma otra fila de navegación y no ofrece más semanas de las permitidas |
| `weekOffset` como unión `current` / `next` desde constantes | Un booleano `isNextWeek` / un número libre | Solo dos valores son válidos; la unión lo dice y un número libre permitiría semanas que la historia no pide |
| "Hoy" con `useSyncExternalStore` (servidor: `null`) | `useState(() => new Date())` / `useEffect` + `setState` | `useState` dibuja en el servidor una fecha y una zona horaria que no son las del usuario (desajuste de hidratación y un "hoy" que salta). `useEffect` + `setState` lo marca la regla `react-hooks/set-state-in-effect` (nextjs-enterprise-patterns §3). `useSyncExternalStore` es el mecanismo previsto para leer un valor del navegador sin ese problema |
| Nombres de días y meses en constantes | `Intl.DateTimeFormat("es-CR")` | Con `Intl` el texto depende de la versión de Node y del navegador; servidor y cliente podrían dibujar "oct" y "oct." distinto. Con constantes salen idénticos y se prueban sin entorno |
| Un solo HTML, disposición por CSS | Dos componentes (desktop y mobile) / medir el ancho en JS | Igual que el shell (SCRUM-135): sin parpadeo ni desajuste del servidor, y los 21 espacios no se duplican en el DOM |
| Espacio vacío como texto, no como botón | Botón deshabilitado | Un botón deshabilitado se anuncia como "no disponible" 21 veces. Texto es más simple y SCRUM-100 lo cambia a botón al darle una acción |
| Funciones puras para las fechas, sin librería | `date-fns` / `dayjs` | Son cuatro funciones de pocas líneas; una dependencia nueva para eso es lo que AGENTS.md pide evitar |
| `toLocalDateKey` y `MEAL_TYPE` ya en esta historia | Esperar a SCRUM-100 | Los dos son parte del contrato con `meal_plans`; definirlos acá evita que SCRUM-100 invente otra forma de la fecha o de los tipos de comida |

## Seguridad

- Sin datos remotos, sin formularios ni variables de entorno: la superficie es mínima.
- La ruta queda dentro de `app/(app)/`, igual que las demás pantallas privadas. Hoy esa protección es solo del lado del cliente (deuda conocida de SCRUM-135); esta historia no empeora nada porque la pantalla no muestra datos de nadie.
- No hay entrada de usuario que llegue a la URL ni al DOM: las etiquetas salen de constantes.

## Deuda conocida

- **Los espacios están vacíos hasta SCRUM-100** (esa deuda se cierra en la sección de esa historia más abajo). Es lo que HU-67 pide, pero conviene que se mergee cerca de SCRUM-100 para que el usuario no vea una pantalla "vacía" mucho tiempo.
- **El foco del teclado se pierde al pulsar una flecha**, porque queda deshabilitada (SPEC §9): un Tab para llegar a la otra. Arreglo posible: `aria-disabled` en el `Button` compartido.
- **La semana no se actualiza a medianoche** con la pantalla abierta (SPEC regla 9).
- **Sin household:** el calendario no sabe de quién es el plan. Cuando `meal_plans` use `household_id` (SCRUM-100) hay que decidir qué ve un usuario sin household.
- **Hora de verano:** Costa Rica no la usa, pero `buildWeek` suma días con `new Date(año, mes, día + n)` y no con milisegundos, así que tampoco falla donde sí exista.

---

## SCRUM-100: asignar receta, cocinero y porciones a un espacio

> **Verificado el 2026-10-09** contra `develop` (con SCRUM-99, 97, 98 y 66 mergeadas): `features/meal-planner/` tiene el calendario con los espacios vacíos, `recipes` solo se lee por `owner_id` (`006`), `household_members` solo deja leer la propia fila (`011`) y no existe la lista de miembros (HU-35), la última migración es la `017` y la `018` está en la PR #55 (SCRUM-67): esta historia usa la **`019`** o la siguiente libre al aplicarla (`supabase/README.md#migraciones`). No existe `meal_plans`.

### Archivos

```
features/meal-planner/
  MealPlanner.tsx                       + conecta el plan, el diálogo y el reintento de carga
  components/
    MealSlot.tsx                        ahora es un botón: vacío ("+ Almuerzo") o asignado (receta, cocinero, ×N)
    MealPlannerDay.tsx                  + pasa a cada espacio su asignación y el handler de abrir
    WeekGrid.tsx                        + deshabilita los espacios mientras el plan no está listo
    MealPlanLoadError.tsx               nuevo: mensaje de error de carga con "Reintentar"
    MealSlotDialog.tsx                  nuevo: Modal con título, receta, cocinero, multiplicador y acciones
    MealSlotRecipeList.tsx              nuevo: radiogroup de recetas (o vacío / error / cargando)
    MealSlotCookField.tsx               nuevo: "Yo" / "Sin cocinero"
    MealSlotServingsField.tsx           nuevo: contador ×0,5 a ×4 con las porciones resultantes
    models/…Props.(interface|type).ts   props de cada mini componente
  hooks/
    useMealPlannerViewModel.ts          + compone el plan y el diálogo (facade)
    useWeekMealPlan.ts                  nuevo: carga el plan de las dos semanas y aplica los cambios al estado
    useMealSlotDialog.ts                nuevo: el diálogo (reducer, cargar recetas, guardar, quitar)
  models/
    meal-plan.interfaces.ts             nuevo: MealPlanRow, MealPlanEntry, RecipeOption, SaveMealSlotPayload/Response, ViewModels
    meal-plan.types.ts                  nuevo: MealPlanState, MealSlotDialogState, MealSlotDialogAction, CookChoiceType
  services/
    meal-plan.service.ts                nuevo: getMealPlan(), saveMealSlot(), clearMealSlot(), getRecipeOptions()
  utils/
    toMealPlanEntry.ts                  fila de la base → entrada lista para la grilla (textos armados)
    toRecipeOption.ts                   fila de recipes → opción del diálogo
    meal-slot-dialog.reducer.ts         reducer puro + estado inicial del diálogo
    clampServingsMultiplier.ts          sube o baja el multiplicador dentro de ×0,5 a ×4
    formatMultiplier.ts                 2 → "×2", 0.5 → "×0,5"
    formatResultingServings.ts          12 y ×2 → "24 porciones"; 3 y ×0,5 → "1,5 porciones"
    toSlotKey.ts                        fecha + comida → clave para buscar una asignación en el plan
    upsertMealPlanEntry.ts              pone una entrada en el plan (reemplaza la del espacio o la agrega)
    removeMealPlanEntry.ts              saca la entrada de un espacio
    getPlanRange.ts                     hoy → lunes de la semana actual y domingo de la próxima (los 14 días a pedir)
    toCookLabel.ts                      elección de cocinero → "Yo" o nada
    buildMealPlanEntry.ts               lo crudo de un espacio → la entrada con sus textos ("Yo", "×2"): un solo lugar para leer el plan y para guardar
    toDecimalCommaText.ts               número → texto con coma decimal ("1,5")
    toMultiplierLabel.ts                multiplicador → "×2", o nada con ×1
    toSavedMealPlanEntry.ts             lo elegido + el id que devolvió la base → entrada para el estado (sin volver a pedir el plan)
    findSelectedRecipeOption.ts         receta elegida + opciones cargadas → la opción, o nada si la receta ya no está (se borró en otra pestaña)
    toInitialSlotValues.ts              entrada (o nada) → valores con que abre el diálogo
    toServingsSummaryText.ts            base + multiplicador → "×2 · 24 porciones"
    getMealSlotLabel.ts                 nombre accesible del espacio ("Almuerzo del lunes 12, vacío, asignar") y getMealSlotName
  constants/meal-planner.constants.ts   + estados, acciones, textos, límites del multiplicador, tablas y RPC

features/recipes/
  hooks/useRecipeDeletion.ts            + cuenta los espacios del plan al pedir eliminar
  services/recipes.service.ts           + countRecipeMealPlans()
  components/RecipeDeleteDialog.tsx     + muestra el aviso si la receta está en el plan
  models/recipe-deletion.*              + mealPlanCount en el estado y en el ViewModel
  constants/recipes.constants.ts        + textos del aviso y nombre de la tabla

supabase/migrations/019_meal_plans.sql  tabla, RLS, permisos por columna y RPC assign_meal_slot
supabase/tests/019_meal_plans.test.sql  prueba SQL con rollback
types/database.types.ts                 SOLO la entrada de meal_plans y assign_meal_slot (el resto lo regenera quien cierre el sprint)
docs/documento-proyecto.md              §6: meal_plans con owner_id y assigned_cook → auth.users
```

No se toca `features/shopping-list/`, ni `supabase/schema.sql`.

### Datos

Detalle de columnas, RLS y RPC en la [SPEC §12](SPEC.md#12-contratos-externos). Lo que importa del cómo:

**Migración `019_meal_plans.sql`:**

- Tabla `meal_plans` con las columnas de la SPEC; `unique (owner_id, date, meal_type) where household_id is null` (índice parcial, como el de la lista general en `004`).
- RLS activa y sin políticas por defecto. Políticas para `authenticated`: `select` y `delete` por `owner_id = (select auth.uid())` con `household_id is null`; `insert` y `update` con las mismas condiciones **y** `exists` sobre una receta propia (`update` con `using` y `with check`, como `007`).
- `revoke all … from public, anon, authenticated` y devolver solo `select`, `delete`, `insert` de las columnas del espacio y `update` de `recipe_id`, `assigned_cook` y `servings_multiplier` (un espacio no cambia de fecha ni de comida). `owner_id`, `household_id` y `created_at` quedan fuera (mismo criterio que `008`). Las políticas de `insert` y `update` exigen además que `assigned_cook` sea nulo o el propio usuario.
- Función `assign_meal_slot(...)` `security invoker`, `search_path` vacío, solo `authenticated`: valida sesión (`42501`), busca la receta (`P0002`), y hace `insert … on conflict (owner_id, date, meal_type) where household_id is null do update set recipe_id, assigned_cook, servings_multiplier`. `assigned_cook = case when cook_is_self then auth.uid() end`. Devuelve el id de la fila.
- Los `check` de la tabla (tipo de comida, multiplicador de 0,5 a 4 y múltiplo de 0,5) repiten lo que valida la pantalla.

**Leer el plan (`getMealPlan`)** — una sola petición para las dos semanas:

```
meal_plans(id, date, meal_type, assigned_cook, servings_multiplier,
           recipes(id, name, base_servings))
where date >= {lunes de la semana actual} and date <= {domingo de la próxima}
```

Sin `.eq("owner_id", …)`: lo hace RLS. El rango de fechas sale de `getWeekStartForOffset` y `toLocalDateKey` (SCRUM-99), así que "las dos semanas" siguen siendo las que dibuja la grilla.

**Recetas del diálogo (`getRecipeOptions`):** `recipes(id, name, base_servings)` ordenadas por nombre; sin filtro por dueño.

**Quitar (`clearMealSlot`):** `delete from meal_plans where date = … and meal_type = …`. RLS acota a lo propio.

**Aviso al eliminar una receta (`countRecipeMealPlans`, en `features/recipes/`):** `meal_plans` con `select("id", { count: "exact", head: true })` y `.eq("recipe_id", …)`: solo cuenta, no trae filas.

### Flujo

1. `/recetas/planificador` → `MealPlanner` → `useMealPlannerViewModel`, que ahora compone `useToday` + la semana elegida (SCRUM-99) + `useWeekMealPlan` + `useMealSlotDialog`.
2. **Cargar:** cuando se conoce "hoy" (`isReady`), `useWeekMealPlan` pide el plan de las dos semanas (`getMealPlan`) en un efecto con bandera de cancelación. Estado `loading` → `ready` con las entradas, o `error` (con "Reintentar").
3. **Dibujar:** `buildWeek` arma los días como antes; el ViewModel junta cada espacio con su entrada (`toSlotKey`) y la grilla dibuja el espacio como vacío o asignado. Mientras el plan no está `ready`, los espacios están deshabilitados.
4. **Abrir el diálogo:** tocar un espacio → `onSlotOpen({ dateKey, mealType })` → estado `editing`. Si hay una entrada, el formulario arranca con sus valores; si no, receta sin elegir, cocinero "Yo", ×1. En paralelo se piden las recetas (`getRecipeOptions`).
5. **Editar:** cada cambio es una acción del reducer (`recipeChosen`, `cookChanged`, `multiplierIncreased`, `multiplierDecreased`). Guardar y quitar usan la misma acción `saveStarted` (una petición en vuelo) y, si salen bien, `saveSucceeded`, que cierra el diálogo; el reducer no deja cerrarlo mientras la petición está en vuelo. El contador no pasa de ×0,5 ni de ×4. "Guardar" se habilita con una receta elegida.
6. **Guardar:** `saving` → `saveMealSlot` (RPC `assign_meal_slot`) → con éxito el hook del plan reemplaza o agrega la entrada en su estado y el diálogo se cierra; con `P0002` (la receta se borró) se muestra "Esa receta ya no existe. Elige otra." y se recargan las recetas; con otro error, `failed` con el mensaje y el formulario conservado.
7. **Quitar:** `saving` → `clearMealSlot` → con éxito se quita la entrada del estado y se cierra el diálogo.
8. **Cerrar:** "Cancelar", Escape o clic fuera → `closed` sin cambios (mientras guarda no se cierra). El foco vuelve al espacio que abrió el diálogo.
9. **Eliminar una receta (en `/recetas`):** `useRecipeDeletion.onDeleteRequest` abre el diálogo y pide `countRecipeMealPlans`; con N > 0 el diálogo muestra "Está en N espacios de tu plan; quedarán vacíos". Si el conteo falla, el diálogo se abre sin aviso. Al confirmar, el `delete` de la receta libera los espacios por `on delete cascade`.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Plan **personal** con `owner_id`, `household_id` nullable sin FK | Plan del household desde ya | Decidido con el responsable tras evaluarlo (SPEC §15): el household arrastra reescribir RLS de recetas, decisiones de producto abiertas y cuentas registradas para probar. Con esta estructura el cambio posterior es de base y de un servicio |
| RPC `assign_meal_slot` | `upsert` directo de PostgREST | PostgREST no puede apuntar `on conflict` a un índice parcial. La RPC hace el `insert … on conflict` con el predicado y valida adentro. Mismo patrón que `save_recipe` |
| `delete` directo para quitar | RPC `clear_meal_slot` | Es una sola sentencia ya atómica y RLS la acota; una RPC sería código sin hacer nada más (igual que borrar una receta) |
| El cliente manda `cook_is_self` (booleano) | Mandar el id del cocinero | El cliente nunca manda ids de usuario (security-practices): la base pone `auth.uid()`. Cuando existan los miembros, el parámetro pasa a ser un id validado contra `household_members` |
| `assigned_cook` → `auth.users` | → `household_members` como dice documento-proyecto §6 | Un usuario sin household no está en `household_members` y no podría asignarse a sí mismo. Se actualiza el documento en el mismo PR |
| Guardar el multiplicador | Guardar las porciones | Es lo que pide la tabla del documento, y las porciones se recalculan si la receta cambia sus porciones base |
| Un diálogo para asignar y reasignar, con "Quitar" solo si hay algo | Dos diálogos / un flujo por pasos | Son tres campos; "corto" es lo que pide la historia. Un solo componente y un solo reducer |
| Reducer para el diálogo | Varios `useState` | Varias acciones con reglas (límites del multiplicador, receta obligatoria, errores que se limpian); las reglas quedan en una función pura que se prueba sin React |
| Cargar el plan de las dos semanas de una vez | Una consulta por semana | Son 14 días como mucho; las flechas no esperan a la red y el estado es una sola lista |
| Hooks separados (`useWeekMealPlan`, `useMealSlotDialog`) compuestos por el ViewModel | Todo en `useMealPlannerViewModel` | Tres responsabilidades (semana, plan, diálogo): cada hook se lee solo (component-architecture §5, Facade), igual que `useRecipeDeletion` en recetas |
| Actualizar el estado local con el resultado de guardar o quitar | Volver a pedir el plan entero | Una petición menos y sin parpadeo; la base ya confirmó el cambio |
| Recetas leídas con una consulta propia de `meal-planner` | Importar `getRecipeSummaries` de `features/recipes/` | Esa trae ingredientes que el diálogo no usa, y ataría las dos features. Pedir `id, name, base_servings` es una línea |
| El aviso de eliminar cuenta con una consulta propia de `recipes` | Que `meal-planner` exporte una función | Ninguna feature importa de la otra: la de recetas lee `meal_plans` como lee `list_items`, solo para contar |
| `on delete cascade` en `recipe_id` | `restrict` | Decidido con el responsable: el espacio queda libre y el diálogo avisa. Con `restrict` habría que quitar la receta del plan antes, y cambiaría el flujo de eliminar ya mergeado |
| Espacio como `<button>` con nombre accesible completo | Un `<li>` con `onClick` | Un `<li>` no se enfoca con el teclado ni lo anuncia el lector; el nombre dice día, comida y acción |
| Sin confirmación al quitar | Diálogo de confirmación | No se pierde nada que no se rehaga en segundos, y la acción ya vive dentro de un diálogo explícito |

### Seguridad

- Tabla nueva con RLS: se pasa `security-reviewer` antes de `waiting qa` (toca RLS y una RPC).
- El control real es la base: `owner_id = auth.uid()` en todas las políticas, y la receta tiene que ser propia en `insert`/`update` (sin eso se podría colgar el id de una receta ajena y leer su nombre embebido desde el plan).
- El cliente solo manda fecha, tipo de comida, id de receta, `cook_is_self` y multiplicador. Nunca `owner_id`, `household_id` ni un id de usuario; las columnas que no son del espacio no se pueden escribir (permisos por columna).
- `assign_meal_slot` es `security invoker`: no puede hacer nada que el usuario no pueda hacer directo. Una receta ajena y una inexistente dan el mismo `P0002`.
- Los `check` rechazan un multiplicador fuera de rango o un tipo de comida inválido aunque se llame a la API directo.
- El `delete` directo de otra persona no borra nada (RLS no ve la fila) y no revela si existe.
- Riesgo a vigilar: si falta una política, un `delete` sin efecto no da error y el espacio parece quitado. Por eso el caso "recargar y sigue vacío" es obligatorio en la validación.

### Deuda conocida

- **Sin household:** el plan es personal. Los pasos para compartirlo están en SPEC §15.
- **Solo "Yo" como cocinero** hasta HU-35 (lista de miembros) y los perfiles.
- **Sin buscador** en la lista de recetas del diálogo: con muchas recetas hay que desplazarse.
- **La base acepta de 2020 a 2100:** la pantalla solo ofrece las dos semanas, pero la RPC no exige más que ese rango.
- **Un plan por usuario sin límite de filas por semana:** el índice único limita a 21 por semana. No hay límite de semanas guardadas, que crecen una por semana planificada.
- **El multiplicador sí escala las cantidades de la lista al agregar la semana** (SCRUM-101); agregar una receta suelta (SCRUM-97) sigue usando las porciones base.
- **El `Modal` compartido no atrapa el foco** (deuda ya anotada en recetas): con el teclado se puede salir del diálogo con Tab.

## SCRUM-101: agregar la semana a la lista

> **Verificado el 2026-10-10** contra `develop` (con SCRUM-99 y SCRUM-100 mergeadas): existen `meal_plans` y `assign_meal_slot` (019), el recorrido de ingredientes vive entero dentro de `add_recipe_to_general_list` (013, reemplazada por la 015 con el filtro de lo tachado), y la última migración aplicada es la `019`. La `018` es de la PR #55 y la `020` de otra rama: esta historia usa la **`021`** o la siguiente libre al aplicarla (`supabase/README.md#migraciones`).

### Archivos

```
supabase/
  migrations/021_add_week_to_list.sql       función interna add_week_ingredients_to_list (copia de las reglas con multiplicador) y RPC add_week_to_general_list; no modifica nada existente
  tests/021_add_week_to_list.test.sql       prueba con rollback (escala, mismo ingrediente en dos días, atómico, aislamiento, rango, equivalencia con la receta suelta)

features/meal-planner/
  MealPlanner.tsx                           + botón, diálogo y aviso
  components/
    WeekSelector.tsx                        + recibe el botón junto al rango (o se pone en MealPlanner, ver Decisiones)
    AddWeekToListButton.tsx                 nuevo: "Agregar semana a la lista", deshabilitado sin comidas
    AddWeekToListDialog.tsx                 nuevo: Modal de confirmación (cuántas comidas) con Agregar / Cancelar y el error
    AddWeekToListResult.tsx                 nuevo: aviso final (role="status"/"alert") con "Ver lista"
    models/…Props.(interface|type).ts       props de cada uno
  hooks/
    useWeekListAddition.ts                  nuevo: estado, abrir/confirmar/cancelar, llamada al servicio, una sola petición
    useMealPlannerViewModel.ts              + compone weekAddition (facade)
  models/
    week-list-addition.interfaces.ts        nuevo: payload, respuesta de la RPC, ViewModel, resumen
    week-list-addition.types.ts             nuevo: WeekListAdditionState / Action / Status
  services/
    week-list.service.ts                    nuevo: addWeekToList(): RPC + adapter
  utils/
    countWeekMeals.ts                       días a la vista + getEntry → cuántas comidas asignadas
    getWeekRange.ts                         días a la vista → lunes y domingo como claves
    toWeekAdditionSummary.ts                respuesta de la RPC → las líneas del aviso
    week-list-addition.reducer.ts           reducer puro + estado inicial
  constants/meal-planner.constants.ts       + estados, acciones, textos, nombre de la RPC

types/database.types.ts                     + add_week_to_general_list y add_week_ingredients_to_list (solo esas líneas)
docs/documento-proyecto.md                  + regla de "agregar la semana" y el multiplicador en la lista
```

### Datos

**Migración `021_add_week_to_list.sql`** (todas las funciones `security invoker`, `search_path` vacío, objetos con `public.`):

1. `add_week_ingredients_to_list(target_list_id uuid, target_recipe_id uuid, servings_multiplier numeric) returns jsonb`: **copia** del cuerpo del `for ingredient in …` de `add_recipe_to_general_list` (015), sin la sesión, la receta, la lista ni el bloqueo (los hace quien la llama). Cambia una sola cosa: `needed_quantity` es `ri.quantity_value * servings_multiplier`. Reusa sin cambios `pick_recipe_variant` y `add_units_to_list_item`. Devuelve `{ added, missing, skipped, processed }` (`processed`: nombres de todos los productos que entraron en la lista, sin los omitidos, para contar ingredientes distintos). Lleva un comentario que apunta a la función original y a la deuda de juntarlas.
2. **`add_recipe_to_general_list` no se toca.**
3. `add_week_to_general_list(week_from date, week_to date) returns jsonb`: sesión (`42501`); rango válido (`week_to >= week_from` y a lo más 7 días, `22023`); crear la lista general y tomar el bloqueo **una vez**; recorrer las filas de `meal_plans` del rango (`order by date, case meal_type when 'breakfast' then 1 when 'lunch' then 2 else 3 end`) llamando a la función interna con el multiplicador de cada fila; juntar los resultados. Devuelve `{ meals, ingredients, added, missing, skipped }`.
4. `grant execute … to authenticated` y `revoke … from public, anon` en las tres, como las demás del módulo.

La tabla `list_item_recipe_requirements` y `list_items` no cambian. Un espacio cuya receta ya no existe no está en `meal_plans` (cascade), así que no se recorre.

**Llamada desde el cliente:** `rpc("add_week_to_general_list", { week_from, week_to })` → `toWeekAdditionSummary()` → líneas del aviso. Una receta con más de 50 ingredientes dispara `22023` y el servicio lo trata como error general.

### Flujo

1. **Ver:** `useMealPlannerViewModel` ya tiene `days` (la semana a la vista) y `plan.getEntry`. `countWeekMeals(days, getEntry)` cuenta las comidas; el botón se habilita con ≥ 1 y el plan listo (regla 26).
2. **Abrir la confirmación:** `weekAddition.onOpen()` → `confirming` con el rango (`getWeekRange(days)`) y el número de comidas. Si ya hay un diálogo abierto (el de asignar), no se abre (misma guarda que SCRUM-100).
3. **Confirmar:** `onConfirm()` → `adding` → `addWeekToList({ fromDateKey, toDateKey })` con el candado de una sola petición. Éxito → cierra el diálogo y deja el resumen (`done`). Error → `failed` dentro del diálogo, que sigue abierto.
4. **Cancelar:** cierra sin llamar a nada; mientras agrega no se cierra.
5. **El aviso** queda debajo del encabezado hasta cambiar de semana o volver a agregar; el enlace "Ver lista" va a `APP_ROUTE.LIST`.
6. El plan **no se vuelve a pedir** (no cambió nada en `meal_plans`).

### Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Una RPC que recibe el rango y recorre `meal_plans` en la base | El cliente llama a `add_recipe_to_general_list` por cada espacio | No sería atómico (si falla la tercera, las dos primeras ya entraron), no podría multiplicar y haría hasta 21 viajes |
| Copiar las reglas 17 a 26 en una función interna nueva, con multiplicador, y no tocar la original (decidido el 2026-10-10) | Extraer el cuerpo y dejar `add_recipe_to_general_list` como envoltorio | El envoltorio reescribe en esta historia una función de SCRUM-97/66: el último `create or replace` aplicado gana y pisaría cambios de sus dueños. La copia no puede romper nada ajeno; su costo (dos copias que se pueden separar) queda como deuda y lo cubre la prueba de equivalencia |
| Una función con otro nombre | Agregarle un parámetro `multiplier` a la original | Cambiar la firma crea una sobrecarga que PostgREST no sabe resolver y mueve `database.types.ts` de una función de otras historias |
| Orden cronológico de los espacios | Sin orden | El resultado de las reglas 19 y 20 depende del orden en que se agregan; con un orden fijo es repetible y se puede probar |
| Los conteos suman por espacio (como SCRUM-97) | Sumar todo lo que pide un producto en la semana y redondear una vez | Mantiene el registro por receta que SCRUM-98 y el aviso usan; queda anotado como decisión abierta (SPEC §16.12) |
| Confirmar siempre, sin recordar en el navegador | La confirmación solo si ya se agregó (regla 27 de recetas) | Lo pidió el responsable; agregar la semana mueve muchas filas y no hay "tarjeta" que recuerde nada |
| El servicio vive en `meal-planner` | Ponerlo en `recipes` | La RPC es del plan: toma el rango de la pantalla del planificador. Las features no se importan entre sí |
| Reducer para el diálogo (5 estados con datos distintos) | `useState` por campo | Mismo criterio que el diálogo de asignar: reglas entre estados (no cerrar mientras agrega, una sola petición) |
| El botón va con el encabezado de la semana | Un botón por día | La historia pide un botón para la semana; con las flechas siempre hay una a la vista |

### Seguridad

- Se toca una función con escritura sobre `list_items` y `list_item_recipe_requirements` y se agrega otra: se pasa `security-reviewer` antes de `waiting qa` (RPC con escritura, refactor de una RPC mergeada).
- Todas son `security invoker`: RLS decide qué recetas, qué plan y qué lista ve el usuario. La RPC no recibe ids de usuario.
- El rango máximo de 7 días acota el trabajo de una llamada directa (hasta 21 espacios × 50 ingredientes) mientras la lista está bloqueada.
- La función interna queda con permiso para `authenticated`, como `pick_recipe_variant` y `add_units_to_list_item`: necesario para que otra función `security invoker` la llame y sin efecto extra, porque corre con los permisos del usuario.
- Nada existente cambia, así que las pruebas SQL de la 015 y la 017 y los tests de recetas no se afectan; se vuelven a correr al aplicar la 021 solo como comprobación. Riesgo a vigilar: las dos copias de las reglas 17 a 26 se separan (la prueba de equivalencia lo detecta si se corre).

### Deuda conocida

- **Sin sublistas de fecha (CA-03):** el destino es solo la lista general hasta HU-44 a HU-46 (Sprint 4).
- **Los conteos pueden sobrar** con presentaciones de varias unidades (SPEC §16.12).
- **Dos copias de las reglas 17 a 26** (`add_recipe_to_general_list` y `add_week_ingredients_to_list`): una corrección a una hay que hacerla en la otra. Cuando los dueños lo acuerden, la original puede llamar a la interna con multiplicador 1 y se borra la copia.
- **La función interna queda expuesta en la API** (mismo caso que las dos auxiliares de la 013).
- **El aviso no se guarda:** al recargar desaparece, igual que el de recetas.
