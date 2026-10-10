// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOK_CHOICE, MEAL_SLOT_TEXT, MEAL_TYPE, RECIPE_OPTIONS_STATUS } from "../constants/meal-planner.constants";
import { useMealSlotDialog } from "../hooks/useMealSlotDialog";
import type { MealPlanEntry, RecipeOption, SaveMealSlotResponse } from "../models/meal-plan.interfaces";
import { clearMealSlot, getRecipeOptions, saveMealSlot } from "../services/meal-plan.service";
import { createPending } from "./mealPlan.fixtures";

vi.mock("../services/meal-plan.service", () => ({
  clearMealSlot: vi.fn(),
  getRecipeOptions: vi.fn(),
  saveMealSlot: vi.fn(),
}));
const getRecipeOptionsMock = vi.mocked(getRecipeOptions);
const saveMealSlotMock = vi.mocked(saveMealSlot);
const clearMealSlotMock = vi.mocked(clearMealSlot);

const TARGET = { dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH };
const FLAN: RecipeOption = { baseServings: 4, id: "recipe-flan", name: "Flan", servingsLabel: "4 porciones" };
const ARROZ: RecipeOption = { baseServings: 6, id: "recipe-arroz", name: "Arroz con leche", servingsLabel: "6 porciones" };

const ARROZ_ENTRY: MealPlanEntry = {
  baseServings: 6,
  cookChoice: COOK_CHOICE.NONE,
  cookLabel: null,
  dateKey: "2026-10-12",
  id: "slot-1",
  mealType: MEAL_TYPE.LUNCH,
  multiplierLabel: "×2",
  recipeId: "recipe-arroz",
  recipeName: "Arroz con leche",
  servingsMultiplier: 2,
};

const getEntryMock = vi.fn();
const onSavedMock = vi.fn();
const onRemovedMock = vi.fn();

const renderDialog = (entry: MealPlanEntry | null = null) => {
  getEntryMock.mockReturnValue(entry);
  return renderHook(() =>
    useMealSlotDialog({
      getDayLongLabel: () => "Lunes 12",
      getEntry: getEntryMock,
      onRemoved: onRemovedMock,
      onSaved: onSavedMock,
    }),
  );
};

type DialogHook = ReturnType<typeof renderDialog>;

const openAndWaitForRecipes = async (hook: DialogHook): Promise<void> => {
  act(() => hook.result.current.onSlotOpen(TARGET));
  await waitFor(() => expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.READY));
};

beforeEach(() => {
  vi.resetAllMocks();
  getRecipeOptionsMock.mockResolvedValue([ARROZ, FLAN]);
});

