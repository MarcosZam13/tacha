# Plan E2E: planificador semanal

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/meal-planner/meal-planner.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: las fechas (`getWeekStart`, `buildWeek`, `formatWeekRange`, `toLocalDateKey`, `getWeekStartForOffset`), el ViewModel, `useToday` y la pantalla con sus flechas están cubiertos con tests unitarios y de componente (`features/meal-planner/tests/`), y los sub-tabs en `components/recipes-tabs/tests/`. Acá va lo que solo un navegador real prueba: que la ruta existe y se llega a ella desde los sub-tabs, que "hoy" sale del reloj real del navegador sin un desajuste de hidratación, y que la grilla se dispone según el ancho (7 columnas en desktop, días apilados en Pixel 7).

## Datos y entorno

- **Usuario:** desde SCRUM-100 la pantalla lee el plan de la base, así que **todos** los escenarios abren una sesión anónima nueva (la crea la app al cargar). Cada prueba abre un navegador nuevo y no comparte plan ni recetas con otra.
- **Recetas de prueba (E2E-PLANNER-06 a 10):** para asignar hace falta tener recetas. Se crean antes de cada prueba con la API de Supabase y el token de la propia sesión (`save_recipe`, con el primer producto del catálogo como ingrediente): `E2E Flan` (6 porciones) y `E2E Arroz` (4). Supuesto: el catálogo de la base compartida tiene al menos un producto; si no, la falla es de **entorno / datos de prueba**.
- **Limpieza:** después de cada prueba se borran todas las recetas del usuario (`deleteOwnRecipes`, con su propio token; RLS solo deja borrar lo suyo). Sus espacios del plan se van con ellas (`on delete cascade`). En la base queda el usuario anónimo sin datos.
- **Lista de prueba (E2E-PLANNER-09):** agregar la semana escribe en la lista general del usuario anónimo. Al terminar se borran sus items (`deleteOwnListItems`, con su propio token) además de sus recetas. Supuesto: el primer producto del catálogo tiene al menos una presentación; si no, el aviso dice "No se pudieron agregar" en vez de "Agregaste…" y la falla es de **entorno / datos de prueba**.
- **Fechas:** el navegador de Playwright usa la misma zona horaria y el mismo reloj que Node. Cada prueba calcula los lunes y el día de hoy esperados con su propia aritmética de fechas (no importa las funciones de la app), para que el oráculo sea independiente. Los espacios de las pruebas de asignar son los de **hoy** (el día marcado con `aria-current="date"`), así que no dependen de qué día de la semana sea.
- **Servidor en frío:** si Playwright levanta `next dev` desde cero, la primera compilación de `/recetas/planificador` o `/recetas` puede pasar los 5 s del `expect`. Es del **entorno**: levantar `npm run dev`, abrir las rutas una vez y después correr la suite (Playwright reusa el servidor).
- **Sesión y plan lentos:** las pruebas de asignar esperan hasta 15 s a que el espacio se habilite (sesión anónima y lectura del plan en la base compartida). El espacio sigue deshabilitado mientras el plan carga.
- **Fallo intermitente observado (sin causa confirmada):** en una corrida completa hecha justo después de `npm run build`, E2E-PLANNER-06 y 08 fallaron solo en `mobile-chrome`: a los 15 s el espacio de hoy seguía deshabilitado y **sin** el aviso "No se pudo cargar tu plan" (el plan seguía cargando). En serie (`--workers=1`, 3 repeticiones) y en la corrida completa siguiente pasaron todos. No se reprodujo un defecto del producto. Las causas posibles son la compilación en frío del servidor de desarrollo con los proyectos en paralelo o el inicio de sesión anónimo bajo carga; la hipótesis del límite de `/signup` (429) **no se confirmó**. Si vuelve a pasar: repetir con `--workers=1`, y si falla, revisar la traza (`--trace=retain-on-failure`) y la red antes de clasificarlo; no reintentar en bucle.
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
- **Precondición:** el usuario E2E es nuevo (sesión anónima) y no tiene plan: por eso los 21 espacios están vacíos. Corre en desktop y en Pixel 7.
- **Pasos:** abrir `/recetas/planificador`.
- **Resultado esperado:**
  - se ve "Esta semana" y un rango de fechas con la forma "12 – 18 oct" (o "28 sep – 4 oct" si cruza de mes);
  - hay 7 días, del lunes al domingo de la semana en que está hoy, cada uno con su fecha (`<time datetime>`);
  - cada día tiene los 3 espacios "Desayuno", "Almuerzo" y "Cena": 7 de cada uno, todos vacíos;
  - exactamente un día está marcado como hoy (`aria-current="date"`) y es el de la fecha de hoy;
  - los 21 espacios son botones con nombre "<Comida> del <día>, vacío, asignar" (SCRUM-100), además de las dos flechas de semana.

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

### E2E-PLANNER-06: asignar una receta a un espacio y que siga después de recargar

