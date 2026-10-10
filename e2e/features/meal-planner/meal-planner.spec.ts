import { expect, test } from "@playwright/test";
import { createOwnRecipe, deleteOwnListItems, deleteOwnRecipes } from "../../support/supabase";
import {
  DAYS_IN_WEEK,
  PLANNER_PATH,
  RECIPES_PATH,
  expectedTodayDate,
  expectedWeekDates,
  getAppNavItem,
  assignRecipeToToday,
  getAddWeekButton,
  getAddWeekDialog,
  getAssignDialog,
  getDayDates,
  getEmptySlots,
  getRecipesSubTab,
  getTodayDate,
  getTodaySlot,
  getWeekArrow,
} from "./meal-planner.helpers";

// Escenarios: features/meal-planner/specs/E2E.md. Los textos se escriben acá a
// propósito (oráculo independiente del código, playwright-e2e).
const PLANNER_TAB = "Planificador semanal";
const RECIPES_TAB = "Recetas";
const PREVIOUS_WEEK = "Semana anterior";
const NEXT_WEEK = "Semana siguiente";
const MEALS = ["Desayuno", "Almuerzo", "Cena"] as const;
// Anchos de prueba a cada lado del breakpoint `md` (768 px) de Tailwind.
const DESKTOP_VIEWPORT = { height: 800, width: 1280 };
const PHONE_VIEWPORT = { height: 915, width: 412 };

test.describe("Planificador semanal", () => {
  test("E2E-PLANNER-01 — Ir y volver entre los sub-tabs de Recetas", async ({ page }) => {
    await page.goto(PLANNER_PATH);

    await expect(page).toHaveURL(PLANNER_PATH);
    await expect(getRecipesSubTab(page, PLANNER_TAB)).toHaveAttribute("aria-current", "page");
    await expect(getRecipesSubTab(page, RECIPES_TAB)).not.toHaveAttribute("aria-current", "page");
    await expect(getAppNavItem(page, RECIPES_TAB)).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Próximamente")).toHaveCount(0);

    await getRecipesSubTab(page, RECIPES_TAB).click();

    await expect(page).toHaveURL(RECIPES_PATH);
    await expect(getRecipesSubTab(page, RECIPES_TAB)).toHaveAttribute("aria-current", "page");

    await getRecipesSubTab(page, PLANNER_TAB).click();

    await expect(page).toHaveURL(PLANNER_PATH);
    await expect(getRecipesSubTab(page, PLANNER_TAB)).toHaveAttribute("aria-current", "page");
  });

  test("E2E-PLANNER-02 — Ver la semana actual con sus espacios y hoy", async ({ page }) => {
    await page.goto(PLANNER_PATH);

    await expect(page.getByText("Esta semana")).toBeVisible();
    // La forma del rango: "12 – 18 oct" o "28 sep – 4 oct" si cruza de mes.
    await expect(page.getByText(/^\d{1,2}( [a-z]{3})? – \d{1,2} [a-z]{3}$/)).toBeVisible();

    await expect(getDayDates(page)).toHaveCount(DAYS_IN_WEEK);
    const dayDates = await getDayDates(page).evaluateAll((days) => days.map((day) => day.getAttribute("datetime")));
    expect(dayDates).toEqual(expectedWeekDates(0));

    for (const meal of MEALS) {
      await expect(getEmptySlots(page, meal)).toHaveCount(DAYS_IN_WEEK);
    }

    await expect(getTodayDate(page)).toHaveCount(1);
    await expect(getTodayDate(page)).toHaveAttribute("datetime", expectedTodayDate());

    // Cada espacio es un botón con su nombre completo ("Almuerzo del lunes 12, vacío, asignar"):
    // un usuario nuevo no tiene nada planeado, así que los 21 están vacíos.
    await expect(page.getByRole("button", { name: /, vacío, asignar$/ })).toHaveCount(DAYS_IN_WEEK * MEALS.length);
  });

  test("E2E-PLANNER-03 — Pasar a la próxima semana y volver", async ({ page }) => {
    await page.goto(PLANNER_PATH);
    await expect(getWeekArrow(page, PREVIOUS_WEEK)).toBeDisabled();
    await expect(getWeekArrow(page, NEXT_WEEK)).toBeEnabled();

    await getWeekArrow(page, NEXT_WEEK).click();

    await expect(page.getByText("Próxima semana")).toBeVisible();
    await expect(getDayDates(page)).toHaveCount(DAYS_IN_WEEK);
    const nextDates = await getDayDates(page).evaluateAll((days) => days.map((day) => day.getAttribute("datetime")));
    expect(nextDates).toEqual(expectedWeekDates(1));
    await expect(getTodayDate(page)).toHaveCount(0);
    await expect(getWeekArrow(page, NEXT_WEEK)).toBeDisabled();
    await expect(getWeekArrow(page, PREVIOUS_WEEK)).toBeEnabled();

    await getWeekArrow(page, PREVIOUS_WEEK).click();

    await expect(page.getByText("Esta semana")).toBeVisible();
    const currentDates = await getDayDates(page).evaluateAll((days) => days.map((day) => day.getAttribute("datetime")));
    expect(currentDates).toEqual(expectedWeekDates(0));
    await expect(getTodayDate(page)).toHaveAttribute("datetime", expectedTodayDate());
    await expect(getWeekArrow(page, PREVIOUS_WEEK)).toBeDisabled();
  });

  // El ancho lo fija cada bloque y no el proyecto: así la disposición se prueba
  // igual en los dos proyectos, sin condicionales dentro de los tests.
  test.describe("a desktop width", () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test("E2E-PLANNER-04 — En desktop los días van en 7 columnas", async ({ page }) => {
      await page.goto(PLANNER_PATH);
      await expect(getDayDates(page)).toHaveCount(DAYS_IN_WEEK);

      const firstDay = await getDayDates(page).nth(0).boundingBox();
      const secondDay = await getDayDates(page).nth(1).boundingBox();

      // Se mide el <time> de cada día: la etiqueta visible (larga o corta) está dentro y el CSS esconde la otra.
      // Segundo día al lado del primero: misma fila, más a la derecha.
      expect(secondDay?.y).toBeCloseTo(firstDay?.y ?? NaN, 0);
      expect(secondDay?.x).toBeGreaterThan(firstDay?.x ?? NaN);
    });
  });

  test.describe("a phone width", () => {
    test.use({ viewport: PHONE_VIEWPORT });

    test("E2E-PLANNER-05 — En mobile los días se apilan sin desplazamiento horizontal", async ({ page }) => {
      await page.goto(PLANNER_PATH);
      await expect(getDayDates(page)).toHaveCount(DAYS_IN_WEEK);

      const firstDay = await getDayDates(page).nth(0).boundingBox();
      const secondDay = await getDayDates(page).nth(1).boundingBox();
      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

      // Segundo día debajo del primero: misma columna, más abajo.
      expect(secondDay?.x).toBeCloseTo(firstDay?.x ?? NaN, 0);
      expect(secondDay?.y).toBeGreaterThan(firstDay?.y ?? NaN);
      expect(hasHorizontalScroll).toBe(false);
    });
  });
});

