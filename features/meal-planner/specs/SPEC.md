# Feature: Planificador semanal

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-99 / HU-67](https://tacha.atlassian.net/browse/SCRUM-99): ver el calendario semanal de comidas. Sprint 3.
- [SCRUM-100 / HU-68](https://tacha.atlassian.net/browse/SCRUM-100): asignar receta, cocinero y porciones a un espacio. Sprint 3, en curso.
- [SCRUM-101 / HU-69](https://tacha.atlassian.net/browse/SCRUM-101): agregar la semana completa a la lista. Sprint 3, todavía no empezada.

Esta spec cubre **SCRUM-99** (el calendario, mergeada) y **SCRUM-100** (asignar). SCRUM-101 la extiende cuando empiece. El cómo (archivos, flujo, decisiones) está en [plan.md](plan.md); los pasos, en [tasks.md](tasks.md).

## 1. Objetivo

- **SCRUM-99:** que el usuario vea de un vistazo la semana en que está y la siguiente, dividida en días y comidas, como el lugar donde después va a planificar qué se cocina. Entregó **el calendario**, con los espacios vacíos.
- **SCRUM-100:** que el usuario pueda **planificar**: elegir qué receta se cocina en cada espacio, quién la cocina y para cuántas porciones, y verlo directo en la grilla. Puede cambiarlo o quitarlo cuando quiera.

## 2. Alcance

- Ruta propia `/recetas/planificador`, dentro del grupo privado de la app. Es el sub-tab **"Planificador semanal"** de la sección Recetas: la barra de sub-tabs pasa a ser de links y "Recetas" sigue yendo a `/recetas`.
- **Grilla de 7 días** (lunes a domingo) por **3 comidas** (desayuno, almuerzo, cena): siempre los 21 espacios, todos vacíos.
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

- La grilla de la semana elegida: 7 días con su nombre y número, y 3 espacios vacíos por día.
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
20. **Cualquier día de las dos semanas se puede asignar**, también los días de la semana actual que ya pasaron (para anotar lo que se cocinó). La base acepta cualquier fecha válida; la pantalla solo ofrece las dos semanas visibles.
21. **El plan se carga una vez para las dos semanas** al abrir la pantalla, no al cambiar de semana: las flechas no hacen una consulta.
22. **Receta borrada (contrato de SCRUM-96, SPEC de recetas §15):** al eliminar una receta, sus espacios del plan quedan **libres** (`on delete cascade`). El diálogo de eliminar avisa cuántos espacios la usan ("Está en 3 espacios de tu plan; quedarán vacíos") antes de confirmar. Si no se pudo contar, el diálogo se abre sin el aviso y borrar sigue funcionando.
23. **Receta editada:** el plan guarda el id de la receta, no una copia. Si se cambia su nombre o sus porciones base, la grilla y las porciones resultantes se actualizan solas la próxima vez que se carga. El plan no guarda cantidades.
24. **Sin household por ahora:** `household_id` queda nullable y sin FK, igual que `lists` y `recipes`.

## 6. Estados

| Pantalla | Estado | Notas |
|---|---|---|
| Planificador | `weekOffset`: `current` · `next` | Una unión derivada de constantes, no un booleano. No hay estados de carga ni error porque no hay datos remotos |

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
- **SCRUM-100:** espacio vacío = botón con borde punteado y "+ Almuerzo". Espacio asignado = botón con borde sólido que muestra el nombre de la receta (una línea, recortada), debajo "Yo" o nada si no hay cocinero, y un chip "×2" si el multiplicador no es ×1.
- **SCRUM-100:** diálogo (`Modal` compartido) con título "Asignar comida" o "Cambiar comida" y debajo el día y la comida ("Almuerzo · lunes 12 oct"). Contiene: la lista de recetas (una opción por receta, con sus porciones base), el selector de cocinero ("Yo" / "Sin cocinero"), el contador del multiplicador con su resultado ("× 2 · 24 porciones"), y las acciones "Guardar", "Quitar" (solo en un espacio asignado) y "Cancelar". "Guardando…" con los botones deshabilitados mientras guarda.
- **SCRUM-100:** el diálogo de eliminar receta suma, si la receta está en el plan, el aviso con el número de espacios.
- El mismo HTML sirve para desktop y mobile: solo cambia la disposición con CSS (`md:grid` / apilado), igual que el shell, sin medir el ancho en JS.

## 9. Accesibilidad

- Las flechas son botones con nombre ("Semana anterior" / "Semana siguiente"); deshabilitadas, el lector de pantalla las anuncia como no disponibles.
- El encabezado con el rango tiene `aria-live="polite"`: al pasar de semana el lector anuncia la nueva ("Próxima semana, 19 – 25 oct") sin que el usuario tenga que buscarla.
- La grilla es una lista de días (`<ul>` de `<li>`), y cada día contiene su lista de espacios. Cada día lleva su fecha en un `<time datetime="2026-10-12">`.
- El día de hoy lleva `aria-current="date"`: se dice con semántica, no solo con el color.
- Un espacio vacío es texto, no un botón. El "+" es decorativo (`aria-hidden`); el lector lee "Almuerzo, vacío".
- Los sub-tabs ya anuncian la página activa con `aria-current="page"`.
- **SCRUM-100:** los espacios son botones con nombre completo ("Almuerzo del lunes 12, vacío, asignar" / "Almuerzo del lunes 12: Arroz con leche, cambiar"), así que el lector sabe qué día, qué comida y qué pasa al tocarlos. El "+" es decorativo.
- **SCRUM-100:** el diálogo es `role="dialog"` con `aria-modal`, título y cierre con Escape (comportamiento del `Modal` compartido). Las recetas son un grupo de opciones (`radiogroup`) con la receta elegida marcada; el cocinero, otro grupo de opciones. El contador del multiplicador tiene botones "Menos porciones" / "Más porciones" y el valor se anuncia ("×2, 24 porciones") con `aria-live="polite"`. Los errores del diálogo son `role="alert"`.
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
  - `anon` sin permisos de tabla. `authenticated`: `select`, `delete`, y `insert`/`update` solo de las columnas del espacio (`date`, `meal_type`, `recipe_id`, `assigned_cook`, `servings_multiplier`); `owner_id`, `household_id` y `created_at` no se pueden fijar a mano (mismo criterio que `008`).
- **RPC nueva `assign_meal_slot(slot_date date, slot_meal_type text, target_recipe_id uuid, cook_is_self boolean, servings_multiplier numeric) returns uuid`:** `security invoker` y `search_path` vacío, como `save_recipe`. Crea o reemplaza el espacio (`insert … on conflict … do update`). El cocinero sale de `cook_is_self ? auth.uid() : null`: el cliente no manda ids de usuario. Sin sesión, `42501`; receta no encontrada (inexistente, ajena o borrada), `P0002`.
- **Quitar:** `delete` directo de `meal_plans` por fecha y comida (PostgREST), sin RPC. Si RLS oculta la fila no se borra nada y no hay error.
- **Leer:** una consulta de PostgREST con la receta embebida, `meal_plans?select=…,recipes(name,base_servings)&date=gte.<lunes de la semana actual>&date=lte.<domingo de la próxima>`. Sin filtro por dueño: lo hace RLS.
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
- [x] Un espacio vacío muestra "+ Almuerzo" y no es botón ni link (no se puede enfocar con Tab). (navegador y E2E-PLANNER-02: no hay ningún enlace ni botón dentro de la grilla)
- [x] El sub-tab "Planificador semanal" está activo y habilitado en la pantalla; "Recetas" lleva a `/recetas`; en `/recetas` el sub-tab del planificador ya no dice "Próximamente" y lleva a `/recetas/planificador`.
- [x] El ítem "Recetas" del menú lateral sigue activo en `/recetas/planificador`.
- [x] En mobile los días se apilan y no hay desplazamiento horizontal.
- [x] Recargar `/recetas/planificador` vuelve a la semana actual (la semana a la vista no se guarda).
- [x] El día de hoy se calcula en hora local: con la hora del navegador después de las 6 p. m. en UTC-6 sigue siendo el día local. (en `toLocalDateKey.test.ts` con zona America/Costa_Rica; no se reprodujo en el navegador)

### HU-68 (SCRUM-100)

- [ ] CA-01: tocar un espacio vacío abre el diálogo; se elige una receta de las propias, el cocinero ("Yo" / "Sin cocinero") y el multiplicador, y al guardar el espacio queda asignado.
- [ ] CA-02: un espacio asignado muestra en la grilla el nombre de la receta, el cocinero y, si no es ×1, el multiplicador; sigue ahí al recargar.
- [ ] CA-03: tocar un espacio asignado abre el diálogo con sus valores; "Guardar" lo reasigna y "Quitar" lo deja vacío; ninguno de los dos pide confirmación.
- [ ] "Guardar" está deshabilitado hasta elegir una receta.
- [ ] El multiplicador va de ×0,5 a ×4 en pasos de 0,5, y sus botones se deshabilitan en los extremos; el diálogo muestra las porciones resultantes.
- [ ] Asignar sobre un espacio ocupado lo reemplaza (no quedan dos recetas en el mismo espacio).
- [ ] Un usuario sin recetas ve "Todavía no tienes recetas." con el link a `/recetas/nueva` y no puede guardar.
- [ ] Falla de red al guardar: el diálogo muestra el error, sigue abierto con lo elegido, y se puede reintentar.
- [ ] Falla de red al cargar el plan: mensaje con "Reintentar" y los espacios vacíos deshabilitados, sin decir que no hay nada planeado.
- [ ] Doble clic en "Guardar" o en "Quitar": una sola petición.
- [ ] Cambiar de semana con las flechas no hace una consulta nueva y conserva lo asignado de cada semana.
- [ ] Cambiar el nombre o las porciones base de una receta se refleja en la grilla al recargar.
- [ ] Eliminar una receta que está en 2 espacios del plan: el diálogo avisa "Está en 2 espacios de tu plan"; al confirmar, esos espacios quedan vacíos al recargar.
- [ ] Eliminar una receta que no está en el plan: el diálogo no dice nada del plan.
- [ ] Receta borrada en otra pestaña antes de guardar: "Esa receta ya no existe. Elige otra.", y la lista del diálogo se recarga.
- [ ] Otra sesión no ve ni cambia el plan de otro usuario, ni puede asignar una receta ajena (SQL con `role authenticated` y dos usuarios: 0 filas visibles y `P0002`).
- [ ] El cliente no puede fijar `owner_id` ni el cocinero de otro usuario (la RPC ignora cualquier id; el `insert` directo se rechaza por permisos de columna).
- [ ] Un multiplicador fuera de rango (0, 0,3, 5) se rechaza en la base aunque se llame a la RPC directo.
- [ ] El foco vuelve al espacio al cerrar el diálogo y los espacios tienen nombre accesible completo.

### Todas

- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` pasan.

## 14. Casos fuera de alcance

- **Elegir como cocinero a otro miembro del household:** necesita la lista de miembros con nombre (HU-35 / SCRUM-60, sin PR) y los perfiles. El selector ya está hecho para sumarlos.
- **Plan compartido del household y recetas compartidas:** evaluado y no incluido; ver la sección 15 para el porqué y los pasos.
- **Buscador o filtros en la lista de recetas del diálogo:** la lista es corta por ahora; si crece, un campo de búsqueda por nombre.
- **Mover o copiar una comida a otro espacio** (arrastrar, "repetir el lunes"): no lo pide la historia.
- **Notas por comida, ingredientes extra o recetas sueltas sin cargar al catálogo:** no están en la historia.
- **Aviso si se asigna una receta con ingredientes que no están en la lista:** "qué falta" del plan es una historia propia.
- **Bloquear días pasados o fechas fuera de las dos semanas en la base:** la pantalla solo ofrece las dos semanas; la base acepta cualquier fecha válida (regla 20).
- **"Agregar semana a la lista":** HU-69 (SCRUM-101).
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
- **Cómo se llenaron los huecos de HU-68 (SCRUM-100, decidido con el responsable el 2026-10-10).** La historia no dice de quién es el plan, cómo se elige un cocinero que todavía no se puede listar, qué rango tiene el multiplicador ni qué pasa al borrar una receta asignada:
  - **plan personal con estructura lista para el household** (ver abajo);
  - **cocinero "Yo" / "Sin cocinero"**; los miembros se suman al mismo selector cuando exista HU-35. `assigned_cook` apunta a `auth.users` y no a `household_members` como decía documento-proyecto §6, porque un usuario sin household no está en `household_members` y no podría asignarse a sí mismo;
  - **multiplicador ×0,5 a ×4 en pasos de 0,5** y se guarda el multiplicador (como pide la tabla), no las porciones;
  - **receta borrada: el espacio queda libre** (`on delete cascade`) y el diálogo de eliminar avisa cuántos espacios usa. Cierra el CA-02 de HU-64b (SCRUM-96), que la SPEC de recetas §15 dejó para esta historia.
- **Fusionar recetas y plan semanal al household: evaluado, no incluido (pedido del responsable, 2026-10-10).** Se examinó si se podía hacer en esta historia. Es posible, pero no entra por tamaño y por lo que arrastra:
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
- **Contrato con SCRUM-101.** Agregar la semana recorre las filas de `meal_plans` de la semana y llama a `add_recipe_to_general_list` por cada una (SPEC de recetas §15). El multiplicador no cambia las cantidades en SCRUM-97: la RPC de recetas usa las porciones base. Si SCRUM-101 necesita escalar los ingredientes por el multiplicador, es una decisión de esa historia.