- **Cubre:** HU-68 CA-01, CA-02.
- **Precondición:** usuario anónimo nuevo con las recetas `E2E Flan` (6 porciones) y `E2E Arroz` (4). Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/recetas/planificador` y tocar el espacio "Almuerzo" de hoy (vacío).
  2. En el diálogo "Asignar comida": "Guardar" está deshabilitado. Elegir `E2E Flan`, tocar "Más porciones" una vez y ver el resumen.
  3. Tocar "Guardar".
  4. Recargar la página.
- **Resultado esperado:** después del paso 2 el resumen dice "×1,5 · 9 porciones". Después del paso 3 el diálogo se cierra y el espacio de hoy muestra `E2E Flan`, "Yo" y "×1,5". Después del paso 4 sigue mostrándolos.

### E2E-PLANNER-07: reasignar y quitar una comida

- **Cubre:** HU-68 CA-03.
- **Precondición:** la de E2E-PLANNER-06, con `E2E Flan` ya asignada a la "Cena" de hoy.
- **Pasos:**
  1. Tocar el espacio de la cena: el diálogo es "Cambiar comida" y `E2E Flan` está elegida. Elegir `E2E Arroz` y tocar "Guardar".
  2. Recargar la página.
  3. Tocar otra vez el espacio y tocar "Quitar".
  4. Recargar la página.
- **Resultado esperado:** después del paso 1 el espacio muestra `E2E Arroz` y ya no `E2E Flan`; después del paso 2 sigue así. Después del paso 3 el diálogo se cierra, sin pedir confirmación, y el espacio vuelve a decir "vacío, asignar"; después del paso 4 sigue vacío.

### E2E-PLANNER-08: eliminar una receta que está en el plan avisa y libera sus espacios

- **Cubre:** HU-64b CA-02 (SCRUM-96) y la regla 22 de la SPEC (receta borrada libera el espacio).
- **Precondición:** la de E2E-PLANNER-06, con `E2E Flan` asignada al "Almuerzo" y a la "Cena" de hoy.
- **Pasos:**
  1. Abrir `/recetas` y tocar "Eliminar" en la tarjeta de `E2E Flan`.
  2. En el diálogo, confirmar con "Eliminar".
  3. Volver a `/recetas/planificador`.
- **Resultado esperado:** después del paso 1 el diálogo dice "Está en 2 espacios de tu plan; quedarán vacíos." Después del paso 2 la tarjeta desaparece. Después del paso 3 los espacios de almuerzo y cena de hoy dicen "vacío, asignar".

### E2E-PLANNER-09: agregar la semana a la lista

- **Cubre:** HU-69 CA-01 y la regla 27 de la SPEC (confirmar siempre).
- **Precondición:** la de E2E-PLANNER-06, con `E2E Flan` asignada al "Almuerzo" y a la "Cena" de hoy.
- **Pasos:**
  1. Tocar "Agregar semana a la lista".
  2. En el diálogo, tocar "Cancelar".
  3. Volver a tocar "Agregar semana a la lista" y confirmar con "Agregar".
  4. Tocar "Ver lista".
- **Resultado esperado:** después del paso 1 el diálogo "Agregar semana a la lista" dice "Vas a agregar a tu lista general los ingredientes de 2 comidas" y todavía no hay aviso. Después del paso 2 el diálogo se cierra y no hay aviso. Después del paso 3 el diálogo se cierra y aparece el aviso "Agregaste N ingrediente(s) de 2 comidas a tu lista." con el enlace "Ver lista". Después del paso 4 la URL es `/lista`.

### E2E-PLANNER-10: el botón sigue a las comidas de la semana a la vista

- **Cubre:** HU-69 y la regla 26 de la SPEC (deshabilitado sin comidas).
- **Precondición:** la de E2E-PLANNER-06, sin ninguna comida asignada.
- **Pasos:**
  1. Mirar el botón "Agregar semana a la lista".
  2. Asignar `E2E Flan` al "Almuerzo" de hoy.
  3. Pasar a la próxima semana con la flecha.
  4. Volver a la semana actual.
- **Resultado esperado:** después del paso 1 el botón está deshabilitado. Después del paso 2 está habilitado. Después del paso 3 está deshabilitado (la próxima semana no tiene comidas). Después del paso 4 está habilitado.

### Fuera del navegador

- El cálculo de la semana en domingo, cambio de mes, año, año bisiesto, hora de verano y después de las 6 p. m. en UTC-6: `tests/getWeekStart.test.ts`, `buildWeek.test.ts`, `toLocalDateKey.test.ts`, `formatWeekRange.test.ts`.
- Que el servidor no dibuje "hoy" (sin desajuste de hidratación): `tests/useToday.test.tsx` y la prueba manual (consola sin errores al recargar).
- Las flechas con el lector de pantalla (`aria-live`): prueba manual de QA.
