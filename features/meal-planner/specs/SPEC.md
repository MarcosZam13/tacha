# Feature: Planificador semanal

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-99 / HU-67](https://tacha.atlassian.net/browse/SCRUM-99): ver el calendario semanal de comidas. Sprint 3.
- [SCRUM-100 / HU-68](https://tacha.atlassian.net/browse/SCRUM-100): asignar receta, cocinero y porciones a un espacio. Sprint 3, todavía no empezada.
- [SCRUM-101 / HU-69](https://tacha.atlassian.net/browse/SCRUM-101): agregar la semana completa a la lista. Sprint 3, todavía no empezada.

Esta spec cubre **SCRUM-99**. Las otras dos la extienden cuando empiecen. El cómo (archivos, flujo, decisiones) está en [plan.md](plan.md); los pasos, en [tasks.md](tasks.md).

## 1. Objetivo

Que el usuario vea de un vistazo la semana en que está y la siguiente, dividida en días y comidas, como el lugar donde después va a planificar qué se cocina (HU-68). Esta historia entrega **el calendario**; todavía no sabe nada de recetas ni de cocineros.

## 2. Alcance

- Ruta propia `/recetas/planificador`, dentro del grupo privado de la app. Es el sub-tab **"Planificador semanal"** de la sección Recetas: la barra de sub-tabs pasa a ser de links y "Recetas" sigue yendo a `/recetas`.
- **Grilla de 7 días** (lunes a domingo) por **3 comidas** (desayuno, almuerzo, cena): siempre los 21 espacios, todos vacíos.
- **Encabezado con el rango de la semana** ("12 – 18 oct") y dos flechas para pasar entre la **semana actual** y la **próxima**. Con la actual a la vista, la flecha de atrás está deshabilitada; con la próxima, la de adelante.
- El **día de hoy** se marca en la semana actual.
- **Mobile:** los mismos días apilados uno debajo de otro, en vez de la grilla.
- Un espacio vacío se ve como "+ Almuerzo" con borde punteado, pero **no hace nada** todavía.

Lo que no incluye está en la [sección 14](#14-casos-fuera-de-alcance).

## 3. Entradas

| Entrada | Tipo | De dónde |
|---|---|---|
| Fecha de hoy | `Date`, en hora **local** del navegador | el reloj del navegador, tomada al montar la pantalla |
| Semana a ver | `current` / `next` | clic en las flechas; arranca en `current` |

No hay entradas de la base: esta historia no lee nada de Supabase.

## 4. Salidas

- La grilla de la semana elegida: 7 días con su nombre y número, y 3 espacios vacíos por día.
- El rango de la semana en el encabezado y las flechas con su estado.
- El día de hoy resaltado si la semana a la vista es la actual.

No escribe nada en ninguna parte.

## 5. Reglas de negocio

1. **La semana va de lunes a domingo**, en la hora **local del navegador** y no en UTC: en Costa Rica (UTC-6) el "hoy" en UTC cambiaría a las 6 p. m. Mismo criterio que "Tachados hoy" de SCRUM-66.
2. **Solo hay dos semanas:** la que contiene a hoy (la actual) y la siguiente (la próxima). No se puede ir a semanas anteriores ni a más de una adelante (HU-67 CA-02).
3. **Arranca en la semana actual.**
4. La flecha de atrás está deshabilitada en la actual; la de adelante, en la próxima. Nunca se oculta una flecha: el usuario ve que existe y que no hay más.
5. **Cada día tiene 3 espacios** en este orden: desayuno, almuerzo, cena. Siempre se dibujan los tres, aunque estén vacíos (HU-67 CA-01: "hasta 3 espacios por día").
6. **Hoy** se resalta solo en la semana actual; en la próxima ningún día está resaltado.
7. **El rango del encabezado** muestra el día y el mes corto del lunes y del domingo: "12 – 18 oct". Si la semana cruza de mes se dice en los dos: "28 sep – 4 oct". Si cruza de año: "29 dic – 4 ene".
8. **Un espacio vacío no es interactivo** (ni botón ni link) hasta que exista el flujo de asignar (SCRUM-100). Sin controles muertos que confundan.
9. **Hoy y la semana se calculan una vez, al abrir la pantalla.** Si pasa la medianoche con la pantalla abierta no se actualizan; se corrigen al recargar. No se justifica un temporizador para un caso así.
10. Los nombres de los días y de los meses vienen de constantes en español, no de `Intl`: así el servidor y el navegador dibujan exactamente el mismo texto.

## 6. Estados

| Pantalla | Estado | Notas |
|---|---|---|
| Planificador | `weekOffset`: `current` · `next` | Una unión derivada de constantes, no un booleano. No hay estados de carga ni error porque no hay datos remotos |

"Hoy" es un valor del navegador: hasta que se conoce (antes de la hidratación) la pantalla no dibuja la grilla, para no mostrar un día resaltado que luego cambie (regla 10 y plan.md).

## 7. Errores

No aplica: la pantalla no llama a ningún servicio. Las flechas deshabilitadas son el único "límite" y no son un error.

## 8. UI esperada

- Encabezado con "Recetas", como en el catálogo, y debajo los **sub-tabs** "Recetas" / "Planificador semanal", con el segundo activo.
- Debajo, el **selector de semana**: flecha atrás, el rango ("12 – 18 oct") y flecha adelante. Con un texto de apoyo que dice cuál es: "Esta semana" o "Próxima semana".
- Desktop (`md` en adelante): grilla de 7 columnas, una por día. Cada columna tiene la etiqueta del día ("Lun 12") y debajo los 3 espacios.
- Mobile: los 7 días apilados, cada uno con su etiqueta ("Lunes 12") y debajo sus 3 espacios.
- Espacio vacío: caja con borde punteado y el texto "+ Desayuno", "+ Almuerzo" o "+ Cena".
- El día de hoy con la etiqueta en teal, como en el mockup (`docs/mockup-web-v2.html`).
- El mismo HTML sirve para desktop y mobile: solo cambia la disposición con CSS (`md:grid` / apilado), igual que el shell, sin medir el ancho en JS.

## 9. Accesibilidad

- Las flechas son botones con nombre ("Semana anterior" / "Semana siguiente"); deshabilitadas, el lector de pantalla las anuncia como no disponibles.
- El encabezado con el rango tiene `aria-live="polite"`: al pasar de semana el lector anuncia la nueva ("Próxima semana, 19 – 25 oct") sin que el usuario tenga que buscarla.
- La grilla es una lista de días (`<ul>` de `<li>`), y cada día contiene su lista de espacios. Cada día lleva su fecha en un `<time datetime="2026-10-12">`.
- El día de hoy lleva `aria-current="date"`: se dice con semántica, no solo con el color.
- Un espacio vacío es texto, no un botón. El "+" es decorativo (`aria-hidden`); el lector lee "Almuerzo, vacío".
- Los sub-tabs ya anuncian la página activa con `aria-current="page"`.
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
- Sin librerías nuevas.
- Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `nextjs-enterprise-patterns`, `clean-code-practices`, `unit-testing-standards`, `playwright-e2e`, `gitflow`.

## 11. Dependencias

- `@/constants`: `APP_ROUTE` (se agrega la ruta del planificador).
- `@/components/ui`: `Button` (las flechas).
- `components/recipes-tabs/` (movido desde `features/recipes/components/RecipesTabs.tsx`).
- `components/app-shell/`: ya marca "Recetas" activo en `/recetas/planificador` por su regla de subrutas (SCRUM-135); no cambia.
- Ninguna tabla, RPC ni política de Supabase.

## 12. Contratos externos

Ninguno en esta historia. Dos cosas que SCRUM-100 y SCRUM-101 van a necesitar y que esta historia deja resueltas para no repetirlas:

- **Tipos de comida:** `MEAL_TYPE` (desayuno / almuerzo / cena), en `features/meal-planner/constants/`. `meal_plans.meal_type` (documento-proyecto §6) tiene que usar estos mismos valores.
- **Fechas:** `toLocalDateKey(date)` devuelve `"2026-10-12"` en hora local. `meal_plans.date` guarda un `date` (sin hora ni zona), así que SCRUM-100 compara contra esa misma clave.

`meal_plans` la crea SCRUM-100. Si necesita una migración: la `018` ya está tomada por la PR #55 (SCRUM-67), así que sería la `019` o la que corresponda al aplicarla (`supabase/README.md#migraciones`). SCRUM-99 no necesita migración.

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

### Todas

- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` pasan.

## 14. Casos fuera de alcance

- **Asignar una receta, un cocinero o porciones a un espacio:** HU-68 (SCRUM-100). Hoy los espacios están siempre vacíos.
- **La tabla `meal_plans` y cualquier lectura o escritura de datos:** SCRUM-100.
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
- **Documentos del producto:** no cambia ninguna decisión de producto ni el modelo de datos, así que `docs/documento-proyecto.md` no se toca en esta historia.
