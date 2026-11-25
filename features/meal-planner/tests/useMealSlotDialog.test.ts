// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COOK_CHOICE,
  COOK_OPTIONS_STATUS,
  MEAL_SLOT_TEXT,
  MEAL_TYPE,
  PLAN_SCOPE,
  RECIPE_OPTIONS_STATUS,
  SAVE_SLOT_RESULT,
} from "../constants/meal-planner.constants";
import { useMealSlotDialog } from "../hooks/useMealSlotDialog";
import type { MealPlanEntry, RecipeOption, SaveMealSlotResponse } from "../models/meal-plan.interfaces";
import type { PlanScopeType } from "../models/meal-planner.types";
import {
  clearHouseholdMealSlot,
  getHouseholdRecipeOptions,
  getOtherHouseholdCooks,
  saveHouseholdMealSlot,
} from "../services/household-meal-plan.service";
import { clearMealSlot, getRecipeOptions, saveMealSlot } from "../services/meal-plan.service";
import { createPending } from "./mealPlan.fixtures";

vi.mock("../services/meal-plan.service", () => ({
  clearMealSlot: vi.fn(),
  getRecipeOptions: vi.fn(),
  saveMealSlot: vi.fn(),
}));
vi.mock("../services/household-meal-plan.service", () => ({
  clearHouseholdMealSlot: vi.fn(),
  getHouseholdRecipeOptions: vi.fn(),
  getOtherHouseholdCooks: vi.fn(),
  saveHouseholdMealSlot: vi.fn(),
}));
const clearFamilySlotMock = vi.mocked(clearHouseholdMealSlot);
const getCooksMock = vi.mocked(getOtherHouseholdCooks);
const getFamilyRecipesMock = vi.mocked(getHouseholdRecipeOptions);
const saveFamilySlotMock = vi.mocked(saveHouseholdMealSlot);
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
const onRecipeGoneMock = vi.fn();
const onHouseholdLostMock = vi.fn();

const renderDialog = (entry: MealPlanEntry | null = null, scope: PlanScopeType = PLAN_SCOPE.PERSONAL) => {
  getEntryMock.mockReturnValue(entry);
  return renderHook(() =>
    useMealSlotDialog({
      getDayLongLabel: () => "Lunes 12",
      getEntry: getEntryMock,
      onHouseholdLost: onHouseholdLostMock,
      onRecipeGone: onRecipeGoneMock,
      onRemoved: onRemovedMock,
      onSaved: onSavedMock,
      scope,
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
  getFamilyRecipesMock.mockResolvedValue([FLAN]);
  getCooksMock.mockResolvedValue([{ label: "Beto", value: "user-beto" }]);
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

    it("tells the plan the recipe is gone so its slots stop showing it", async () => {
      saveMealSlotMock.mockResolvedValue(null);
      const hook = renderDialog(ARROZ_ENTRY);
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));

      await act(async () => hook.result.current.onSave());

      expect(onRecipeGoneMock).toHaveBeenCalledTimes(1);
      expect(onRecipeGoneMock).toHaveBeenCalledWith("recipe-flan");
      expect(onSavedMock).not.toHaveBeenCalled();
    });

    it("ignores a tap on another slot while a save is in progress", async () => {
      const response = createPending<SaveMealSlotResponse | null>();
      saveMealSlotMock.mockReturnValue(response.promise);
      const hook = renderDialog();
      await openAndWaitForRecipes(hook);
      act(() => hook.result.current.onRecipeChoose("recipe-flan"));
      act(() => hook.result.current.onSave());
      expect(hook.result.current.isSaving).toBe(true);

      act(() => hook.result.current.onSlotOpen({ dateKey: "2026-10-13", mealType: MEAL_TYPE.DINNER }));

      expect(hook.result.current.isSaving).toBe(true);
      expect(hook.result.current.recipesStatus).toBe(RECIPE_OPTIONS_STATUS.READY);
      expect(getRecipeOptionsMock).toHaveBeenCalledTimes(1);

      await act(async () => response.resolve({ slotId: "slot-9" }));
      expect(hook.result.current.isOpen).toBe(false);
      expect(onSavedMock).toHaveBeenCalledWith(expect.objectContaining({ dateKey: TARGET.dateKey }));
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

    // El foco de vuelta al espacio ya no es de este hook: lo hace el Modal compartido (SCRUM-142, D4),
    // y se prueba en components/ui/modal/tests/ y en MealPlannerAssign.test.tsx.
  });
});

