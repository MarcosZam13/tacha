import type { Locator, Page } from "@playwright/test";

// Cómo encontrar las cosas del planificador y calcular las fechas esperadas.
// Sin aserciones: eso es del test (playwright-e2e, references/standards.md).
export const PLANNER_PATH = "/recetas/planificador";
export const RECIPES_PATH = "/recetas";

const RECIPES_TABS_NAME = "Secciones de recetas";
const APP_NAV_NAME = "Secciones de la app";
export const DAYS_IN_WEEK = 7;

export const getRecipesTabs = (page: Page): Locator => page.getByRole("navigation", { name: RECIPES_TABS_NAME });

export const getRecipesSubTab = (page: Page, label: string): Locator =>
  getRecipesTabs(page).getByRole("link", { name: label, exact: true });

/** El ítem del menú de la app (sidebar o tabs, el que se vea en este ancho). */
export const getAppNavItem = (page: Page, label: string): Locator =>
  page
    .getByRole("navigation", { name: APP_NAV_NAME })
    .filter({ visible: true })
    .getByRole("link", { name: label, exact: true });

export const getWeekArrow = (page: Page, name: string): Locator => page.getByRole("button", { name });

/** Las fechas de los 7 días de la grilla, en el orden en que se ven. */
export const getDayDates = (page: Page): Locator => page.locator("main time[datetime]");

export const getTodayDate = (page: Page): Locator => page.locator('main time[aria-current="date"]');

/**
 * Los espacios de una comida: el <li> de cada día cuyo texto es "+ Almuerzo, vacío".
 * Se acota a los <li> anidados de la pantalla: así no cuenta el menú ni el día que los contiene.
 */
export const getEmptySlots = (page: Page, mealLabel: string): Locator =>
  page.locator("main li li").filter({ hasText: mealLabel });

/** El día de hoy de la grilla: el <li> que contiene la fecha marcada como hoy. */
const getTodayItem = (page: Page): Locator =>
  page.locator("main li").filter({ has: page.locator('time[aria-current="date"]') });

/**
 * El espacio de una comida de hoy ("Desayuno", "Almuerzo" o "Cena"): un botón cuyo nombre
 * empieza con la comida ("Almuerzo del lunes 12, vacío, asignar"). Hoy siempre está en la
 * semana actual, así que no depende de qué día de la semana sea.
 */
export const getTodaySlot = (page: Page, mealLabel: string): Locator =>
  getTodayItem(page).getByRole("button", { name: new RegExp(`^${mealLabel} del `) });

export const getAssignDialog = (page: Page, title: string): Locator => page.getByRole("dialog", { name: title });

const ADD_WEEK_LABEL = "Agregar semana a la lista";

/** El botón que agrega la semana a la vista a la lista. */
export const getAddWeekButton = (page: Page): Locator => page.getByRole("button", { name: ADD_WEEK_LABEL });

/** La confirmación de agregar la semana (el mismo texto que el botón, pero con rol de diálogo). */
export const getAddWeekDialog = (page: Page): Locator => page.getByRole("dialog", { name: ADD_WEEK_LABEL });

/** Las filas de la sección "Pendientes" de /lista: lo que la semana agregó. */
export const getPendingListRows = (page: Page): Locator =>
  page.getByRole("region", { name: "Pendientes" }).getByRole("listitem");

/** Asigna una receta (por su nombre) al espacio de hoy. Espera a que el diálogo se cierre. */
export const assignRecipeToToday = async (page: Page, mealLabel: string, recipeName: string): Promise<void> => {
  await getTodaySlot(page, mealLabel).click();
  const dialog = getAssignDialog(page, "Asignar comida");
  await dialog.getByRole("radio", { name: new RegExp(`^${recipeName}`) }).check();
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await dialog.waitFor({ state: "hidden" });
};

// --- Fechas esperadas, con aritmética propia (oráculo independiente de la app) ---

const pad = (value: number): string => String(value).padStart(2, "0");

const toKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** El lunes de la semana de hoy más `weeksAhead` semanas, como "2026-10-12". */
const mondayKey = (weeksAhead: number): string => {
  const today = new Date();
  const daysSinceMonday = (today.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  return toKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday + weeksAhead * DAYS_IN_WEEK));
};

/** Las 7 fechas (lunes a domingo) de la semana de hoy más `weeksAhead` semanas. */
export const expectedWeekDates = (weeksAhead: number): string[] => {
  const [year, month, day] = mondayKey(weeksAhead).split("-").map(Number);
  return Array.from({ length: DAYS_IN_WEEK }, (_, offset) => toKey(new Date(year, month - 1, day + offset)));
};

export const expectedTodayDate = (): string => toKey(new Date());
