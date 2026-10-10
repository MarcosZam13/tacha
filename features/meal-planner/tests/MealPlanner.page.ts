import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RECIPES_TAB, RECIPES_TAB_LABEL } from "@/constants";
import { MEAL_PLANNER_TEXT, MEAL_TYPE_LABEL } from "../constants/meal-planner.constants";

/**
 * Page Object del planificador semanal: cómo encontrar sus elementos y las
 * acciones del usuario. Sin aserciones: las hace el test.
 */
export const createMealPlannerPage = () => {
  const user = userEvent.setup();

  const getTitle = (): HTMLElement => screen.getByRole("heading", { level: 1, name: MEAL_PLANNER_TEXT.TITLE });
  const getPlannerTab = (): HTMLElement =>
    screen.getByRole("link", { name: RECIPES_TAB_LABEL[RECIPES_TAB.PLANNER] });
  const getRecipesTab = (): HTMLElement =>
    screen.getByRole("link", { name: RECIPES_TAB_LABEL[RECIPES_TAB.RECIPES] });

  const getPreviousWeekButton = (): HTMLElement =>
    screen.getByRole("button", { name: MEAL_PLANNER_TEXT.PREVIOUS_WEEK_ARROW });
  const getNextWeekButton = (): HTMLElement => screen.getByRole("button", { name: MEAL_PLANNER_TEXT.NEXT_WEEK_ARROW });
  const getButtons = (): HTMLElement[] => screen.getAllByRole("button");

  const getRange = (range: string): HTMLElement => screen.getByText(range);
  const getWeekLabel = (label: string): HTMLElement => screen.getByText(label);

  // Las etiquetas larga ("Lunes 12") y corta ("Lun 12") están las dos en el
  // HTML y el CSS muestra una; se busca el <time> que las contiene.
  const getDay = (shortLabel: string): HTMLElement => {
    const day = screen.getByText(shortLabel).closest("time");
    if (!day) throw new Error(`No hay un <time> para ${shortLabel}`);
    return day;
  };
  const getDays = (): HTMLElement[] => screen.getAllByRole("time");
  const queryDays = (): HTMLElement[] => screen.queryAllByRole("time");

  // Un espacio vacío es un <li> cuyo texto propio es el nombre de la comida.
  const getEmptySlots = (mealLabel: string): HTMLElement[] => screen.getAllByText(mealLabel);
  const queryAllEmptySlots = (): HTMLElement[] =>
    Object.values(MEAL_TYPE_LABEL).flatMap((mealLabel) => screen.queryAllByText(mealLabel));

  const goToNextWeek = async (): Promise<void> => {
    await user.click(getNextWeekButton());
  };

  const goToPreviousWeek = async (): Promise<void> => {
    await user.click(getPreviousWeekButton());
  };

  return {
    getButtons,
    getDay,
    getDays,
    getEmptySlots,
    getNextWeekButton,
    getPlannerTab,
    getPreviousWeekButton,
    getRange,
    getRecipesTab,
    getTitle,
    getWeekLabel,
    goToNextWeek,
    goToPreviousWeek,
    queryAllEmptySlots,
    queryDays,
  };
};
