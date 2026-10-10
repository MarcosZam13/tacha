import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RECIPES_TAB, RECIPES_TAB_LABEL } from "@/constants";
import {
  MEAL_PLANNER_TEXT,
  MEAL_SLOT_TEXT,
  MEAL_TYPE_LABEL,
  WEEK_LIST_TEXT,
} from "../constants/meal-planner.constants";

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
  // Los espacios son botones cuyo nombre termina en lo que pasa al tocarlos.
  const getSlotButtons = (): HTMLElement[] => screen.getAllByRole("button", { name: /, (vacío, asignar|cambiar)$/ });
  const getSlotButton = (name: string): HTMLElement => screen.getByRole("button", { name });

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

  // Busca por el texto de la comida: en los vacíos ("+ Almuerzo") y también en los asignados, que la muestran como etiqueta.
  const getEmptySlots = (mealLabel: string): HTMLElement[] => screen.getAllByText(mealLabel);
  const queryAllEmptySlots = (): HTMLElement[] =>
    Object.values(MEAL_TYPE_LABEL).flatMap((mealLabel) => screen.queryAllByText(mealLabel));

  // --- El diálogo de asignar (SCRUM-100) ---

  const getDialog = (title: string): HTMLElement => screen.getByRole("dialog", { name: title });
  const queryDialog = (): HTMLElement | null => screen.queryByRole("dialog");
  const inDialog = () => within(screen.getByRole("dialog"));

  const getDialogSubtitle = (subtitle: string): HTMLElement => inDialog().getByText(subtitle);
  // Cada receta es una opción de radio cuyo nombre empieza con el de la receta y sigue con sus porciones base.
  const getRecipeRadio = (recipeName: string): HTMLElement =>
    inDialog().getByRole("radio", { name: new RegExp(`^${recipeName}`) });
  const findRecipeRadio = (recipeName: string): Promise<HTMLElement> =>
    within(screen.getByRole("dialog")).findByRole("radio", { name: new RegExp(`^${recipeName}`) });
  const getCookRadio = (cookName: string): HTMLElement => inDialog().getByRole("radio", { name: cookName });
  const getServingsSummary = (): HTMLElement => inDialog().getByText(/^×/);
  const getIncreaseServingsButton = (): HTMLElement =>
    inDialog().getByRole("button", { name: MEAL_SLOT_TEXT.INCREASE_SERVINGS });
  const getDecreaseServingsButton = (): HTMLElement =>
    inDialog().getByRole("button", { name: MEAL_SLOT_TEXT.DECREASE_SERVINGS });
  const getSaveButton = (): HTMLElement => inDialog().getByRole("button", { name: /^(Guardar|Guardando)/ });
  const getRemoveButton = (): HTMLElement => inDialog().getByRole("button", { name: MEAL_SLOT_TEXT.REMOVE });
  const queryRemoveButton = (): HTMLElement | null => inDialog().queryByRole("button", { name: MEAL_SLOT_TEXT.REMOVE });
  const getCancelButton = (): HTMLElement => inDialog().getByRole("button", { name: MEAL_SLOT_TEXT.CANCEL });
  const getDialogAlert = (): HTMLElement => inDialog().getByRole("alert");
  const getCreateRecipeLink = (): HTMLElement => inDialog().getByRole("link", { name: MEAL_SLOT_TEXT.CREATE_RECIPE });
  const getDialogRetryButton = (): HTMLElement => inDialog().getByRole("button", { name: MEAL_SLOT_TEXT.RETRY });

  // El error de carga del plan está fuera del diálogo (que está cerrado cuando se ve).
  const getPlanError = (): HTMLElement => screen.getByRole("alert");
  const getPlanRetryButton = (): HTMLElement => screen.getByRole("button", { name: MEAL_SLOT_TEXT.RETRY });

  const getFocusedElement = (): Element | null => document.activeElement;

  /** Espera a que el plan se lea: antes, los espacios están deshabilitados. */
  const waitForEnabledSlot = async (name: string): Promise<void> => {
    await waitFor(() => {
      if (getSlotButton(name).hasAttribute("disabled")) throw new Error(`El espacio "${name}" sigue deshabilitado`);
    });
  };

  const openSlot = async (name: string): Promise<void> => {
    await user.click(getSlotButton(name));
  };
  const chooseRecipe = async (recipeName: string): Promise<void> => {
    await user.click(await findRecipeRadio(recipeName));
  };
  const chooseCook = async (cookName: string): Promise<void> => {
    await user.click(getCookRadio(cookName));
  };
  const increaseServings = async (): Promise<void> => {
    await user.click(getIncreaseServingsButton());
  };
  const decreaseServings = async (): Promise<void> => {
    await user.click(getDecreaseServingsButton());
  };
  const save = async (): Promise<void> => {
    await user.click(getSaveButton());
  };
  const remove = async (): Promise<void> => {
    await user.click(getRemoveButton());
  };
  const cancel = async (): Promise<void> => {
    await user.click(getCancelButton());
  };
  const pressEscape = async (): Promise<void> => {
    await user.keyboard("{Escape}");
  };
  const retryPlan = async (): Promise<void> => {
    await user.click(getPlanRetryButton());
  };

  // --- Agregar la semana a la lista (SCRUM-101) ---

  const getAddWeekButton = (): HTMLElement => screen.getByRole("button", { name: WEEK_LIST_TEXT.BUTTON });
  const getAddWeekDialog = (): HTMLElement => screen.getByRole("dialog", { name: WEEK_LIST_TEXT.DIALOG_TITLE });
  const queryAddWeekDialog = (): HTMLElement | null =>
    screen.queryByRole("dialog", { name: WEEK_LIST_TEXT.DIALOG_TITLE });
  const getAddWeekMessage = (message: string): HTMLElement => within(getAddWeekDialog()).getByText(message);
  const getAddWeekConfirmButton = (): HTMLElement =>
    within(getAddWeekDialog()).getByRole("button", { name: /^(Agregar|Agregando)/ });
  const getAddWeekCancelButton = (): HTMLElement =>
    within(getAddWeekDialog()).getByRole("button", { name: WEEK_LIST_TEXT.CANCEL });
  const getAddWeekError = (): HTMLElement => within(getAddWeekDialog()).getByRole("alert");
  const getAddWeekResult = (line: string): HTMLElement => screen.getByText(line);
  const queryAddWeekResult = (line: string): HTMLElement | null => screen.queryByText(line);
  const getViewListLink = (): HTMLElement => screen.getByRole("link", { name: WEEK_LIST_TEXT.VIEW_LIST });
  const queryViewListLink = (): HTMLElement | null => screen.queryByRole("link", { name: WEEK_LIST_TEXT.VIEW_LIST });

  const openAddWeek = async (): Promise<void> => {
    await user.click(getAddWeekButton());
  };
  const confirmAddWeek = async (): Promise<void> => {
    await user.click(getAddWeekConfirmButton());
  };
  const cancelAddWeek = async (): Promise<void> => {
    await user.click(getAddWeekCancelButton());
  };

  const goToNextWeek = async (): Promise<void> => {
    await user.click(getNextWeekButton());
  };

  const goToPreviousWeek = async (): Promise<void> => {
    await user.click(getPreviousWeekButton());
  };

  return {
    cancel,
    cancelAddWeek,
    confirmAddWeek,
    getAddWeekButton,
    getAddWeekCancelButton,
    getAddWeekConfirmButton,
    getAddWeekDialog,
    getAddWeekError,
    getAddWeekMessage,
    getAddWeekResult,
    getViewListLink,
    openAddWeek,
    queryAddWeekDialog,
    queryAddWeekResult,
    queryViewListLink,
    chooseCook,
    chooseRecipe,
    decreaseServings,
    findRecipeRadio,
    getCancelButton,
    getCookRadio,
    getCreateRecipeLink,
    getDecreaseServingsButton,
    getDialog,
    getDialogAlert,
    getDialogRetryButton,
    getDialogSubtitle,
    getFocusedElement,
    getIncreaseServingsButton,
    getPlanError,
    getPlanRetryButton,
    getRecipeRadio,
    getRemoveButton,
    getSaveButton,
    getServingsSummary,
    increaseServings,
    openSlot,
    pressEscape,
    queryDialog,
    queryRemoveButton,
    remove,
    retryPlan,
    save,
    waitForEnabledSlot,
    getDay,
    getDays,
    getEmptySlots,
    getNextWeekButton,
    getPlannerTab,
    getPreviousWeekButton,
    getRange,
    getSlotButton,
    getSlotButtons,
    getRecipesTab,
    getTitle,
    getWeekLabel,
    goToNextWeek,
    goToPreviousWeek,
    queryAllEmptySlots,
    queryDays,
  };
};
