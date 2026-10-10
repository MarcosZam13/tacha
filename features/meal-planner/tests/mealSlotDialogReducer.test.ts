import { describe, expect, it } from "vitest";
import { COOK_CHOICE, MEAL_SLOT_DIALOG_ACTION, MEAL_SLOT_DIALOG_STATUS, MEAL_TYPE } from "../constants/meal-planner.constants";
import type { MealSlotFormValues, MealSlotTarget } from "../models/meal-plan.interfaces";
import type { MealSlotDialogAction, MealSlotDialogState } from "../models/meal-plan.types";
import { CLOSED_DIALOG_STATE, mealSlotDialogReducer } from "../utils/meal-slot-dialog.reducer";

const TARGET: MealSlotTarget = { dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH };
const EMPTY_VALUES: MealSlotFormValues = { cookChoice: COOK_CHOICE.SELF, recipeId: null, servingsMultiplier: 1 };
const CHOSEN_VALUES: MealSlotFormValues = { cookChoice: COOK_CHOICE.SELF, recipeId: "recipe-flan", servingsMultiplier: 1 };

const EDITING: MealSlotDialogState = { status: MEAL_SLOT_DIALOG_STATUS.EDITING, target: TARGET, values: EMPTY_VALUES };
const EDITING_WITH_RECIPE: MealSlotDialogState = {
  status: MEAL_SLOT_DIALOG_STATUS.EDITING,
  target: TARGET,
  values: CHOSEN_VALUES,
};
const SAVING: MealSlotDialogState = { status: MEAL_SLOT_DIALOG_STATUS.SAVING, target: TARGET, values: CHOSEN_VALUES };
const FAILED: MealSlotDialogState = {
  status: MEAL_SLOT_DIALOG_STATUS.FAILED,
  target: TARGET,
  values: CHOSEN_VALUES,
  errorMessage: "No se pudo guardar la comida. Intenta de nuevo.",
};

const reduce = (state: MealSlotDialogState, action: MealSlotDialogAction): MealSlotDialogState =>
  mealSlotDialogReducer(state, action);

const withMultiplier = (servingsMultiplier: number): MealSlotDialogState => ({
  status: MEAL_SLOT_DIALOG_STATUS.EDITING,
  target: TARGET,
  values: { ...CHOSEN_VALUES, servingsMultiplier },
});

describe("mealSlotDialogReducer", () => {
  describe("opening and closing", () => {
    it("opens on a slot with the values it is given", () => {
      const state = reduce(CLOSED_DIALOG_STATE, {
        type: MEAL_SLOT_DIALOG_ACTION.OPENED,
        target: TARGET,
        values: EMPTY_VALUES,
      });

      expect(state).toEqual(EDITING);
    });

    it("does not open another slot over an open dialog, an error or a save in progress", () => {
      const otherSlot = {
        type: MEAL_SLOT_DIALOG_ACTION.OPENED,
        target: { dateKey: "2026-10-13", mealType: MEAL_TYPE.DINNER },
        values: EMPTY_VALUES,
      } as const;

      expect(reduce(EDITING, otherSlot)).toBe(EDITING);
      expect(reduce(FAILED, otherSlot)).toBe(FAILED);
      expect(reduce(SAVING, otherSlot)).toBe(SAVING);
    });

    it("closes from editing", () => {
      expect(reduce(EDITING, { type: MEAL_SLOT_DIALOG_ACTION.CLOSED })).toBe(CLOSED_DIALOG_STATE);
    });

    it("closes from an error", () => {
      expect(reduce(FAILED, { type: MEAL_SLOT_DIALOG_ACTION.CLOSED })).toBe(CLOSED_DIALOG_STATE);
    });

    it("does not close while saving", () => {
      expect(reduce(SAVING, { type: MEAL_SLOT_DIALOG_ACTION.CLOSED })).toBe(SAVING);
    });
  });

  describe("editing the form", () => {
    it("chooses a recipe", () => {
      const state = reduce(EDITING, { type: MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN, recipeId: "recipe-flan" });

      expect(state).toEqual(EDITING_WITH_RECIPE);
    });

    it("changes who cooks", () => {
      const state = reduce(EDITING_WITH_RECIPE, {
        type: MEAL_SLOT_DIALOG_ACTION.COOK_CHANGED,
        cookChoice: COOK_CHOICE.NONE,
      });

      expect(state).toEqual({
        status: MEAL_SLOT_DIALOG_STATUS.EDITING,
        target: TARGET,
        values: { ...CHOSEN_VALUES, cookChoice: COOK_CHOICE.NONE },
      });
    });

    it("clears the error and goes back to editing when the user changes something", () => {
      const state = reduce(FAILED, { type: MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN, recipeId: "recipe-arroz" });

      expect(state).toEqual({
        status: MEAL_SLOT_DIALOG_STATUS.EDITING,
        target: TARGET,
        values: { ...CHOSEN_VALUES, recipeId: "recipe-arroz" },
      });
    });

    it("ignores changes while saving", () => {
      expect(reduce(SAVING, { type: MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN, recipeId: "recipe-arroz" })).toBe(SAVING);
      expect(reduce(SAVING, { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED })).toBe(SAVING);
    });

    it("ignores changes when the dialog is closed", () => {
      const state = reduce(CLOSED_DIALOG_STATE, { type: MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN, recipeId: "recipe-flan" });

      expect(state).toBe(CLOSED_DIALOG_STATE);
    });
  });

  describe("servings multiplier", () => {
    it("goes up by half a step", () => {
      expect(reduce(withMultiplier(1), { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED })).toEqual(withMultiplier(1.5));
    });

    it("goes down by half a step", () => {
      expect(reduce(withMultiplier(1), { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_DECREASED })).toEqual(withMultiplier(0.5));
    });

    it("does not go below x0.5", () => {
      expect(reduce(withMultiplier(0.5), { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_DECREASED })).toEqual(withMultiplier(0.5));
    });

    it("does not go above x4", () => {
      expect(reduce(withMultiplier(4), { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED })).toEqual(withMultiplier(4));
    });

    it("reaches both ends one step at a time", () => {
      expect(reduce(withMultiplier(3.5), { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED })).toEqual(withMultiplier(4));
      expect(reduce(withMultiplier(1), { type: MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_DECREASED })).toEqual(withMultiplier(0.5));
    });
  });

  describe("saving", () => {
    it("starts saving once a recipe is chosen", () => {
      expect(reduce(EDITING_WITH_RECIPE, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED })).toEqual(SAVING);
    });

    it("does not start saving without a recipe", () => {
      expect(reduce(EDITING, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED })).toBe(EDITING);
    });

    it("ignores a second save while it is already saving", () => {
      expect(reduce(SAVING, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED })).toBe(SAVING);
    });

    it("can try again after an error", () => {
      expect(reduce(FAILED, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED })).toEqual(SAVING);
    });

    it("fails keeping the target and what the user chose", () => {
      const state = reduce(SAVING, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED, errorMessage: "No se pudo guardar la comida. Intenta de nuevo." });

      expect(state).toEqual(FAILED);
    });

    it("closes when saving succeeds", () => {
      expect(reduce(SAVING, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED })).toBe(CLOSED_DIALOG_STATE);
    });

    it("only closes on success from saving", () => {
      expect(reduce(EDITING, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED })).toBe(EDITING);
      expect(reduce(FAILED, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED })).toBe(FAILED);
    });

    it("only fails from saving", () => {
      expect(reduce(EDITING, { type: MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED, errorMessage: "x" })).toBe(EDITING);
    });
  });
});
