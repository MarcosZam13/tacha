// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import { useToday } from "../hooks/useToday";
import type { MealPlanEntry, RecipeOption } from "../models/meal-plan.interfaces";
import { MealPlanner } from "../MealPlanner";
import { clearMealSlot, getMealPlan, getRecipeOptions, saveMealSlot } from "../services/meal-plan.service";
import { createMealPlannerPage } from "./MealPlanner.page";

vi.mock("../hooks/useToday", () => ({ useToday: vi.fn() }));
const useTodayMock = vi.mocked(useToday);

// Sin Supabase real: el plan, las recetas y los cambios salen de servicios simulados.
vi.mock("../services/meal-plan.service", () => ({
  clearMealSlot: vi.fn(),
  getMealPlan: vi.fn(),
  getRecipeOptions: vi.fn(),
  saveMealSlot: vi.fn(),
}));
const getMealPlanMock = vi.mocked(getMealPlan);
const getRecipeOptionsMock = vi.mocked(getRecipeOptions);
const saveMealSlotMock = vi.mocked(saveMealSlot);
const clearMealSlotMock = vi.mocked(clearMealSlot);

// El 14 de octubre de 2026 es miércoles: la semana actual va del 12 al 18 y la próxima, del 19 al 25.
const WEDNESDAY = new Date(2026, 9, 14);

const ARROZ: RecipeOption = { baseServings: 6, id: "recipe-arroz", name: "Arroz con leche", servingsLabel: "6 porciones" };
const FLAN: RecipeOption = { baseServings: 4, id: "recipe-flan", name: "Flan", servingsLabel: "4 porciones" };
const TRES_LECHES: RecipeOption = {
  baseServings: 12,
  id: "recipe-tres-leches",
  name: "Tres leches",
  servingsLabel: "12 porciones",
};

const ARROZ_LUNCH_ENTRY: MealPlanEntry = {
  baseServings: 6,
  cookChoice: COOK_CHOICE.SELF,
  cookLabel: "Yo",
  dateKey: "2026-10-12",
  id: "slot-1",
  mealType: MEAL_TYPE.LUNCH,
  multiplierLabel: "×2",
  recipeId: "recipe-arroz",
  recipeName: "Arroz con leche",
  servingsMultiplier: 2,
};

const EMPTY_MONDAY_DINNER = "Cena del lunes 12, vacío, asignar";
const ASSIGNED_MONDAY_LUNCH = "Almuerzo del lunes 12: Arroz con leche, cambiar";

const renderPlanner = async (plan: MealPlanEntry[] = [ARROZ_LUNCH_ENTRY]): Promise<ReturnType<typeof createMealPlannerPage>> => {
  useTodayMock.mockReturnValue(WEDNESDAY);
  getMealPlanMock.mockResolvedValue(plan);
  render(<MealPlanner />);
  const page = createMealPlannerPage();
  await page.waitForEnabledSlot(EMPTY_MONDAY_DINNER);
  return page;
};

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getRecipeOptionsMock.mockResolvedValue([ARROZ, FLAN, TRES_LECHES]);
});

describe("MealPlanner: the plan", () => {
  it("keeps the slots disabled until the plan is read", async () => {
    let resolvePlan: (plan: MealPlanEntry[]) => void = () => undefined;
    getMealPlanMock.mockReturnValue(new Promise((resolve) => (resolvePlan = resolve)));
    useTodayMock.mockReturnValue(WEDNESDAY);
    render(<MealPlanner />);
    const page = createMealPlannerPage();

    expect(page.getSlotButton(EMPTY_MONDAY_DINNER)).toBeDisabled();

    resolvePlan([]);
    await page.waitForEnabledSlot(EMPTY_MONDAY_DINNER);
    expect(page.getSlotButton(EMPTY_MONDAY_DINNER)).toBeEnabled();
  });

  it("shows an assigned slot with its recipe, its cook and its multiplier", async () => {
    const page = await renderPlanner();

    const slot = page.getSlotButton(ASSIGNED_MONDAY_LUNCH);
    expect(slot).toHaveTextContent("Arroz con leche");
    expect(slot).toHaveTextContent("Yo");
    expect(slot).toHaveTextContent("×2");
  });

  it("says the plan could not be loaded, keeps the slots disabled and loads it on retry", async () => {
    useTodayMock.mockReturnValue(WEDNESDAY);
    getMealPlanMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([]);
    render(<MealPlanner />);
    const page = createMealPlannerPage();

    await waitFor(() => expect(page.getPlanError()).toHaveTextContent("No se pudo cargar tu plan. Intenta de nuevo."));
    expect(page.getSlotButton(EMPTY_MONDAY_DINNER)).toBeDisabled();

    await page.retryPlan();
    await page.waitForEnabledSlot(EMPTY_MONDAY_DINNER);
    expect(getMealPlanMock).toHaveBeenCalledTimes(2);
  });
});