describe("useMealSlotDialog: the family plan", () => {
  const BETO_ENTRY: MealPlanEntry = {
    ...ARROZ_ENTRY,
    cookChoice: "user-beto",
    cookLabel: "Beto",
    recipeId: FLAN.id,
    recipeName: FLAN.name,
  };

  const openFamily = async (entry: MealPlanEntry | null = null): Promise<DialogHook> => {
    const hook = renderDialog(entry, PLAN_SCOPE.FAMILY);
    await openAndWaitForRecipes(hook);
    await waitFor(() => expect(hook.result.current.cooksStatus).not.toBe(COOK_OPTIONS_STATUS.LOADING));
    return hook;
  };

  const chooseAndSave = async (hook: DialogHook, cookChoice: string): Promise<void> => {
    act(() => hook.result.current.onRecipeChoose(FLAN.id));
    act(() => hook.result.current.onCookChange(cookChoice));
    await act(async () => hook.result.current.onSave());
  };

  it("offers the recipes of the family and its members as cooks", async () => {
    const { result } = await openFamily();

    expect(result.current.recipeOptions).toEqual([FLAN]);
    expect(result.current.cookOptions.map((option) => option.label)).toEqual(["Yo", "Beto", "Sin cocinero"]);
    expect(result.current.cookChoice).toBe(COOK_CHOICE.SELF);
    expect(getRecipeOptionsMock).not.toHaveBeenCalled();
  });

  it("does not ask for members in the personal plan", async () => {
    const hook = renderDialog();
    await openAndWaitForRecipes(hook);

    expect(hook.result.current.cookOptions.map((option) => option.label)).toEqual(["Yo", "Sin cocinero"]);
    expect(getCooksMock).not.toHaveBeenCalled();
  });

  it("saves in the family plan and shows the name of the cook", async () => {
    saveFamilySlotMock.mockResolvedValue({ kind: SAVE_SLOT_RESULT.SAVED, slotId: "slot-9" });
    const hook = await openFamily();

    await chooseAndSave(hook, "user-beto");

    expect(saveFamilySlotMock).toHaveBeenCalledWith(expect.objectContaining({ cookChoice: "user-beto", recipeId: FLAN.id }));
    expect(onSavedMock).toHaveBeenCalledWith(expect.objectContaining({ cookLabel: "Beto", id: "slot-9" }));
    expect(saveMealSlotMock).not.toHaveBeenCalled();
  });

  it("says the cook left and asks for the members again", async () => {
    saveFamilySlotMock.mockResolvedValue({ kind: SAVE_SLOT_RESULT.COOK_GONE });
    const hook = await openFamily();
    getCooksMock.mockResolvedValue([]);

    await chooseAndSave(hook, "user-beto");

    expect(hook.result.current.errorMessage).toBe(MEAL_SLOT_TEXT.COOK_GONE);
    await waitFor(() => expect(hook.result.current.cooksStatus).toBe(COOK_OPTIONS_STATUS.READY));
    expect(hook.result.current.cookChoice).toBe(COOK_CHOICE.NONE);
    expect(hook.result.current.selectedRecipeId).toBe(FLAN.id);

    await act(async () => hook.result.current.onSave());
    expect(saveFamilySlotMock).toHaveBeenLastCalledWith(expect.objectContaining({ cookChoice: COOK_CHOICE.NONE }));
  });

  it("does not choose again a cook that left, even if the members cannot be loaded", async () => {
    saveFamilySlotMock.mockResolvedValue({ kind: SAVE_SLOT_RESULT.COOK_GONE });
    const hook = await openFamily(BETO_ENTRY);
    getCooksMock.mockRejectedValue(new Error("network"));

    await act(async () => hook.result.current.onSave());

    await waitFor(() => expect(hook.result.current.cooksStatus).toBe(COOK_OPTIONS_STATUS.ERROR));
    expect(hook.result.current.cookChoice).toBe(COOK_CHOICE.NONE);
  });

  it("says the recipe is no longer available", async () => {
    saveFamilySlotMock.mockResolvedValue({ kind: SAVE_SLOT_RESULT.RECIPE_GONE });
    const hook = await openFamily();

    await chooseAndSave(hook, COOK_CHOICE.SELF);

    expect(hook.result.current.errorMessage).toBe(MEAL_SLOT_TEXT.RECIPE_UNAVAILABLE);
    expect(onRecipeGoneMock).toHaveBeenCalledWith(FLAN.id);
  });

  it("closes and warns when there is no family any more, saving or removing", async () => {
    saveFamilySlotMock.mockResolvedValue({ kind: SAVE_SLOT_RESULT.NO_HOUSEHOLD });
    const saving = await openFamily();
    await chooseAndSave(saving, COOK_CHOICE.SELF);
    expect(saving.result.current.isOpen).toBe(false);
    expect(onHouseholdLostMock).toHaveBeenCalledTimes(1);

    clearFamilySlotMock.mockResolvedValue(false);
    const removing = await openFamily(BETO_ENTRY);
    await act(async () => removing.result.current.onRemove());
    expect(removing.result.current.isOpen).toBe(false);
    expect(onHouseholdLostMock).toHaveBeenCalledTimes(2);
    expect(onRemovedMock).not.toHaveBeenCalled();
  });

  it("removes a slot of the family plan", async () => {
    clearFamilySlotMock.mockResolvedValue(true);
    const hook = await openFamily(BETO_ENTRY);

    await act(async () => hook.result.current.onRemove());

    expect(clearFamilySlotMock).toHaveBeenCalledWith(TARGET);
    expect(onRemovedMock).toHaveBeenCalledWith(TARGET);
    expect(clearMealSlotMock).not.toHaveBeenCalled();
  });

  it("keeps the current cook when the members cannot be loaded, and loads them on retry", async () => {
    getCooksMock.mockRejectedValueOnce(new Error("network"));
    const hook = await openFamily(BETO_ENTRY);

    expect(hook.result.current.cooksStatus).toBe(COOK_OPTIONS_STATUS.ERROR);
    expect(hook.result.current.cookChoice).toBe("user-beto");
    expect(hook.result.current.cookOptions.map((option) => option.label)).toEqual(["Beto", "Yo", "Sin cocinero"]);

    act(() => hook.result.current.onCooksRetry());
    await waitFor(() => expect(hook.result.current.cooksStatus).toBe(COOK_OPTIONS_STATUS.READY));
    expect(hook.result.current.cookOptions).toHaveLength(3);
  });

  it("says the family has no recipes", async () => {
    getFamilyRecipesMock.mockResolvedValue([]);

    expect((await openFamily()).result.current.noRecipesText).toBe("Tu familia todavía no tiene recetas.");
  });
});
