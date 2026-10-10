# Feature: Planificador semanal

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-99 / HU-67](https://tacha.atlassian.net/browse/SCRUM-99): ver el calendario semanal de comidas. Sprint 3.
- [SCRUM-100 / HU-68](https://tacha.atlassian.net/browse/SCRUM-100): asignar receta, cocinero y porciones a un espacio. Sprint 3, en curso.
- [SCRUM-101 / HU-69](https://tacha.atlassian.net/browse/SCRUM-101): agregar la semana completa a la lista. Sprint 3, en curso.

Esta spec cubre **SCRUM-99** (el calendario, mergeada), **SCRUM-100** (asignar, mergeada) y **SCRUM-101** (agregar la semana a la lista, [sección 16](#16-scrum-101-agregar-la-semana-a-la-lista)). El cómo (archivos, flujo, decisiones) está en [plan.md](plan.md); los pasos, en [tasks.md](tasks.md).

## 1. Objetivo

- **SCRUM-99:** que el usuario vea de un vistazo la semana en que está y la siguiente, dividida en días y comidas, como el lugar donde después va a planificar qué se cocina. Entregó **el calendario**, con los espacios vacíos.
- **SCRUM-100:** que el usuario pueda **planificar**: elegir qué receta se cocina en cada espacio, quién la cocina y para cuántas porciones, y verlo directo en la grilla. Puede cambiarlo o quitarlo cuando quiera.

## 2. Alcance

- Ruta propia `/recetas/planificador`, dentro del grupo privado de la app. Es el sub-tab **"Planificador semanal"** de la sección Recetas: la barra de sub-tabs pasa a ser de links y "Recetas" sigue yendo a `/recetas`.
- **Grilla de 7 días** (lunes a domingo) por **3 comidas** (desayuno, almuerzo, cena): siempre los 21 espacios. En SCRUM-99 todos vacíos; con SCRUM-100 los asignados muestran su receta.
- **Encabezado con el rango de la semana** ("12 – 18 oct") y dos flechas para pasar entre la **semana actual** y la **próxima**. Con la actual a la vista, la flecha de atrás está deshabilitada; con la próxima, la de adelante.
- El **día de hoy** se marca en la semana actual.
- **Mobile:** los mismos días apilados uno debajo de otro, en vez de la grilla.
- Un espacio vacío se ve como "+ Almuerzo" con borde punteado. En SCRUM-99 no hacía nada; desde SCRUM-100 es un botón que abre el diálogo de asignar.

### SCRUM-100: asignar

- Tocar un **espacio vacío** abre un **diálogo corto** para asignar: elegir una **receta** de las propias, el **cocinero** ("Yo" o "Sin cocinero") y el **multiplicador de porciones** (×0,5 a ×4, por defecto ×1).
- Un espacio **asignado** muestra en la grilla el **nombre de la receta**, el **cocinero** y el multiplicador si no es ×1. Tocarlo abre el mismo diálogo con sus valores: se puede **reasignar** o **quitar** (HU-68 CA-03).
- El plan se **guarda en la base** (`meal_plans`, migración nueva) y es **personal**: cada usuario ve y cambia solo el suyo. La estructura queda lista para el household (sección 15).
- Al **eliminar una receta** que está en el plan, el espacio queda libre y el diálogo de eliminar avisa cuántos espacios la usan (cierra el CA-02 de HU-64b / SCRUM-96).

Lo que no incluye está en la [sección 14](#14-casos-fuera-de-alcance).

## 3. Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Fecha de hoy | `Date`, en hora **local** del navegador | el reloj del navegador, tomada al montar la pantalla |
| Semana a ver | `current` / `next` | clic en las flechas; arranca en `current` |
| Espacio elegido | fecha (`"2026-10-12"`) + tipo de comida | toque en un espacio de la grilla (SCRUM-100) |
| Receta | id y nombre de una receta propia | lista del diálogo, leída de `recipes` (SCRUM-100) |
| Cocinero | "Yo" / "Sin cocinero" | selector del diálogo (SCRUM-100) |
| Multiplicador | número de ×0,5 a ×4 en pasos de 0,5 | contador del diálogo (SCRUM-100) |
| Plan de las dos semanas | filas de `meal_plans` con el nombre de su receta | `meal_plans` + `recipes`, leídos en la base (SCRUM-100) |

SCRUM-99 no leía nada de Supabase; desde SCRUM-100 el plan viene de la base.

## 4. Salidas

- La grilla de la semana elegida: 7 días con su nombre y número, y 3 espacios por día (vacíos o con su receta, SCRUM-100).
- El rango de la semana en el encabezado y las flechas con su estado.
- El día de hoy resaltado si la semana a la vista es la actual.

- **SCRUM-100:** una fila de `meal_plans` creada o reemplazada al guardar y borrada al quitar, y la grilla con el nombre de la receta, el cocinero y el multiplicador en cada espacio asignado. Si algo falla: mensaje de error dentro del diálogo, sin perder lo elegido.

SCRUM-99 no escribía nada en ninguna parte.

## 5. Reglas de negocio

1. **La semana va de lunes a domingo**, en la hora **local del navegador** y no en UTC: en Costa Rica (UTC-6) el "hoy" en UTC cambiaría a las 6 p. m. Mismo criterio que "Tachados hoy" de SCRUM-66.
2. **Solo hay dos semanas:** la que contiene a hoy (la actual) y la siguiente (la próxima). No se puede ir a semanas anteriores ni a más de una adelante (HU-67 CA-02).
3. **Arranca en la semana actual.**
4. La flecha de atrás está deshabilitada en la actual; la de adelante, en la próxima. Nunca se oculta una flecha: el usuario ve que existe y que no hay más.
5. **Cada día tiene 3 espacios** en este orden: desayuno, almuerzo, cena. Siempre se dibujan los tres, aunque estén vacíos (HU-67 CA-01: "hasta 3 espacios por día").
6. **Hoy** se resalta solo en la semana actual; en la próxima ningún día está resaltado.
7. **El rango del encabezado** muestra el día y el mes corto del lunes y del domingo: "12 – 18 oct". Si la semana cruza de mes se dice en los dos: "28 sep – 4 oct". Si cruza de año: "29 dic – 4 ene".
8. **Un espacio vacío no es interactivo** (ni botón ni link) hasta que exista el flujo de asignar (SCRUM-100). Sin controles muertos que confundan. *(Reemplazada por la regla 17 desde SCRUM-100.)*
9. **Hoy y la semana se calculan una vez, al abrir la pantalla.** Si pasa la medianoche con la pantalla abierta no se actualizan; se corrigen al recargar. No se justifica un temporizador para un caso así.
10. Los nombres de los días y de los meses vienen de constantes en español, no de `Intl`: así el servidor y el navegador dibujan exactamente el mismo texto.

### SCRUM-100

11. **Un espacio tiene a lo más una asignación:** una receta por día y comida (HU-67: "hasta 3 espacios por día"). Asignar sobre un espacio ocupado lo reemplaza; no se acumulan.
12. **El plan es personal** (decidido con el responsable): cada usuario ve, crea, cambia y quita solo sus asignaciones. Lo decide RLS en la base: el frontend nunca manda `owner_id` ni `household_id`. Así, cuando se sume el household (sección 15), la pantalla no cambia.
13. **Receta:** se elige entre las recetas del usuario (las que devuelve RLS), por orden alfabético. Una receta es obligatoria: "Guardar" está deshabilitado hasta elegirla. Sin recetas, el diálogo lo dice y lleva a `/recetas/nueva`.
14. **Cocinero:** "Yo" o "Sin cocinero", por defecto "Yo". La lista de miembros del household no existe todavía (HU-35, SCRUM-60), así que no hay otros cocineros que ofrecer. El cliente manda solo "yo sí/no"; el id del usuario lo pone la base.
15. **Multiplicador:** de ×0,5 a ×4 en pasos de 0,5, por defecto ×1. El diálogo muestra las porciones resultantes (porciones base × multiplicador: "12 porciones" con ×2 son "24 porciones"). La base repite el límite.
16. **Reasignar y quitar (CA-03):** tocar un espacio asignado abre el diálogo con su receta, cocinero y multiplicador. "Guardar" reemplaza la asignación; "Quitar" la borra y deja el espacio vacío. Quitar no pide confirmación: se deshace asignando otra vez y no se pierde nada que no se pueda rehacer en segundos.
17. **Un espacio vacío es un botón** que abre el diálogo de asignar, y un espacio asignado también (para reasignar o quitar). El nombre accesible dice qué hace: "Almuerzo del lunes 12, vacío, asignar" / "Almuerzo del lunes 12: Arroz con leche, cambiar".
18. **Lo que muestra un espacio asignado (CA-02):** el nombre de la receta, el cocinero ("Yo") y, si no es ×1, el multiplicador ("×2"). Un nombre largo se recorta con puntos suspensivos y el nombre completo está en el nombre accesible.
19. **Todo o nada y sin dobles:** guardar y quitar son una sola operación en la base. Un doble clic en "Guardar" o "Quitar" manda una sola petición.
20. **Cualquier día de las dos semanas se puede asignar**, también los días de la semana actual que ya pasaron (para anotar lo que se cocinó). La pantalla solo ofrece las dos semanas visibles; la base acepta de 2020-01-01 a 2100-12-31 (check `meal_plans_date_in_range`, en la migración 019) y rechaza el resto, incluidos `infinity` y `-infinity`. Ese rango es también el tope de filas por usuario: con una fila por día y comida, 88.755 como máximo.
21. **El plan se carga una vez para las dos semanas** al abrir la pantalla, no al cambiar de semana: las flechas no hacen una consulta.
22. **Receta borrada (contrato de SCRUM-96, SPEC de recetas §15):** al eliminar una receta, sus espacios del plan quedan **libres** (`on delete cascade`). El diálogo de eliminar avisa cuántos espacios la usan ("Está en 3 espacios de tu plan; quedarán vacíos") antes de confirmar. Si no se pudo contar, el diálogo se abre sin el aviso y borrar sigue funcionando.
23. **Receta editada:** el plan guarda el id de la receta, no una copia. Si se cambia su nombre o sus porciones base, la grilla y las porciones resultantes se actualizan solas la próxima vez que se carga. El plan no guarda cantidades.
24. **Sin household por ahora:** `household_id` queda nullable y sin FK, igual que `lists` y `recipes`.

## 6. Estados

| Pantalla | Estado | Notas |
|---|---|---|
| Planificador | `weekOffset`: `current` · `next` | Una unión derivada de constantes, no un booleano. En SCRUM-99 no hay estados de carga ni error porque no hay datos remotos; con SCRUM-100 el plan sí se lee de la base (filas de abajo) |
| Plan (SCRUM-100) | `loading` · `error` · `ready` | Se carga una vez para las dos semanas. `ready` sin asignaciones es el plan vacío, no un estado aparte. Mientras carga o si falla, la grilla se dibuja con los espacios vacíos y deshabilitados: no se afirma que "no hay nada planeado" sin saberlo |
| Diálogo de asignar (SCRUM-100) | `closed` · `editing` · `saving` · `failed` | `editing`, `saving` y `failed` siempre llevan el espacio elegido y los valores del formulario. Un solo diálogo a la vez |

"Hoy" es un valor del navegador: hasta que se conoce (antes de la hidratación) la pantalla no dibuja la grilla, para no mostrar un día resaltado que luego cambie (regla 10 y plan.md).

## 7. Errores

SCRUM-99: no aplica; la pantalla no llamaba a ningún servicio. Las flechas deshabilitadas son el único "límite" y no son un error.

SCRUM-100:

| Error | Cómo se muestra |
|---|---|
| Falla de red o de Supabase al cargar el plan | "No se pudo cargar tu plan. Intenta de nuevo." sobre la grilla, con "Reintentar". Los espacios quedan vacíos y deshabilitados (no se dice "no hay nada planeado") |
| Falla al guardar | "No se pudo guardar la comida. Intenta de nuevo." dentro del diálogo, que sigue abierto con lo elegido |
| Falla al quitar | "No se pudo quitar la comida. Intenta de nuevo." dentro del diálogo |
| La receta elegida se borró en otra pestaña | "Esa receta ya no existe. Elige otra." dentro del diálogo; la lista de recetas se recarga |
| El usuario no tiene recetas | "Todavía no tienes recetas." con el link "Crear una receta"; "Guardar" deshabilitado |
| Falla al cargar las recetas del diálogo | "No se pudieron cargar tus recetas. Intenta de nuevo." con "Reintentar"; "Guardar" deshabilitado |

## 8. UI esperada

- Encabezado con "Recetas", como en el catálogo, y debajo los **sub-tabs** "Recetas" / "Planificador semanal", con el segundo activo.
- Debajo, el **selector de semana**: flecha atrás, el rango ("12 – 18 oct") y flecha adelante. Con un texto de apoyo que dice cuál es: "Esta semana" o "Próxima semana".
- Desktop (`md` en adelante): grilla de 7 columnas, una por día. Cada columna tiene la etiqueta del día ("Lun 12") y debajo los 3 espacios.
- Mobile: los 7 días apilados, cada uno con su etiqueta ("Lunes 12") y debajo sus 3 espacios.
- Espacio vacío: caja con borde punteado y el texto "+ Desayuno", "+ Almuerzo" o "+ Cena".
- El día de hoy con la etiqueta en teal, como en el mockup (`docs/mockup-web-v2.html`).
- **SCRUM-100:** espacio vacío = botón con borde punteado y "+ Almuerzo". Espacio asignado = botón con borde sólido que muestra la etiqueta de la comida en mayúsculas pequeñas ("ALMUERZO"), el nombre de la receta (una línea, recortada), debajo "Yo" o nada si no hay cocinero, y un chip "×2" si el multiplicador no es ×1.
- **SCRUM-100:** diálogo (`Modal` compartido) con título "Asignar comida" o "Cambiar comida" y debajo el día y la comida ("Almuerzo del lunes 12"). Contiene: la lista de recetas (una opción por receta, con sus porciones base), el selector de cocinero ("Yo" / "Sin cocinero"), el contador del multiplicador con su resultado ("×2 · 24 porciones"), y las acciones "Guardar", "Quitar" (solo en un espacio asignado) y "Cancelar". "Guardando…" con los botones deshabilitados mientras guarda.
- **SCRUM-100:** el diálogo de eliminar receta suma, si la receta está en el plan, el aviso con el número de espacios.
- El mismo HTML sirve para desktop y mobile: solo cambia la disposición con CSS (`md:grid` / apilado), igual que el shell, sin medir el ancho en JS.

## 9. Accesibilidad

- Las flechas son botones con nombre ("Semana anterior" / "Semana siguiente"); deshabilitadas, el lector de pantalla las anuncia como no disponibles.
- El encabezado con el rango tiene `aria-live="polite"`: al pasar de semana el lector anuncia la nueva ("Próxima semana, 19 – 25 oct") sin que el usuario tenga que buscarla.
- La grilla es una lista de días (`<ul>` de `<li>`), y cada día contiene su lista de espacios. Cada día lleva su fecha en un `<time datetime="2026-10-12">`.
- El día de hoy lleva `aria-current="date"`: se dice con semántica, no solo con el color.
- ~~Un espacio vacío es texto, no un botón.~~ Reemplazado en SCRUM-100: los espacios son botones (ver abajo). El "+" es decorativo (`aria-hidden`).
- Los sub-tabs ya anuncian la página activa con `aria-current="page"`.
- **SCRUM-100:** los espacios son botones con nombre completo ("Almuerzo del lunes 12, vacío, asignar" / "Almuerzo del lunes 12: Arroz con leche, cambiar"), así que el lector sabe qué día, qué comida y qué pasa al tocarlos. El "+" es decorativo.
- **SCRUM-100:** el diálogo es `role="dialog"` con `aria-modal`, título y cierre con Escape (comportamiento del `Modal` compartido). Las recetas son un grupo de opciones (un `fieldset` con `legend` y radios, rol `group`) con la receta elegida marcada; el cocinero, otro grupo igual. El contador del multiplicador tiene botones "Menos porciones" / "Más porciones" y el valor se anuncia ("×2, 24 porciones") con `aria-live="polite"`. Los errores del diálogo son `role="alert"`.
- **SCRUM-100:** al cerrar el diálogo el foco vuelve al espacio que lo abrió. Al guardar o quitar, el espacio muestra su nuevo estado.
- **Límite conocido (revisión de código, 2026-10-09):** al pulsar una flecha esta queda deshabilitada (`disabled` nativo del `Button` compartido) y el foco del teclado se pierde: en Chrome pasa al `body`. Quien navega con teclado tiene que volver a tabular hasta la otra flecha. Se acepta porque con solo dos semanas el costo es de un Tab, y arreglarlo bien exige mover el foco a la otra flecha desde un componente de presentación (refs) o sumar `aria-disabled` al `Button` compartido, que usan otras features. Si se decide arreglar, lo natural es `aria-disabled` en el `Button` con el clic ignorado cuando está "deshabilitado".

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind CSS con los tokens `tacha-*`.
- La lógica vive en el ViewModel (`hooks/`) y los `.tsx` solo presentan (component-architecture §3).
- Cero literales: textos, nombres de días y meses, tipos de comida, desplazamientos de semana y rutas en `constants/` (constants-standards).
- Las fechas se calculan con funciones puras en `utils/` (`getWeekStart`, `buildWeek`, `formatWeekRange`), sin librerías de fechas.
- Un solo ViewModel para la pantalla (`useMealPlannerViewModel`); "hoy" sale de un hook aparte (`useToday`) con `useSyncExternalStore`, para que el servidor no dibuje una fecha que el navegador contradiga.
- La ruta es delgada: `app/(app)/recetas/planificador/page.tsx` solo renderiza la feature.
- Los sub-tabs de Recetas los usan ahora dos pantallas (catálogo y planificador): pasan a `components/recipes-tabs/` (segundo consumidor real, project-structure) y son links.
- **SCRUM-100:** los cambios del plan los decide la base (RLS y `check`), no el cliente: la receta, el cocinero y el multiplicador se validan allá aunque la pantalla también los limite (security-practices §3). El cliente nunca manda `owner_id`, `household_id` ni un id de usuario.
- **SCRUM-100:** guardar es una RPC (un `insert … on conflict` con una clave parcial, que PostgREST no sabe hacer directo); quitar es un `delete` directo, que ya es atómico.
- **SCRUM-100:** el diálogo tiene su propio ViewModel y reducer (varias acciones con reglas: elegir receta, cambiar cocinero, subir o bajar el multiplicador con límites, guardar, quitar). Mutaciones con `Payload` y `Response` explícitos (nextjs-enterprise-patterns §4).
- **SCRUM-100:** `features/meal-planner/` no importa de `features/recipes/`: lee las recetas con su propia consulta (id, nombre y porciones base). El aviso del diálogo de eliminar receta cuenta los espacios con una consulta propia de `features/recipes/`; ninguna feature depende de la otra por código.
- Sin librerías nuevas.
- Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `nextjs-enterprise-patterns`, `clean-code-practices`, `unit-testing-standards`, `playwright-e2e`, `security-practices` (SCRUM-100: tabla nueva con RLS), `gitflow`.

## 11. Dependencias

- `@/constants`: `APP_ROUTE` (se agrega la ruta del planificador).
- `@/components/ui`: `Button` (las flechas).
- `components/recipes-tabs/` (movido desde `features/recipes/components/RecipesTabs.tsx`).
- `components/app-shell/`: ya marca "Recetas" activo en `/recetas/planificador` por su regla de subrutas (SCRUM-135); no cambia.
- **SCRUM-99:** ninguna tabla, RPC ni política de Supabase.
- **SCRUM-100:** `recipes` y `recipe_ingredients` (migraciones `006` a `010`; solo se leen el id, el nombre y las porciones base), `auth.users` (referencia del cocinero) y `services/supabase.client.ts` (`getSupabaseClient`, `ensureSession`). `@/components/ui`: `Modal`, `Button`, `Spinner`. `features/recipes/`: el diálogo y el hook de eliminar se extienden con el aviso (regla 22).

## 12. Contratos externos

SCRUM-99 no tenía contratos externos. Dos cosas que dejó resueltas para SCRUM-100 y 101:

- **Tipos de comida:** `MEAL_TYPE` (desayuno / almuerzo / cena), en `features/meal-planner/constants/`. `meal_plans.meal_type` (documento-proyecto §6) tiene que usar estos mismos valores.
- **Fechas:** `toLocalDateKey(date)` devuelve `"2026-10-12"` en hora local. `meal_plans.date` guarda un `date` (sin hora ni zona), así que SCRUM-100 compara contra esa misma clave.

### Plan semanal (SCRUM-100)

- **Tabla nueva `meal_plans`** (migración nueva: la `018` es de la PR #55 de SCRUM-67, así que sería la `019` o la siguiente libre al aplicarla, según `supabase/README.md#migraciones`):
  - `id`, `owner_id` (→ `auth.users`, default `auth.uid()`, `on delete cascade`), `household_id` (nullable, sin FK hasta que el household se integre), `date` (`date`), `meal_type` (`breakfast` / `lunch` / `dinner`), `recipe_id` (→ `recipes`, `on delete cascade`), `assigned_cook` (nullable, → `auth.users`, `on delete set null`), `servings_multiplier` (`numeric`), `created_at`.
  - `check`: `meal_type` en los tres valores; `servings_multiplier` de 0,5 a 4 y múltiplo de 0,5.
  - `unique (owner_id, date, meal_type) where household_id is null`: un solo espacio por día y comida en el plan personal (regla 11). Es un índice parcial, igual que la lista general de `004`; cuando exista el plan de household se suma otro por `(household_id, date, meal_type)`.
  - Índices en `recipe_id` y `assigned_cook`, que usan las cascadas y las FK.
- **RLS** (nace activado, deny por defecto), todo sobre `owner_id = auth.uid()` y `household_id is null`:
  - `select`, `delete`: filas propias;
  - `insert`, `update`: filas propias **y** receta propia (`exists` sobre `recipes`, que ya pasa por su RLS): sin eso alguien podría colgar el id de una receta ajena y leer su nombre embebido.
  - `assigned_cook` solo puede ser nulo o el propio usuario (en `insert` y `update`): sin eso, con el permiso de columna, alguien podría poner a otro usuario como cocinero. Cuando existan los miembros, esta condición se amplía.
  - `anon` sin permisos de tabla. `authenticated`: `select`, `delete`, `insert` de las columnas del espacio (`date`, `meal_type`, `recipe_id`, `assigned_cook`, `servings_multiplier`) y `update` solo de `recipe_id`, `assigned_cook` y `servings_multiplier`: un espacio no se mueve de fecha ni de comida. `owner_id`, `household_id` y `created_at` no se pueden fijar a mano (mismo criterio que `008`).
- **RPC nueva `assign_meal_slot(slot_date date, slot_meal_type text, target_recipe_id uuid, cook_is_self boolean, slot_servings_multiplier numeric) returns uuid`:** `security invoker` y `search_path` vacío, como `save_recipe`. Crea o reemplaza el espacio (`insert … on conflict … do update`). El cocinero sale de `cook_is_self ? auth.uid() : null`: el cliente no manda ids de usuario. Sin sesión, `42501`; receta no encontrada (inexistente, ajena o borrada), `P0002`.
- **Quitar:** `delete` directo de `meal_plans` por fecha y comida (PostgREST), sin RPC. Si RLS oculta la fila no se borra nada y no hay error.
- **Leer:** una consulta de PostgREST con la receta embebida, `meal_plans?select=…,recipes(id,name,base_servings)&date=gte.<lunes de la semana actual>&date=lte.<domingo de la próxima>`. Sin filtro por dueño: lo hace RLS.
- **Recetas para el diálogo:** `recipes?select=id,name,base_servings&order=name`. Sin filtro por dueño (RLS).
- **Aviso al eliminar una receta:** `meal_plans?select=id&recipe_id=eq.<id>` con conteo exacto (`head`), solo para leer cuántas filas usan la receta.
- **Navegador:** no guarda nada.
- **`docs/documento-proyecto.md` §6** se actualiza en este mismo PR: `meal_plans` lleva `owner_id` (plan personal), `assigned_cook` apunta a `auth.users` y no a `household_members` (hasta que existan los perfiles y la lista de miembros), y el borrado de una receta libera sus espacios.

## 13. Casos de aceptación

### HU-67 (SCRUM-99)

- [x] CA-01: `/recetas/planificador` muestra una grilla de 7 días por 3 comidas (desayuno, almuerzo, cena); cada día tiene sus 3 espacios. (navegador en desktop y mobile; E2E-PLANNER-02)
- [x] CA-02: con las flechas se pasa de la semana actual a la próxima y de vuelta; no hay más semanas. (navegador; E2E-PLANNER-03)
- [x] La semana a la vista empieza en lunes y termina en domingo. Con hoy en domingo, la semana actual es la que termina hoy (lunes anterior a hoy). (el domingo, en `getWeekStart.test.ts` y `useMealPlannerViewModel.test.ts`: la fecha real de la prueba era viernes)
- [x] La pantalla arranca en la semana actual, con "Esta semana" y el rango correcto.
- [x] Con la semana actual a la vista, la flecha de atrás está deshabilitada; con la próxima, la de adelante.
- [x] Hoy aparece resaltado en la semana actual y en ningún día de la próxima.
- [x] Una semana que cruza de mes muestra el mes en las dos puntas del rango ("28 sep – 4 oct"); una que cruza de año, también ("29 dic – 4 ene"). (en `formatWeekRange.test.ts` y `buildWeek.test.ts`: con la fecha real de la prueba ninguna de las dos semanas cruza de mes)
- [x] Un espacio vacío muestra "+ Almuerzo". ~~No es botón ni link~~ Reemplazado en SCRUM-100: ahora es un botón que se enfoca con Tab y abre el diálogo (E2E-PLANNER-02 cuenta los 21 botones).
- [x] El sub-tab "Planificador semanal" está activo y habilitado en la pantalla; "Recetas" lleva a `/recetas`; en `/recetas` el sub-tab del planificador ya no dice "Próximamente" y lleva a `/recetas/planificador`.
- [x] El ítem "Recetas" del menú lateral sigue activo en `/recetas/planificador`.
- [x] En mobile los días se apilan y no hay desplazamiento horizontal.
- [x] Recargar `/recetas/planificador` vuelve a la semana actual (la semana a la vista no se guarda).
- [x] El día de hoy se calcula en hora local: con la hora del navegador después de las 6 p. m. en UTC-6 sigue siendo el día local. (en `toLocalDateKey.test.ts` con zona America/Costa_Rica; no se reprodujo en el navegador)

### HU-68 (SCRUM-100)

- [x] CA-01: tocar un espacio vacío abre el diálogo; se elige una receta de las propias, el cocinero ("Yo" / "Sin cocinero") y el multiplicador, y al guardar el espacio queda asignado.
- [x] CA-02: un espacio asignado muestra en la grilla el nombre de la receta, el cocinero y, si no es ×1, el multiplicador; sigue ahí al recargar.
- [x] CA-03: tocar un espacio asignado abre el diálogo con sus valores; "Guardar" lo reasigna y "Quitar" lo deja vacío; ninguno de los dos pide confirmación.
- [x] "Guardar" está deshabilitado hasta elegir una receta.
- [x] El multiplicador va de ×0,5 a ×4 en pasos de 0,5, y sus botones se deshabilitan en los extremos; el diálogo muestra las porciones resultantes.
- [x] Asignar sobre un espacio ocupado lo reemplaza (no quedan dos recetas en el mismo espacio).
- [x] Un usuario sin recetas ve "Todavía no tienes recetas." con el link a `/recetas/nueva` y no puede guardar.
- [x] Falla de red al guardar: el diálogo muestra el error, sigue abierto con lo elegido, y se puede reintentar.
- [x] Falla de red al cargar el plan: mensaje con "Reintentar" y los espacios vacíos deshabilitados, sin decir que no hay nada planeado.
- [x] Doble clic en "Guardar" o en "Quitar": una sola petición.
- [x] Cambiar de semana con las flechas no hace una consulta nueva y conserva lo asignado de cada semana.
- [x] Cambiar el nombre o las porciones base de una receta se refleja en la grilla al recargar.
- [x] Eliminar una receta que está en 2 espacios del plan: el diálogo avisa "Está en 2 espacios de tu plan"; al confirmar, esos espacios quedan vacíos al recargar.
- [x] Eliminar una receta que no está en el plan: el diálogo no dice nada del plan.
- [x] Receta borrada en otra pestaña antes de guardar: "Esa receta ya no existe. Elige otra.", y la lista del diálogo se recarga.
- [x] Otra sesión no ve ni cambia el plan de otro usuario, ni puede asignar una receta ajena (SQL con `role authenticated` y dos usuarios: 0 filas visibles y `P0002`).
- [x] El cliente no puede fijar `owner_id` ni el cocinero de otro usuario (la RPC ignora cualquier id; el `insert` directo se rechaza por permisos de columna).
- [x] Un multiplicador fuera de rango (0, 0,3, 5) se rechaza en la base aunque se llame a la RPC directo.
- [x] El foco vuelve al espacio al cerrar el diálogo y los espacios tienen nombre accesible completo.

### Todas

- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` pasan.

## 14. Casos fuera de alcance

- **Elegir como cocinero a otro miembro del household:** necesita la lista de miembros con nombre (HU-35 / SCRUM-60, sin PR) y los perfiles. El selector ya está hecho para sumarlos.
- **Plan compartido del household y recetas compartidas:** evaluado y no incluido; ver la sección 15 para el porqué y los pasos.
- **Buscador o filtros en la lista de recetas del diálogo:** la lista es corta por ahora; si crece, un campo de búsqueda por nombre.
- **Mover o copiar una comida a otro espacio** (arrastrar, "repetir el lunes"): no lo pide la historia.
- **Notas por comida, ingredientes extra o recetas sueltas sin cargar al catálogo:** no están en la historia.
- **Aviso si se asigna una receta con ingredientes que no están en la lista:** "qué falta" del plan es una historia propia.
- **Bloquear días pasados o fechas fuera de las dos semanas en la base:** la pantalla solo ofrece las dos semanas; la base acepta de 2020-01-01 a 2100-12-31 (regla 20).
- **"Agregar semana a la lista":** HU-69 (SCRUM-101); ver la [sección 16](#16-scrum-101-agregar-la-semana-a-la-lista).
- **"Qué falta" del plan semanal** (documento-proyecto §4.9): historia propia, más adelante.
- **Navegar a semanas pasadas o a más de una semana adelante:** la historia pide solo actual y próxima.
- **Botón "Hoy" o saltar a una fecha:** con dos semanas no hace falta.
- **Guardar la semana elegida** (en la URL o en el navegador): al recargar vuelve a la actual (regla 3).
- **Planificar por household o con zona horaria del household:** el calendario usa la hora del navegador. Cuando exista el plan compartido se revisa.
- **Actualizar el calendario si pasa la medianoche con la pantalla abierta** (regla 9).
- **Recordatorios o notificaciones de comidas.**

## 15. Notas de implementación

- **Cómo se llenaron los huecos de HU-67 (SCRUM-99, decidido con el responsable el 2026-10-09).** La historia no dice cuántos días tiene la grilla, cómo se navega, qué hace un espacio vacío ni dónde vive. Se decidió:
  - **7 días, lunes a domingo.** El mockup (`mockup-web-v2.html`) dibuja 5 columnas aunque su título dice "Semana del 11-17 ago"; se siguió el rango del título y no las 5 columnas, para no dejar fuera los fines de semana, donde se cocina más;
  - **flechas con el rango** en vez de dos pestañas "Esta semana" / "Próxima semana": se parece al título del mockup y no ofrece semanas que la historia no permite;
  - **espacio vacío sin acción**: se ve como en el mockup ("+ Cena", borde punteado) pero no es botón hasta SCRUM-100;
  - **feature propia `features/meal-planner/`** y ruta propia `/recetas/planificador`: documento-proyecto §4.9 pide que el planificador sea un módulo separado del de recetas, y SCRUM-100 y 101 lo van a hacer crecer (tabla, flujo de asignar, agregar semana).
- **Los sub-tabs pasan a `components/recipes-tabs/`.** Antes vivían en `features/recipes/components/RecipesTabs.tsx` porque tenían un solo consumidor y el planificador no existía (`plan.md` de recetas, decisión "Tabs dentro de la feature": "se promueve cuando exista el planificador"). Es ese momento. Se mueve con `git mv` y se actualiza el import del catálogo.
- **"Hoy" y la hidratación.** La página se prerrenderiza en el servidor, donde "hoy" y la zona horaria no son los del usuario. Si el servidor dibujara una fecha y el navegador otra, React avisaría de un desajuste y el día resaltado saltaría. Por eso "hoy" sale de `useSyncExternalStore` con un valor nulo en el servidor, y la grilla se dibuja desde el navegador.
- **Documentos del producto (SCRUM-99):** no cambiaba ninguna decisión de producto ni el modelo de datos, así que `docs/documento-proyecto.md` no se tocó. SCRUM-100 sí lo cambia (sección 12).
- **Cómo se llenaron los huecos de HU-68 (SCRUM-100, decidido con el responsable el 2026-10-09).** La historia no dice de quién es el plan, cómo se elige un cocinero que todavía no se puede listar, qué rango tiene el multiplicador ni qué pasa al borrar una receta asignada:
  - **plan personal con estructura lista para el household** (ver abajo);
  - **cocinero "Yo" / "Sin cocinero"**; los miembros se suman al mismo selector cuando exista HU-35. `assigned_cook` apunta a `auth.users` y no a `household_members` como decía documento-proyecto §6, porque un usuario sin household no está en `household_members` y no podría asignarse a sí mismo;
  - **multiplicador ×0,5 a ×4 en pasos de 0,5** y se guarda el multiplicador (como pide la tabla), no las porciones;
  - **receta borrada: el espacio queda libre** (`on delete cascade`) y el diálogo de eliminar avisa cuántos espacios usa. Cierra el CA-02 de HU-64b (SCRUM-96), que la SPEC de recetas §15 dejó para esta historia.
- **Fusionar recetas y plan semanal al household: evaluado, no incluido (pedido del responsable, 2026-10-09).** Se examinó si se podía hacer en esta historia. Es posible, pero no entra por tamaño y por lo que arrastra:
  - *Qué habría que hacer* (los pasos 1 a 6 de "Integración con households" del plan de recetas, más lo del plan):
    1. FK de `recipes.household_id` y `meal_plans.household_id` → `households(id)`;
    2. una función de membresía `security definer` con `search_path` vacío (por ejemplo `current_household_id()`) para que las políticas no se llamen a sí mismas;
    3. políticas de lectura para miembros en `recipes`, **reescribir** la de `recipe_ingredients` (hoy filtra por `owner_id`) y políticas de miembros en `meal_plans`;
    4. un camino para que una receta pase a ser del household: hoy `household_id` es de solo lectura para el cliente (`008`) y el insert exige `household_id is null`; hace falta el selector "personal / del household" en el editor (HU-64 CA-04) y un parámetro nuevo en `save_recipe`;
    5. un índice único por `(household_id, date, meal_type)` y la regla de quién cambia el plan compartido;
    6. el selector de cocineros con los miembros (HU-35 y perfiles con nombre y foto);
    7. excluir a los usuarios anónimos (claim `is_anonymous`).
  - *Por qué no ahora:*
    - cruza módulos de otras personas (households de Laura, recetas ya mergeadas, listas de Marcos) y reescribe políticas RLS de tablas que ya están en producción;
    - tiene decisiones de producto abiertas que no son de esta historia: quién puede editar o borrar una receta compartida, qué pasa con las recetas de alguien que sale del household, y si un plan compartido lo cambia cualquiera o solo el admin;
    - no hay de dónde sacar los nombres de los miembros (HU-35 no está), así que la parte visible más importante (elegir al cocinero) no se podría probar;
    - no se puede probar de punta a punta: crear un household y entrar a otro piden cuentas registradas (contraseña y reCAPTCHA), que el E2E no maneja, y QA necesitaría dos cuentas reales;
    - la historia vale 5 puntos y esto sería de por sí una historia más grande.
  - *Qué se deja hecho para que sea un cambio pequeño después:* `household_id` nullable y sin FK, el índice único parcial (como el de la lista general en `004`), el cocinero como columna `uuid`, el selector de cocinero con una sola fuente de opciones, todo el acceso por RLS y no por filtros del cliente, y la pantalla sin saber de quién es el plan. Cuando se haga, el cambio es de base y de un servicio; la pantalla y los textos no cambian.
- **La RPC y no un `upsert` directo.** PostgREST no puede usar el índice parcial `where household_id is null` como destino de `on conflict`; una RPC hace el `insert … on conflict` con el predicado y valida adentro. Quitar sí es un `delete` directo, que ya es atómico (igual que borrar una receta).
- **El diálogo.** Es un `Modal` único con receta, cocinero y multiplicador, no un flujo por pasos: son tres campos y "corto" es lo que pide la historia. El diálogo de asignar y el de reasignar son el mismo, con "Quitar" solo si ya hay algo.
- **Contrato con SCRUM-101 (cumplido).** Agregar la semana recorre las filas de `meal_plans` de la semana. SCRUM-97 usa las porciones base y no escala; SCRUM-101 decidió que **sí se multiplican** por el multiplicador del espacio, así que la lógica de `add_recipe_to_general_list` pasa a una función interna con multiplicador (sección 16.9).

## 16. SCRUM-101: agregar la semana a la lista

Decidido con el responsable el 2026-10-10 (las seis preguntas que la historia no cierra): un botón que actúa sobre **la semana a la vista**; destino fijo en la **lista general**, con las sublistas como pendiente; las cantidades se **multiplican** por el multiplicador de cada espacio; la misma receta cuenta **una vez por espacio**; **confirmación** antes de agregar y aviso con el número de ingredientes y el enlace "Ver lista"; con la semana vacía el botón se **deshabilita**.

### 16.1 Alcance

- Un botón **"Agregar semana a la lista"** en el planificador. Actúa sobre la **semana que está a la vista** (la actual o la próxima, lunes a domingo): son dos botones posibles pero uno solo visible a la vez, porque las flechas cambian de semana. No agrega las dos semanas juntas.
- Antes de agregar, un **diálogo de confirmación** (Modal compartido) dice cuántas comidas se van a agregar. Cancelar no cambia nada.
- Se agregan los ingredientes de **cada espacio asignado** de esa semana a la **lista general** del usuario (se crea si no existe), con las mismas reglas que agregar una receta (reglas 17 a 26 de [la SPEC de recetas](../../recipes/specs/SPEC.md)), con las cantidades **multiplicadas** por el ×N del espacio.
- Al terminar, un aviso en la pantalla dice **cuántos ingredientes** de cuántas comidas se agregaron, lo que no se pudo agregar y lo que falta comprar, con el enlace **"Ver lista"** a `/lista`.
- Con **ninguna comida asignada** en la semana a la vista, el botón está **deshabilitado**.

### 16.2 Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Semana a la vista | lunes y domingo de la semana elegida, como claves `"2026-10-12"` / `"2026-10-18"` | las que ya arma el planificador (`days`) |
| Comidas de esa semana | entradas de `meal_plans` con receta y multiplicador | el plan ya cargado (SCRUM-100); el cliente solo las cuenta para el botón y el diálogo |
| Confirmación | confirmar / cancelar (botón, clic fuera o Escape) | diálogo |
| Recetas, presentaciones y lista general | `recipe_ingredients`, `product_catalog_variants`, `lists`, `list_items`, `list_item_recipe_requirements` | leídos en la base por la RPC |

### 16.3 Salidas

- Filas nuevas o cantidades sumadas en `list_items` de la lista general, y registros en `list_item_recipe_requirements` (uno por receta, producto y unidad, que acumula), igual que SCRUM-97.
- Un aviso (`role="status"`) con el resumen y "Ver lista". Si algo falla: un mensaje de error (`role="alert"`) y la lista queda como estaba.
- Nada cambia en `meal_plans`.

### 16.4 Reglas de negocio

25. **Una semana a la vez.** El botón actúa sobre la semana a la vista, no sobre las dos. Al cambiar de semana con las flechas, el botón y el conteo cambian con ella.
26. **Deshabilitado sin comidas.** Con 0 espacios asignados en la semana a la vista, mientras el plan carga y si falló la carga, el botón está deshabilitado.
27. **Confirmación siempre.** Antes de agregar se pide confirmar, también la primera vez. Dice el número de comidas de la semana a la vista ("Vas a agregar a tu lista general los ingredientes de 5 comidas (12 – 18 oct)."). A diferencia de SCRUM-97, no se guarda en el navegador qué se agregó: la pregunta es siempre.
28. **Destino: la lista general.** Elegir una sublista de fecha (HU-69 CA-03) queda pendiente hasta que existan las sublistas (HU-44 a HU-46, Sprint 4); ver sección 14.
29. **Una vez por espacio.** Se recorre cada espacio asignado de la semana, en orden (fecha y luego desayuno, almuerzo, cena). Si la misma receta está en tres espacios, sus ingredientes se agregan tres veces, cada una con el multiplicador de su espacio.
30. **Las cantidades se multiplican.** Los ingredientes de cada espacio se agregan con su cantidad × el multiplicador del espacio (×0,5 a ×4) antes de aplicar las reglas 17 a 26 de recetas. Esto cambia el contrato anterior ([sección 15](#15-notas-de-implementación)), que dejaba las cantidades en las porciones base.
31. **Mismo ingrediente en varios días (CA-02).** Todo lo que pide el mismo producto cae en una sola fila de la lista por presentación, sin duplicarse. Las cantidades se acumulan exactamente como si las recetas se hubieran agregado una detrás de otra con SCRUM-97: lo de volumen o peso descuenta lo que ya hay y lo que ya pidieron las otras comidas (regla 20 de recetas), y lo que se mide en unidades suma encima hasta cubrir cada comida (regla 19, "aunque sobre"). Esa última regla puede dejar más de lo estrictamente necesario cuando la presentación trae varias unidades; es el mismo comportamiento de SCRUM-97 y queda como decisión abierta (sección 15).
32. **Atómico.** Entra toda la semana o nada: si una comida falla, la lista queda como estaba.
33. **Sin presentación en el catálogo.** Como en la regla 26 de recetas, el ingrediente cuyo producto no tiene presentación no se agrega, el resumen lo nombra y el resto sí se agrega.
34. **Resumen.** Cuántas comidas se agregaron, **cuántos ingredientes distintos** entraron en la lista, y las dos listas que ya muestra SCRUM-97: los productos que no se pudieron agregar y los que te falta comprar. Si la lista ya tenía todo lo necesario, lo dice.
35. **Qué cuenta como "comida".** La base agrega lo que hay en `meal_plans` al momento de confirmar, no lo que mostraba la pantalla: si otra pestaña cambió el plan, el resumen dice cuántas comidas se agregaron de verdad. Con 0, no es un error: dice que no había comidas planeadas y no escribe nada.
36. **Máximo una semana por llamada.** La base rechaza un rango de más de 7 días (`22023`), para que una llamada directa no recorra un plan enorme con la lista bloqueada. Con 21 espacios y hasta 50 ingredientes por receta son como mucho 1.050 ingredientes.
37. **Una sola petición.** Un doble clic en "Agregar" no manda dos.
38. **Permisos.** La RPC es `security invoker`: solo ve y agrega sobre las recetas, el plan y la lista del propio usuario (RLS). No recibe ids de usuario.

### 16.5 Estados

| Pantalla | Estado | Notas |
|---|---|---|
| Agregar semana | `closed` · `confirming` · `adding` · `done` · `failed` | `confirming` y `adding` llevan la semana (lunes y domingo) y el número de comidas mostrado; `done` lleva el resumen; `failed`, el mensaje. Un solo diálogo a la vez |

`failed` es del diálogo (sigue abierto con el mensaje y se puede reintentar). Solo `done` es el aviso: queda debajo del encabezado, solo en la semana que se agregó, hasta que se vuelve a abrir la confirmación o se recarga la pantalla. Cambiar de semana lo oculta y volver a esa semana lo muestra otra vez.

### 16.6 Errores

| Caso | Qué se muestra |
|---|---|
| Falla de red o de Supabase al agregar | Dentro del diálogo, que sigue abierto: "No se pudo agregar la semana a tu lista. Intenta de nuevo." |
| Una receta de la semana ya no existe (se borró en otra pestaña) | No es error: su espacio ya no está en `meal_plans` (cascade), así que no se agrega; el resumen cuenta las comidas que sí entraron |
| Sin comidas al confirmar | Aviso "No había comidas planeadas esta semana." |
| Receta con más de 50 ingredientes | Mismo error de la RPC de recetas (`22023`): mensaje general de error |

### 16.7 UI esperada

- El botón **"Agregar semana a la lista"** (`Button` primario) va debajo del selector de semana (el rango y las flechas), alineado a la izquierda, con el aviso final justo debajo. Deshabilitado según la regla 26.
- El diálogo se titula **"Agregar semana a la lista"**, explica con una frase cuántas comidas se agregan y a qué lista, y tiene **"Agregar"** y **"Cancelar"**. Mientras agrega dice **"Agregando…"** y los botones se deshabilitan.
- El aviso final repite la forma del resumen de SCRUM-97: la línea principal ("Agregaste 8 ingredientes de 5 comidas a tu lista."), las líneas de "No se pudieron agregar" y "Te falta comprar" si aplican, y el enlace **"Ver lista"**.

### 16.8 Accesibilidad

- El botón deshabilitado se anuncia como no disponible; al cambiar de semana su estado cambia con ella.
- El diálogo es el `Modal` compartido (`role="dialog"`, `aria-modal`, título, Escape y foco de vuelta al botón al cerrar).
- El aviso es `role="status"` (éxito) o `role="alert"` (error): aparece sin que cambie la página y el lector lo anuncia solo.

### 16.9 Contratos externos

- **RPC nueva `add_week_to_general_list(week_from date, week_to date) returns jsonb`**, `security invoker`, `search_path` vacío, transaccional. Recorre los espacios de `meal_plans` del rango en orden y aplica, por espacio, la misma lógica que `add_recipe_to_general_list` con las cantidades × el multiplicador. Devuelve `{ meals, ingredients, added, missing, skipped }`. Sin sesión: `42501`. Rango inválido (`week_to < week_from` o más de 7 días): `22023`.
- **No se modifica ninguna función ni tabla existente (migración 022).** `add_week_to_general_list` trae su propio recorrido de ingredientes (las reglas 17 a 26 con el multiplicador) en una función interna nueva, `add_week_ingredients_to_list`, y reusa sin cambios las auxiliares `pick_recipe_variant` y `add_units_to_list_item`. `add_recipe_to_general_list`, `list_items` y `list_item_recipe_requirements` quedan exactamente como están: SCRUM-97, SCRUM-66 y SCRUM-98 no se ven afectadas y las pruebas SQL de la 015 y la 017 no cambian. `types/database.types.ts` solo suma las dos funciones nuevas.
- Sin tablas nuevas ni cambios de RLS.

### 16.10 Casos de aceptación (HU-69, SCRUM-101)

- [ ] CA-01: "Agregar semana a la lista" abre una confirmación y, al aceptar, agrega de una vez todos los ingredientes de las comidas asignadas de la semana a la vista, con las mismas reglas de SCRUM-97.
- [ ] CA-02: un ingrediente que aparece en varios espacios queda en una sola fila de la lista, sin duplicarse.
- [ ] CA-03 (parcial): se agrega a la lista general; la elección de una sublista queda para cuando existan las sublistas (sección 14).
- [x] El multiplicador de cada espacio escala las cantidades **pedidas y el faltante registrado** (un espacio en ×2 pide el doble que en ×1). Lo que se mide en `unidad` suma unidades a la lista; lo que se mide en ml o g no suma envases si el producto ya está (regla 20 de recetas), solo crece el faltante. Verificado en la prueba SQL (lunes ×2 y martes ×1 en ml o g; 3 unidades con ×1,5 en `unidad`); en pantalla solo se ve en el aviso al agregar, ver sección 16.11.
- [ ] La misma receta en dos espacios se agrega dos veces.
- [ ] Con la semana a la vista vacía, el botón está deshabilitado; con comidas, habilitado; cambia al cambiar de semana.
- [ ] Cancelar la confirmación no cambia la lista.
- [ ] El aviso dice cuántos ingredientes y cuántas comidas se agregaron y tiene el enlace "Ver lista" a `/lista`.
- [ ] Falla de red al agregar: mensaje dentro del diálogo, la lista queda como estaba y se puede reintentar.
- [ ] Doble clic en "Agregar": una sola petición.
- [ ] Todo o nada: si una comida falla, no entra ninguna.
- [ ] Otro usuario no ve ni suma sobre mi plan, mis recetas ni mi lista; sin sesión, `42501` (SQL con dos usuarios).
- [ ] Un rango de más de 7 días o invertido se rechaza en la base.
- [ ] Una semana con un solo espacio en ×1 deja la lista igual que agregar esa receta suelta con `add_recipe_to_general_list` (prueba de equivalencia, para detectar que las dos copias de las reglas se separen).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` pasan.

### 16.11 Casos fuera de alcance

- **Ver en pantalla el efecto del multiplicador y de las repeticiones en lo que se mide en ml o g (decidido el 2026-10-10, opción A):** agregar la semana sigue las reglas de SCRUM-97, así que un producto de volumen o peso que ya está en la lista no suma más envases por otra comida ni por volver a pulsar "Agregar": solo crece el faltante que queda registrado en `list_item_recipe_requirements`. Hoy ese faltante solo se ve en el aviso al agregar (con los nombres, "Te falta comprar: …"). El panel "Ver qué falta" de SCRUM-98 muestra el estado de cada ingrediente y la cantidad solo cuando el producto se tacha con faltante, y el aviso bajo cada producto en `/lista` es de SCRUM-114 (Marcos), todavía sin hacer. Cambiar esto para que la semana sume envases sería cambiar la regla 20, que es de SCRUM-97 y de la lista de otra persona.
- **Elegir una sublista de fecha como destino (HU-69 CA-03):** depende de las sublistas (HU-44 a HU-46 / SCRUM-76 a SCRUM-78, de Marcos, Sprint 4) y de que `lists` las distinga por fecha; hoy solo existe la lista general. Cuando existan, el diálogo suma un selector de destino y la RPC recibe el id de la lista. Hasta entonces el destino es fijo y el CA-03 queda cumplido a medias; **hay que avisarlo en la PR**.
- **Agregar las dos semanas de una vez:** el botón actúa sobre la semana a la vista.
- **Agregar solo algunos días o comidas** (casillas por espacio): no lo pide la historia.
- **Avisar que la semana ya se agregó antes** (como la regla 27 de recetas): se pregunta siempre, sin recordar nada en el navegador.
- **Deshacer lo agregado:** la lista se edita a mano o se tachan los productos (SCRUM-66).
- **Ver cuánto se gasta o qué falta por receta:** es de la lista y de "qué falta" (SCRUM-98, SCRUM-115).
- **Convertir unidades:** igual que SCRUM-97, no se convierte (documento-proyecto §4.9.1).

### 16.12 Notas de implementación

- **Por qué una RPC nueva y no N llamadas desde el cliente.** Llamar a `add_recipe_to_general_list` una vez por espacio desde el navegador no es atómico (si la tercera falla, las dos primeras ya entraron) y no puede multiplicar. Una sola RPC con todo el plan de la semana es una transacción: o entra la semana o nada, con una sola ida a la base.
- **Por qué se duplica el recorrido en vez de tocar `add_recipe_to_general_list`.** El multiplicador exige cambiar el recorrido de ingredientes. Extraerlo y dejar la RPC de recetas como envoltorio la volvería a escribir en una migración de SCRUM-101, y el último `create or replace` aplicado gana: si el dueño de la lista (o de recetas) la modifica después, una de las dos pisaría a la otra. Se decidió (2026-10-10) **no modificar nada de otras historias** y aceptar la copia (~200 líneas) como deuda anotada: `add_week_ingredients_to_list` es la copia con multiplicador, con un comentario que apunta a la original.
- **La función interna queda expuesta** (`grant execute` a `authenticated`, igual que `pick_recipe_variant` y `add_units_to_list_item`, que la nueva reusa sin cambios): una función `security invoker` llamada desde otra necesita el permiso de quien la llama. No hay riesgo: corre con los permisos y la RLS del usuario.
- **El bloqueo de la lista** (`pg_advisory_xact_lock`) lo toma `add_week_to_general_list` una sola vez, con la misma clave que `add_recipe_to_general_list` (el id de la lista general), así que una receta suelta y una semana agregadas a la vez se hacen una detrás de otra. La función interna no lo toma.
- **Decisión abierta: conteos que sobran.** Con la regla 19 cada espacio suma encima hasta cubrir su comida, así que 2 cebollas pedidas en dos días con una bolsa de 6 dan 2 bolsas, no 1. Es lo que haría SCRUM-97 agregando las recetas una por una. Sumar primero todo lo que pide el producto en la semana y redondear una vez daría 1 bolsa, pero perdería el registro por receta de `list_item_recipe_requirements`. Si en QA molesta, es un ajuste de la función interna.
- **Cuando las dos copias se junten.** Si los dueños lo acuerdan, `add_recipe_to_general_list` puede pasar a llamar a `add_week_ingredients_to_list` con multiplicador 1 y se borra la copia (un `create or replace` del cuerpo, probado con las pruebas SQL de la 015, la 017 y la de equivalencia de la 022). Mientras tanto, cualquier corrección a las reglas 17 a 26 hay que hacerla en las dos.
- **Tiempo.** El rango es de lunes a domingo en hora local del navegador (regla 1); el cliente manda las dos claves y la base solo compara fechas.
