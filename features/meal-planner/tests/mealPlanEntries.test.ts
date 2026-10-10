import { describe, expect, it } from "vitest";
import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import { getPlanRange } from "../utils/getPlanRange";
import { removeMealPlanEntry } from "../utils/removeMealPlanEntry";
import { setTimeZoneForSuite } from "./setTimeZoneForSuite";
import { upsertMealPlanEntry } from "../utils/upsertMealPlanEntry";

const createEntry = (id: string, dateKey: string, mealType: MealPlanEntry["mealType"], recipeName: string): MealPlanEntry => ({
  baseServings: 4,
  cookChoice: COOK_CHOICE.SELF,
  cookLabel: "Yo",
  dateKey,
  id,
  mealType,
  multiplierLabel: null,
  recipeId: `recipe-${recipeName}`,
  recipeName,
  servingsMultiplier: 1,
});

const MONDAY_LUNCH = createEntry("a", "2026-10-12", MEAL_TYPE.LUNCH, "Arroz");
const MONDAY_DINNER = createEntry("b", "2026-10-12", MEAL_TYPE.DINNER, "Sopa");

describe("upsertMealPlanEntry", () => {
  it("adds an entry for an empty slot at the end", () => {
    const result = upsertMealPlanEntry([MONDAY_LUNCH], MONDAY_DINNER);

    expect(result).toEqual([MONDAY_LUNCH, MONDAY_DINNER]);
  });

  it("replaces the entry of the same day and meal", () => {
    const replacement = createEntry("c", "2026-10-12", MEAL_TYPE.LUNCH, "Flan");

    const result = upsertMealPlanEntry([MONDAY_LUNCH, MONDAY_DINNER], replacement);

    expect(result).toEqual([replacement, MONDAY_DINNER]);
  });

  it("does not change the list it receives", () => {
    const entries = [MONDAY_LUNCH];

    upsertMealPlanEntry(entries, MONDAY_DINNER);

    expect(entries).toEqual([MONDAY_LUNCH]);
  });

  it("keeps the same meal on another day as a different slot", () => {
    const tuesdayLunch = createEntry("d", "2026-10-13", MEAL_TYPE.LUNCH, "Pasta");

    expect(upsertMealPlanEntry([MONDAY_LUNCH], tuesdayLunch)).toHaveLength(2);
  });
});

describe("removeMealPlanEntry", () => {
  it("removes only the entry of that slot", () => {
    const result = removeMealPlanEntry([MONDAY_LUNCH, MONDAY_DINNER], {
      dateKey: "2026-10-12",
      mealType: MEAL_TYPE.LUNCH,
    });

    expect(result).toEqual([MONDAY_DINNER]);
  });

  it("leaves the plan as it is when the slot was empty", () => {
    const result = removeMealPlanEntry([MONDAY_LUNCH], { dateKey: "2026-10-14", mealType: MEAL_TYPE.LUNCH });

    expect(result).toEqual([MONDAY_LUNCH]);
  });
});

describe("getPlanRange", () => {
  it("goes from the Monday of this week to the Sunday of the next one", () => {
    // Miércoles 14 de octubre de 2026: esta semana empieza el 12 y la próxima termina el 25.
    expect(getPlanRange(new Date(2026, 9, 14))).toEqual({ fromDateKey: "2026-10-12", toDateKey: "2026-10-25" });
  });

  it("starts the Monday before when today is a Sunday", () => {
    expect(getPlanRange(new Date(2026, 9, 18))).toEqual({ fromDateKey: "2026-10-12", toDateKey: "2026-10-25" });
  });

  it("crosses a month and a year change", () => {
    // Miércoles 30 de diciembre de 2026: del lunes 28 de diciembre al domingo 10 de enero.
    expect(getPlanRange(new Date(2026, 11, 30))).toEqual({ fromDateKey: "2026-12-28", toDateKey: "2027-01-10" });
  });

  describe("across a daylight saving change", () => {
    setTimeZoneForSuite("America/New_York");

    it("still covers fourteen days", () => {
      // Miércoles 28 de octubre: el cambio de hora es el domingo 1 de noviembre.
      expect(getPlanRange(new Date(2026, 9, 28))).toEqual({ fromDateKey: "2026-10-26", toDateKey: "2026-11-08" });
    });
  });
});