describe("MealPlanner: assigning a recipe to an empty slot", () => {
  it("opens the dialog for that day and meal with the recipes and no recipe chosen", async () => {
    const page = await renderPlanner();

    await page.openSlot(EMPTY_MONDAY_DINNER);

    expect(page.getDialog("Asignar comida")).toBeInTheDocument();
    expect(page.getDialogSubtitle("Cena del lunes 12")).toBeInTheDocument();
    expect(await page.findRecipeRadio("Arroz con leche")).not.toBeChecked();
    expect(page.getRecipeRadio("Flan")).toHaveAccessibleName("Flan 4 porciones");
    expect(page.getCookRadio("Yo")).toBeChecked();
    expect(page.getServingsSummary()).toHaveTextContent("×1");
    expect(page.getSaveButton()).toBeDisabled();
    expect(page.queryRemoveButton()).not.toBeInTheDocument();
  });

  it("lets the user save once a recipe is chosen", async () => {
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);

    await page.chooseRecipe("Flan");

    expect(page.getRecipeRadio("Flan")).toBeChecked();
    expect(page.getSaveButton()).toBeEnabled();
    expect(page.getServingsSummary()).toHaveTextContent("×1 · 4 porciones");
  });

  it("saves the slot, closes the dialog and shows the recipe in the grid", async () => {
    saveMealSlotMock.mockResolvedValue({ slotId: "slot-new" });
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);
    await page.chooseRecipe("Flan");

    await page.save();

    expect(saveMealSlotMock).toHaveBeenCalledWith({
      cookChoice: COOK_CHOICE.SELF,
      dateKey: "2026-10-12",
      mealType: MEAL_TYPE.DINNER,
      recipeId: "recipe-flan",
      servingsMultiplier: 1,
    });
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getSlotButton("Cena del lunes 12: Flan, cambiar")).toHaveTextContent("Flan");
  });

  it("changes the multiplier by half a step with the resulting servings, and saves it", async () => {
    saveMealSlotMock.mockResolvedValue({ slotId: "slot-new" });
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);
    await page.chooseRecipe("Tres leches");

    await page.increaseServings();
    expect(page.getServingsSummary()).toHaveTextContent("×1,5 · 18 porciones");

    await page.save();

    expect(saveMealSlotMock).toHaveBeenCalledWith(expect.objectContaining({ servingsMultiplier: 1.5 }));
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getSlotButton("Cena del lunes 12: Tres leches, cambiar")).toHaveTextContent("×1,5");
  });

  it("disables the multiplier buttons at both ends", async () => {
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);

    await page.decreaseServings();
    expect(page.getServingsSummary()).toHaveTextContent("×0,5");
    expect(page.getDecreaseServingsButton()).toBeDisabled();

    for (let step = 0; step < 7; step += 1) await page.increaseServings();
    expect(page.getServingsSummary()).toHaveTextContent("×4");
    expect(page.getIncreaseServingsButton()).toBeDisabled();
  });

  it("saves a slot without a cook and shows no cook in the grid", async () => {
    saveMealSlotMock.mockResolvedValue({ slotId: "slot-new" });
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);
    await page.chooseRecipe("Flan");
    await page.chooseCook("Sin cocinero");

    await page.save();

    expect(saveMealSlotMock).toHaveBeenCalledWith(expect.objectContaining({ cookChoice: COOK_CHOICE.NONE }));
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getSlotButton("Cena del lunes 12: Flan, cambiar")).not.toHaveTextContent("Yo");
  });
});

describe("MealPlanner: changing and removing an assignment", () => {
  it("opens an assigned slot with its own values and the remove button", async () => {
    const page = await renderPlanner();

    await page.openSlot(ASSIGNED_MONDAY_LUNCH);

    expect(page.getDialog("Cambiar comida")).toBeInTheDocument();
    expect(await page.findRecipeRadio("Arroz con leche")).toBeChecked();
    expect(page.getServingsSummary()).toHaveTextContent("×2 · 12 porciones");
    expect(page.getRemoveButton()).toBeInTheDocument();
    expect(page.getSaveButton()).toBeEnabled();
  });

  it("replaces the recipe of an assigned slot when the user saves another one", async () => {
    saveMealSlotMock.mockResolvedValue({ slotId: "slot-1" });
    const page = await renderPlanner();
    await page.openSlot(ASSIGNED_MONDAY_LUNCH);
    await page.chooseRecipe("Flan");

    await page.save();

    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getSlotButton("Almuerzo del lunes 12: Flan, cambiar")).toBeInTheDocument();
    expect(() => page.getSlotButton(ASSIGNED_MONDAY_LUNCH)).toThrow();
  });

  it("removes the assignment and leaves the slot empty, without asking for confirmation", async () => {
    clearMealSlotMock.mockResolvedValue({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH });
    const page = await renderPlanner();
    await page.openSlot(ASSIGNED_MONDAY_LUNCH);
    await page.findRecipeRadio("Arroz con leche");

    await page.remove();

    expect(clearMealSlotMock).toHaveBeenCalledWith({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH });
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getSlotButton("Almuerzo del lunes 12, vacío, asignar")).toBeInTheDocument();
  });
});

