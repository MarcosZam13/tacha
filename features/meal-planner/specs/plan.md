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

- **Los espacios siempre están vacíos** hasta SCRUM-100: la pantalla es un calendario sin contenido. Es lo que HU-67 pide, pero conviene que se mergee cerca de SCRUM-100 para que el usuario no vea una pantalla "vacía" mucho tiempo.
- **La semana no se actualiza a medianoche** con la pantalla abierta (SPEC regla 9).
- **Sin household:** el calendario no sabe de quién es el plan. Cuando `meal_plans` use `household_id` (SCRUM-100) hay que decidir qué ve un usuario sin household.
- **Hora de verano:** Costa Rica no la usa, pero `buildWeek` suma días con `new Date(año, mes, día + n)` y no con milisegundos, así que tampoco falla donde sí exista.