// Para asignar hace falta tener recetas: se crean con la API de Supabase usando la sesión
// de la propia página, y al terminar se borran (con ellas, sus espacios del plan).
const FLAN = "E2E Flan";
const ARROZ = "E2E Arroz";
const FLAN_BASE_SERVINGS = 6;
const ARROZ_BASE_SERVINGS = 4;
// Abrir la pantalla crea una sesión anónima y lee el plan de la base compartida: con varias pruebas
// a la vez puede pasar de los 5 s por defecto (ver "Fallo intermitente observado" en E2E.md).
const SESSION_AND_PLAN_TIMEOUT_MS = 15_000;

test.describe("Asignar comidas al plan", () => {
  test.beforeEach(async ({ page, request }) => {
    await page.goto(PLANNER_PATH);
    // El espacio se habilita cuando el plan ya se leyó: para entonces hay sesión abierta.
    await expect(getTodaySlot(page, "Almuerzo")).toBeEnabled({ timeout: SESSION_AND_PLAN_TIMEOUT_MS });
    await createOwnRecipe(page, request, FLAN, FLAN_BASE_SERVINGS);
    await createOwnRecipe(page, request, ARROZ, ARROZ_BASE_SERVINGS);
  });

  test.afterEach(async ({ page, request }) => {
    // E2E-PLANNER-09 escribe en la lista general: se limpia junto con las recetas.
    await deleteOwnListItems(page, request);
    await deleteOwnRecipes(page, request);
  });

  test("E2E-PLANNER-06 — Asignar una receta a un espacio y que siga después de recargar", async ({ page }) => {
    await getTodaySlot(page, "Almuerzo").click();
    const dialog = getAssignDialog(page, "Asignar comida");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await dialog.getByRole("radio", { name: new RegExp(`^${FLAN}`) }).check();
    await dialog.getByRole("button", { name: "Más porciones" }).click();
    await expect(dialog.getByText("×1,5 · 9 porciones")).toBeVisible();
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(dialog).toBeHidden();
    await expect(getTodaySlot(page, "Almuerzo")).toContainText(FLAN);
    await expect(getTodaySlot(page, "Almuerzo")).toContainText("Yo");
    await expect(getTodaySlot(page, "Almuerzo")).toContainText("×1,5");

    await page.reload();

    await expect(getTodaySlot(page, "Almuerzo")).toContainText(FLAN);
    await expect(getTodaySlot(page, "Almuerzo")).toContainText("×1,5");
  });

  test("E2E-PLANNER-07 — Reasignar y quitar una comida", async ({ page }) => {
    await assignRecipeToToday(page, "Cena", FLAN);

    await getTodaySlot(page, "Cena").click();
    const dialog = getAssignDialog(page, "Cambiar comida");
    await expect(dialog.getByRole("radio", { name: new RegExp(`^${FLAN}`) })).toBeChecked();
    await dialog.getByRole("radio", { name: new RegExp(`^${ARROZ}`) }).check();
    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(dialog).toBeHidden();
    await expect(getTodaySlot(page, "Cena")).toContainText(ARROZ);
    await expect(getTodaySlot(page, "Cena")).not.toContainText(FLAN);
    await page.reload();
    await expect(getTodaySlot(page, "Cena")).toContainText(ARROZ);

    await getTodaySlot(page, "Cena").click();
    await getAssignDialog(page, "Cambiar comida").getByRole("button", { name: "Quitar" }).click();

    await expect(getAssignDialog(page, "Cambiar comida")).toBeHidden();
    await expect(getTodaySlot(page, "Cena")).toHaveAccessibleName(/, vacío, asignar$/);
    await page.reload();
    await expect(getTodaySlot(page, "Cena")).toHaveAccessibleName(/, vacío, asignar$/);
  });

  test("E2E-PLANNER-08 — Eliminar una receta que está en el plan avisa y libera sus espacios", async ({ page }) => {
    await assignRecipeToToday(page, "Almuerzo", FLAN);
    await assignRecipeToToday(page, "Cena", FLAN);
    await page.goto(RECIPES_PATH);

    await page.getByRole("button", { name: `Eliminar ${FLAN}` }).click();

    const deleteDialog = page.getByRole("dialog", { name: "¿Eliminar esta receta?" });
    await expect(deleteDialog.getByText("Está en 2 espacios de tu plan; quedarán vacíos.")).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(page.getByRole("heading", { name: FLAN })).toHaveCount(0);

    await page.goto(PLANNER_PATH);
    await expect(getTodaySlot(page, "Almuerzo")).toHaveAccessibleName(/, vacío, asignar$/);
    await expect(getTodaySlot(page, "Cena")).toHaveAccessibleName(/, vacío, asignar$/);
  });

  test("E2E-PLANNER-09 — Agregar la semana a la lista", async ({ page }) => {
    await assignRecipeToToday(page, "Almuerzo", FLAN);
    await assignRecipeToToday(page, "Cena", FLAN);

    await getAddWeekButton(page).click();
    const dialog = getAddWeekDialog(page);
    await expect(dialog.getByText(/ingredientes de 2 comidas/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver lista" })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("link", { name: "Ver lista" })).toHaveCount(0);

    await getAddWeekButton(page).click();
    await dialog.getByRole("button", { name: "Agregar", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(/^Agregaste \d+ ingredientes? de 2 comidas a tu lista\.$/)).toBeVisible();
    await page.getByRole("link", { name: "Ver lista" }).click();
    await expect(page).toHaveURL("/lista");
  });

  test("E2E-PLANNER-10 — El botón de agregar la semana sigue a las comidas de la semana a la vista", async ({
    page,
  }) => {
    await expect(getAddWeekButton(page)).toBeDisabled();

    await assignRecipeToToday(page, "Almuerzo", FLAN);
    await expect(getAddWeekButton(page)).toBeEnabled();

    await getWeekArrow(page, NEXT_WEEK).click();
    await expect(getAddWeekButton(page)).toBeDisabled();

    await getWeekArrow(page, PREVIOUS_WEEK).click();
    await expect(getAddWeekButton(page)).toBeEnabled();
  });
});