describe("MealPlanner: states and errors of the dialog", () => {
  it("tells a user without recipes to create one, and cannot save", async () => {
    getRecipeOptionsMock.mockResolvedValue([]);
    const page = await renderPlanner();

    await page.openSlot(EMPTY_MONDAY_DINNER);

    await waitFor(() => expect(page.getCreateRecipeLink()).toHaveAttribute("href", "/recetas/nueva"));
    expect(page.getDialog("Asignar comida")).toHaveTextContent("Todavía no tienes recetas.");
    expect(page.getSaveButton()).toBeDisabled();
  });

  it("says the recipes could not be loaded and loads them on retry", async () => {
    getRecipeOptionsMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([FLAN]);
    const page = await renderPlanner();

    await page.openSlot(EMPTY_MONDAY_DINNER);
    await waitFor(() =>
      expect(page.getDialogAlert()).toHaveTextContent("No se pudieron cargar tus recetas. Intenta de nuevo."),
    );
    expect(page.getSaveButton()).toBeDisabled();

    await page.getDialogRetryButton().click();
    expect(await page.findRecipeRadio("Flan")).toBeInTheDocument();
  });

  it("keeps the dialog open with the error and the choice when saving fails, and saves on retry", async () => {
    saveMealSlotMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ slotId: "slot-new" });
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);
    await page.chooseRecipe("Flan");

    await page.save();

    expect(page.getDialogAlert()).toHaveTextContent("No se pudo guardar la comida. Intenta de nuevo.");
    expect(page.getRecipeRadio("Flan")).toBeChecked();

    await page.save();
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());
    expect(page.getSlotButton("Cena del lunes 12: Flan, cambiar")).toBeInTheDocument();
  });

  it("says the recipe is gone and asks for another one when it was deleted elsewhere", async () => {
    saveMealSlotMock.mockResolvedValue(null);
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);
    await page.chooseRecipe("Flan");
    getRecipeOptionsMock.mockResolvedValueOnce([ARROZ, TRES_LECHES]);

    await page.save();

    expect(page.getDialogAlert()).toHaveTextContent("Esa receta ya no existe. Elige otra.");
    await waitFor(() => expect(page.getRecipeRadio("Arroz con leche")).toBeInTheDocument());
    expect(() => page.getRecipeRadio("Flan")).toThrow();
    expect(page.getSaveButton()).toBeDisabled();
  });

  it("keeps the assignment and shows the error when removing fails", async () => {
    clearMealSlotMock.mockRejectedValue(new Error("network"));
    const page = await renderPlanner();
    await page.openSlot(ASSIGNED_MONDAY_LUNCH);
    await page.findRecipeRadio("Arroz con leche");

    await page.remove();

    expect(page.getDialogAlert()).toHaveTextContent("No se pudo quitar la comida. Intenta de nuevo.");
    await page.cancel();
    expect(page.getSlotButton(ASSIGNED_MONDAY_LUNCH)).toBeInTheDocument();
  });
});

describe("MealPlanner: closing the dialog", () => {
  it("closes without saving and gives the focus back to the slot that opened it", async () => {
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);
    await page.findRecipeRadio("Flan");

    await page.cancel();

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(saveMealSlotMock).not.toHaveBeenCalled();
    expect(page.getFocusedElement()).toBe(page.getSlotButton(EMPTY_MONDAY_DINNER));
  });

  it("closes with Escape", async () => {
    const page = await renderPlanner();
    await page.openSlot(EMPTY_MONDAY_DINNER);

    await page.pressEscape();

    expect(page.queryDialog()).not.toBeInTheDocument();
  });
});

describe("MealPlanner: the two weeks", () => {
  it("keeps what was assigned in the next week when the user goes back and forth, without asking again", async () => {
    saveMealSlotMock.mockResolvedValue({ slotId: "slot-next" });
    const page = await renderPlanner();
    await page.goToNextWeek();
    await page.openSlot("Cena del lunes 19, vacío, asignar");
    await page.chooseRecipe("Flan");
    await page.save();
    await waitFor(() => expect(page.queryDialog()).not.toBeInTheDocument());

    await page.goToPreviousWeek();
    await page.goToNextWeek();

    expect(saveMealSlotMock).toHaveBeenCalledWith(expect.objectContaining({ dateKey: "2026-10-19" }));
    expect(page.getSlotButton("Cena del lunes 19: Flan, cambiar")).toBeInTheDocument();
    expect(getMealPlanMock).toHaveBeenCalledTimes(1);
  });
});
