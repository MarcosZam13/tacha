import { expect, test } from "@playwright/test";
import {
  DAYS_IN_WEEK,
  PLANNER_PATH,
  RECIPES_PATH,
  expectedTodayDate,
  expectedWeekDates,
  getAppNavItem,
  getDayDates,
  getEmptySlots,
  getRecipesSubTab,
  getTodayDate,
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

    // Los espacios no son botones: los únicos son las dos flechas de semana.
    await expect(page.locator("main").getByRole("button")).toHaveCount(2);
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
