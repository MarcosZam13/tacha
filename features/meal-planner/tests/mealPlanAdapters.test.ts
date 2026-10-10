import { describe, expect, it } from "vitest";
import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import type { MealPlanEntry, MealPlanRow, RecipeOption } from "../models/meal-plan.interfaces";
import { toInitialSlotValues } from "../utils/toInitialSlotValues";
import { toMealPlanEntry } from "../utils/toMealPlanEntry";
import { toRecipeOption } from "../utils/toRecipeOption";
import { toSavedMealPlanEntry } from "../utils/toSavedMealPlanEntry";

const ROW: MealPlanRow = {
  assigned_cook: "user-1",
  date: "2026-10-12",
  id: "slot-1",
  meal_type: "lunch",
  recipes: { base_servings: 12, id: "recipe-tres-leches", name: "Tres leches" },
  servings_multiplier: 2,
};

describe("toMealPlanEntry", () => {
  it("adapts a row with its recipe to what the screen uses", () => {
    expect(toMealPlanEntry(ROW)).toEqual({
      baseServings: 12,
      cookChoice: COOK_CHOICE.SELF,
      cookLabel: "Yo",
      dateKey: "2026-10-12",
      id: "slot-1",
      mealType: MEAL_TYPE.LUNCH,
      multiplierLabel: "×2",
      recipeId: "recipe-tres-leches",
      recipeName: "Tres leches",
      servingsMultiplier: 2,
    });
  });

  it("leaves the cook out when the slot has none", () => {
    const entry = toMealPlanEntry({ ...ROW, assigned_cook: null });

    expect(entry.cookChoice).toBe(COOK_CHOICE.NONE);
    expect(entry.cookLabel).toBeNull();
  });

  it("does not show a chip for x1", () => {
    expect(toMealPlanEntry({ ...ROW, servings_multiplier: 1 }).multiplierLabel).toBeNull();
  });
});

describe("toRecipeOption", () => {
  it("adapts a recipe row with its base servings written", () => {
    expect(toRecipeOption({ base_servings: 4, id: "recipe-flan", name: "Flan" })).toEqual({
      baseServings: 4,
      id: "recipe-flan",
      name: "Flan",
      servingsLabel: "4 porciones",
    });
  });

  it("uses the singular for a one-serving recipe", () => {
    expect(toRecipeOption({ base_servings: 1, id: "recipe-cereal", name: "Cereal" }).servingsLabel).toBe("1 porción");
  });
});

describe("toSavedMealPlanEntry", () => {
  const OPTION: RecipeOption = {
    baseServings: 12,
    id: "recipe-tres-leches",
    name: "Tres leches",
    servingsLabel: "12 porciones",
  };

  it("builds the entry the screen shows after saving, with the texts written", () => {
    const savedEntry = toSavedMealPlanEntry({
      option: OPTION,
      slotId: "slot-1",
      target: { dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH },
      values: { cookChoice: COOK_CHOICE.SELF, recipeId: OPTION.id, servingsMultiplier: 2 },
    });

    expect(savedEntry).toEqual({
      baseServings: 12,
      cookChoice: COOK_CHOICE.SELF,
      cookLabel: "Yo",
      dateKey: "2026-10-12",
      id: "slot-1",
      mealType: MEAL_TYPE.LUNCH,
      multiplierLabel: "×2",
      recipeId: "recipe-tres-leches",
      recipeName: "Tres leches",
      servingsMultiplier: 2,
    });
  });

  it("leaves the cook and the chip out for no cook at x1", () => {
    const savedEntry = toSavedMealPlanEntry({
      option: OPTION,
      slotId: "slot-2",
      target: { dateKey: "2026-10-13", mealType: MEAL_TYPE.DINNER },
      values: { cookChoice: COOK_CHOICE.NONE, recipeId: OPTION.id, servingsMultiplier: 1 },
    });

    expect(savedEntry.cookLabel).toBeNull();
    expect(savedEntry.multiplierLabel).toBeNull();
  });
});

describe("toInitialSlotValues", () => {
  it("starts an empty slot without a recipe, cooked by the user, at x1", () => {
    expect(toInitialSlotValues(null)).toEqual({
      cookChoice: COOK_CHOICE.SELF,
      recipeId: null,
      servingsMultiplier: 1,
    });
  });

  it("starts an assigned slot with its own values", () => {
    const entry: MealPlanEntry = toMealPlanEntry({ ...ROW, assigned_cook: null, servings_multiplier: 3.5 });

    expect(toInitialSlotValues(entry)).toEqual({
      cookChoice: COOK_CHOICE.NONE,
      recipeId: "recipe-tres-leches",
      servingsMultiplier: 3.5,
    });
  });
});