describe("useMealSlotDialog", () => {
  describe("opening", () => {
    it("starts closed", () => {
      const { result } = renderDialog();

      expect(result.current.isOpen).toBe(false);
      expect(result.current.subtitle).toBeNull();
    });

    it("opens an empty slot to assign: no recipe, the user cooks, x1", async () => {
      const hook = renderDialog();

      await openAndWaitForRecipes(hook);

      expect(hook.result.current.isOpen).toBe(true);
      expect(hook.result.current.title).toBe(MEAL_SLOT_TEXT.ASSIGN_TITLE);
      expect(hook.result.current.subtitle).toBe("Almuerzo del lunes 12");
      expect(hook.result.current.isAssigned).toBe(false);
      expect(hook.result.current.selectedRecipeId).toBeNull();
      expect(hook.result.current.cookChoice).toBe(COOK_CHOICE.SELF);
      expect(hook.result.current.canSave).toBe(false);
      expect(hook.result.current.recipeOptions).toEqual([ARROZ, FLAN]);
    });

    it("opens an assigned slot to change it, with its own values", async () => {
      const hook = renderDialog(ARROZ_ENTRY);

      await openAndWaitForRecipes(hook);

      expect(hook.result.current.title).toBe(MEAL_SLOT_TEXT.CHANGE_TITLE);
      expect(hook.result.current.isAssigned).toBe(true);
      expect(hook.result.current.selectedRecipeId).toBe("recipe-arroz");
      expect(hook.result.current.cookChoice).toBe(COOK_CHOICE.NONE);
      expect(hook.result.current.servingsSummary).toBe("×2 · 12 porciones");
      expect(hook.result.current.canSave).toBe(true);
    });

    it("asks for the recipes again every time it opens", async () => {
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onClose());

      await openAndWaitForRecipes(hook);

      expect(getRecipeOptionsMock).toHaveBeenCalledTimes(2);
    });

    it("ignores the recipes that arrive after the dialog was closed", async () => {
      const response = createPending<RecipeOption[]>();
      getRecipeOptionsMock.mockReturnValue(response.promise);
      const hook = renderDialog();
      act(() => hook.result.current.onSlotOpen(TARGET));
      act(() => hook.result.current.onClose());

      await act(async () => response.resolve([FLAN]));

      expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.LOADING);
      expect(hook.result.current.recipeOptions).toEqual([]);
    });

    it("opens an assigned slot whose recipe is gone with nothing chosen and without saving", async () => {
      getRecipeOptionsMock.mockResolvedValue([FLAN]);
      const hook = renderDialog(ARROZ_ENTRY);

      await openAndWaitForRecipes(hook);

      expect(hook.result.current.isAssigned).toBe(true);
      expect(hook.result.current.selectedRecipeId).toBeNull();
      expect(hook.result.current.servingsSummary).toBeNull();
      expect(hook.result.current.canSave).toBe(false);
    });

    it("shows the recipes as loading until they arrive", () => {
      getRecipeOptionsMock.mockReturnValue(new Promise(() => undefined));
      const hook = renderDialog();

      act(() => hook.result.current.onSlotOpen(TARGET));

      expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.LOADING);
      expect(hook.result.current.canSave).toBe(false);
    });
  });

  describe("recipes", () => {
    it("lets the user save once a recipe is chosen", async () => {
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);

      act(() => hook.result.current.onRecipeChoose("recipe-flan"));

      expect(hook.result.current.selectedRecipeId).toBe("recipe-flan");
      expect(hook.result.current.canSave).toBe(true);
      expect(hook.result.current.servingsSummary).toBe("×1 · 4 porciones");
    });

    it("cannot save when the user has no recipes", async () => {
      getRecipeOptionsMock.mockResolvedValue([]);
      const hook = renderDialog();

      await openAndWaitForRecipes(hook);

      expect(hook.result.current.recipeOptions).toEqual([]);
      expect(hook.result.current.canSave).toBe(false);
    });

    it("says the recipes failed to load, and loads them again on retry", async () => {
      getRecipeOptionsMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([FLAN]);
      const hook = renderDialog();
      act(() => hook.result.current.onSlotOpen(TARGET));
      await waitFor(() => expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.ERROR));
      expect(hook.result.current.canSave).toBe(false);

      act(() => hook.result.current.onRecipesRetry());
      await waitFor(() => expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.READY));

      expect(hook.result.current.recipeOptions).toEqual([FLAN]);
    });
  });

  describe("servings multiplier", () => {
    it("goes up and down by half a step with the resulting servings", async () => {
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-arroz"));

      act(() => hook.result.current.onMultiplierIncrease());
      expect(hook.result.current.servingsSummary).toBe("×1,5 · 9 porciones");

      act(() => hook.result.current.onMultiplierDecrease());
      act(() => hook.result.current.onMultiplierDecrease());
      expect(hook.result.current.servingsSummary).toBe("×0,5 · 3 porciones");
    });

    it("disables the buttons at the ends", async () => {
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      expect(hook.result.current.canDecreaseServings).toBe(true);

      act(() => hook.result.current.onMultiplierDecrease());
      expect(hook.result.current.canDecreaseServings).toBe(false);

      for (let step = 0; step < 7; step += 1) act(() => hook.result.current.onMultiplierIncrease());
      expect(hook.result.current.canIncreaseServings).toBe(false);
    });
  });

  describe("saving", () => {
    it("saves the slot with what the user chose, tells the plan and closes", async () => {
      saveMealSlotMock.mockResolvedValue({ slotId: "slot-9" });
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));
      act(() => hook.result.current.onMultiplierIncrease());
      act(() => hook.result.current.onCookChange(COOK_CHOICE.NONE));

      await act(async () => hook.result.current.onSave());

      expect(saveMealSlotMock).toHaveBeenCalledWith({
        ...TARGET,
        cookChoice: COOK_CHOICE.NONE,
        recipeId: "recipe-flan",
        servingsMultiplier: 1.5,
      });
      expect(onSavedMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: "slot-9", recipeId: "recipe-flan", recipeName: "Flan", multiplierLabel: "×1,5" }),
      );
      expect(hook.result.current.isOpen).toBe(false);
    });

    it("shows it is saving and does not close while the database answers", async () => {
      const response = createPending<SaveMealSlotResponse | null>();
      saveMealSlotMock.mockReturnValue(response.promise);
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));

      act(() => hook.result.current.onSave());
      expect(hook.result.current.isSaving).toBe(true);
      expect(hook.result.current.canSave).toBe(false);

      act(() => hook.result.current.onClose());
      expect(hook.result.current.isOpen).toBe(true);

      await act(async () => response.resolve({ slotId: "slot-9" }));
      expect(hook.result.current.isOpen).toBe(false);
    });

    it("sends one request when the user double clicks save", async () => {
      const response = createPending<SaveMealSlotResponse | null>();
      saveMealSlotMock.mockReturnValue(response.promise);
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));

      act(() => {
        hook.result.current.onSave();
        hook.result.current.onSave();
      });

      expect(saveMealSlotMock).toHaveBeenCalledTimes(1);
      await act(async () => response.resolve({ slotId: "slot-9" }));
    });

    it("keeps the dialog open with the error and what was chosen when the database fails", async () => {
      saveMealSlotMock.mockRejectedValue(new Error("network"));
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));
      act(() => hook.result.current.onMultiplierIncrease());

      await act(async () => hook.result.current.onSave());

      expect(hook.result.current.isOpen).toBe(true);
      expect(hook.result.current.errorMessage).toBe(MEAL_SLOT_TEXT.SAVE_ERROR);
      expect(hook.result.current.selectedRecipeId).toBe("recipe-flan");
      expect(hook.result.current.servingsSummary).toBe("×1,5 · 6 porciones");
      expect(hook.result.current.canSave).toBe(true);
      expect(onSavedMock).not.toHaveBeenCalled();
    });

    it("saves after retrying a failed save", async () => {
      saveMealSlotMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ slotId: "slot-9" });
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));
      await act(async () => hook.result.current.onSave());

      await act(async () => hook.result.current.onSave());

      expect(onSavedMock).toHaveBeenCalledTimes(1);
      expect(hook.result.current.isOpen).toBe(false);
    });

    it("says the recipe is gone, reloads the recipes and unselects it", async () => {
      saveMealSlotMock.mockResolvedValue(null);
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));
      getRecipeOptionsMock.mockResolvedValueOnce([ARROZ]);

      await act(async () => hook.result.current.onSave());
      await waitFor(() => expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.READY));

      expect(hook.result.current.errorMessage).toBe(MEAL_SLOT_TEXT.RECIPE_GONE);
      expect(hook.result.current.recipeOptions).toEqual([ARROZ]);
      expect(hook.result.current.selectedRecipeId).toBeNull();
      expect(hook.result.current.canSave).toBe(false);
      expect(hook.result.current.isOpen).toBe(true);
    });
  });

  describe("removing", () => {
    it("removes an assigned slot, tells the plan and closes", async () => {
      clearMealSlotMock.mockResolvedValue(TARGET);
      const hook = renderDialog(ARROZ_ENTRY);
      await openAndWaitForRecipes(hook);

      await act(async () => hook.result.current.onRemove());

      expect(clearMealSlotMock).toHaveBeenCalledWith(TARGET);
      expect(onRemovedMock).toHaveBeenCalledWith(TARGET);
      expect(hook.result.current.isOpen).toBe(false);
    });

    it("does nothing when the slot has no assignment", async () => {
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);

      await act(async () => hook.result.current.onRemove());

      expect(clearMealSlotMock).not.toHaveBeenCalled();
      expect(hook.result.current.isOpen).toBe(true);
    });

    it("keeps the dialog open with the error when removing fails", async () => {
      clearMealSlotMock.mockRejectedValue(new Error("network"));
      const hook = renderDialog(ARROZ_ENTRY);
      await openAndWaitForRecipes(hook);

      await act(async () => hook.result.current.onRemove());

      expect(hook.result.current.isOpen).toBe(true);
      expect(hook.result.current.errorMessage).toBe(MEAL_SLOT_TEXT.REMOVE_ERROR);
      expect(onRemovedMock).not.toHaveBeenCalled();
    });

    it("sends one request when the user double clicks remove", async () => {
      const response = createPending<{ dateKey: string; mealType: typeof MEAL_TYPE.LUNCH }>();
      clearMealSlotMock.mockReturnValue(response.promise);
      const hook = renderDialog(ARROZ_ENTRY);
      await openAndWaitForRecipes(hook);

      act(() => {
        hook.result.current.onRemove();
        hook.result.current.onRemove();
      });

      expect(clearMealSlotMock).toHaveBeenCalledTimes(1);
      await act(async () => response.resolve(TARGET));
    });
  });

  describe("closing", () => {
    it("closes without saving anything", async () => {
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);

      act(() => hook.result.current.onClose());

      expect(hook.result.current.isOpen).toBe(false);
      expect(saveMealSlotMock).not.toHaveBeenCalled();
    });

    it("gives the focus back to the button that opened it", async () => {
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      opener.blur();

      act(() => hook.result.current.onClose());

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });

    it("gives the focus back to the button it was opened with even when the click did not focus it", async () => {
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      const hook = renderDialog();
      act(() => hook.result.current.onSlotOpen(TARGET, opener));
      await waitFor(() => expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.READY));
      expect(document.activeElement).not.toBe(opener);

      act(() => hook.result.current.onClose());

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });

    it("gives the focus back to the opener after saving", async () => {
      saveMealSlotMock.mockResolvedValue({ slotId: "slot-9" });
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      opener.blur();
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));

      await act(async () => hook.result.current.onSave());

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });

    it("gives the focus back to the opener after removing", async () => {
      clearMealSlotMock.mockResolvedValue(TARGET);
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      const hook = renderDialog(ARROZ_ENTRY);
      await openAndWaitForRecipes(hook);
      opener.blur();

      await act(async () => hook.result.current.onRemove());

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });
  });
});
