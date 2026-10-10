# Plan E2E: planificador semanal

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/meal-planner/meal-planner.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: las fechas (`getWeekStart`, `buildWeek`, `formatWeekRange`, `toLocalDateKey`, `getWeekStartForOffset`), el ViewModel, `useToday` y la pantalla con sus flechas están cubiertos con tests unitarios y de componente (`features/meal-planner/tests/`), y los sub-tabs en `components/recipes-tabs/tests/`. Acá va lo que solo un navegador real prueba: que la ruta existe y se llega a ella desde los sub-tabs, que "hoy" sale del reloj real del navegador sin un desajuste de hidratación, y que la grilla se dispone según el ancho (7 columnas en desktop, días apilados en Pixel 7).

## Datos y entorno

- **Usuario:** la pantalla no usa sesión ni base. Solo E2E-PLANNER-01 llega al catálogo de recetas (`/recetas`), que sí crea una sesión anónima nueva al cargar; los demás escenarios no tocan Supabase.
- **Sin datos propios:** el planificador no lee ni escribe en la base (SPEC §4); no hace falta limpieza.
- **Fechas:** el navegador de Playwright usa la misma zona horaria y el mismo reloj que Node. Cada test calcula los lunes y el día de hoy esperados con su propia aritmética de fechas (no importa las funciones de la app), para que el oráculo sea independiente.
- **Servidor en frío:** si Playwright levanta `next dev` desde cero, la primera compilación de `/recetas/planificador` puede pasar los 5 s del `expect`. Es del **entorno**: levantar `npm run dev`, abrir la ruta una vez y después correr la suite (Playwright reusa el servidor).
- **Límite de Supabase:** E2E-PLANNER-01 crea un usuario anónimo por corrida y por proyecto. Muchas corridas seguidas desde la misma IP llegan al límite de `/signup` (429): es del **entorno**, no reintentar en bucle.
- **Base:** la compartida del equipo. Por eso E2E todavía no corre en el CI (ver `.agents/skills/playwright-e2e`, "Setup en este repo").

## Escenarios

### E2E-PLANNER-01: ir y volver entre los sub-tabs de Recetas

- **Cubre:** HU-67 CA-01 (el sub-tab "Planificador semanal" dentro de "Recetas").
- **Precondición:** ninguna. Corre en desktop (`chromium`) y en Pixel 7 (`mobile-chrome`).
- **Pasos:**
  1. Abrir `/recetas/planificador`.
  2. Tocar "Recetas" en los sub-tabs ("Secciones de recetas").
  3. Tocar "Planificador semanal" en los sub-tabs.
- **Resultado esperado:** después del paso 1 la URL es `/recetas/planificador`, el sub-tab "Planificador semanal" es la página actual (`aria-current="page"`) y "Recetas" no, y el ítem "Recetas" del menú de la app también es la página actual. Después del paso 2 la URL es `/recetas` y el sub-tab "Recetas" es la página actual. Después del paso 3 vuelve `/recetas/planificador`. En ningún momento el sub-tab dice "Próximamente".

### E2E-PLANNER-02: ver la semana actual con sus espacios y hoy

- **Cubre:** HU-67 CA-01 (grilla de días por comidas, 3 espacios por día) y la marca de hoy.
- **Precondición:** ninguna. Corre en desktop y en Pixel 7.
- **Pasos:** abrir `/recetas/planificador`.
- **Resultado esperado:**
  - se ve "Esta semana" y un rango de fechas con la forma "12 – 18 oct" (o "28 sep – 4 oct" si cruza de mes);
  - hay 7 días, del lunes al domingo de la semana en que está hoy, cada uno con su fecha (`<time datetime>`);
  - cada día tiene los 3 espacios "Desayuno", "Almuerzo" y "Cena": 7 de cada uno, todos vacíos;
  - exactamente un día está marcado como hoy (`aria-current="date"`) y es el de la fecha de hoy;
  - los espacios no son botones: los únicos botones de la pantalla son las dos flechas de semana.

### E2E-PLANNER-03: pasar a la próxima semana y volver

- **Cubre:** HU-67 CA-02.
- **Precondición:** ninguna. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/recetas/planificador`: la flecha "Semana anterior" está deshabilitada.
  2. Tocar "Semana siguiente".
  3. Tocar "Semana anterior".
- **Resultado esperado:** después del paso 2 se ve "Próxima semana" con los 7 días del lunes al domingo siguientes; ningún día está marcado como hoy; "Semana siguiente" queda deshabilitada y "Semana anterior" habilitada. Después del paso 3 vuelve "Esta semana", con los días de la semana actual y hoy marcado, y "Semana anterior" deshabilitada otra vez.

### E2E-PLANNER-04: en desktop los días van en 7 columnas

- **Cubre:** HU-67 CA-01 (la disposición en desktop).
- **Precondición:** ninguna. El ancho lo fija el propio test (1280 px), no el proyecto: corre igual en `chromium` y en `mobile-chrome`.
- **Pasos:** abrir `/recetas/planificador` y mirar la posición de los primeros dos días.
- **Resultado esperado:** el segundo día está en la misma fila que el primero, más a la derecha.

### E2E-PLANNER-05: en mobile los días se apilan sin desplazamiento horizontal

- **Cubre:** HU-67 CA-01 (la disposición en mobile).
- **Precondición:** ninguna. El ancho lo fija el propio test (412 px), no el proyecto: corre igual en `chromium` y en `mobile-chrome`.
- **Pasos:** abrir `/recetas/planificador` y mirar la posición de los primeros dos días.
- **Resultado esperado:** el segundo día está en la misma columna que el primero, más abajo, y la página no se desplaza horizontalmente.

### Fuera del navegador

- El cálculo de la semana en domingo, cambio de mes, año, año bisiesto, hora de verano y después de las 6 p. m. en UTC-6: `tests/getWeekStart.test.ts`, `buildWeek.test.ts`, `toLocalDateKey.test.ts`, `formatWeekRange.test.ts`.
- Que el servidor no dibuje "hoy" (sin desajuste de hidratación): `tests/useToday.test.tsx` y la prueba manual (consola sin errores al recargar).
- Las flechas con el lector de pantalla (`aria-live`): prueba manual de QA.
