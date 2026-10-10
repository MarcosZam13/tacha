import { describe, expect, it } from "vitest";
import { MEAL_TYPE } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { WeekDay } from "../models/meal-planner.interfaces";
import type { AddWeekToListResponse } from "../models/week-list-addition.interfaces";
import { countWeekMeals } from "../utils/countWeekMeals";
import { getWeekRange } from "../utils/getWeekRange";
import { toAddWeekToListResponse } from "../utils/toAddWeekToListResponse";
import { toCountLabel } from "../utils/toCountLabel";
import { toWeekAdditionSummary } from "../utils/toWeekAdditionSummary";
import { createEntry } from "./mealPlan.fixtures";

const createDay = (dateKey: string): WeekDay => ({
  dateKey,
  isToday: false,
  longLabel: dateKey,
  shortLabel: dateKey,
  slots: [
    { label: "Desayuno", mealType: MEAL_TYPE.BREAKFAST },
    { label: "Almuerzo", mealType: MEAL_TYPE.LUNCH },
    { label: "Cena", mealType: MEAL_TYPE.DINNER },
  ],
});

const MONDAY = createDay("2026-10-12");
const TUESDAY = createDay("2026-10-13");
const SUNDAY = createDay("2026-10-18");

const createResponse = (overrides: Partial<AddWeekToListResponse> = {}): AddWeekToListResponse => ({
  addedProductNames: ["Leche"],
  ingredientCount: 4,
  mealCount: 3,
  missingProductNames: [],
  skippedProductNames: [],
  ...overrides,
});

describe("countWeekMeals", () => {
  it("counts the slots of the week that have a meal", () => {
    const entries: MealPlanEntry[] = [
      createEntry("a", "2026-10-12", MEAL_TYPE.LUNCH, "Arroz"),
      createEntry("b", "2026-10-13", MEAL_TYPE.DINNER, "Sopa"),
    ];
    const getEntry = (dateKey: string, mealType: string): MealPlanEntry | null =>
      entries.find((entry) => entry.dateKey === dateKey && entry.mealType === mealType) ?? null;

    expect(countWeekMeals([MONDAY, TUESDAY, SUNDAY], getEntry)).toBe(2);
  });

  it("is zero for an empty week or no days", () => {
    expect(countWeekMeals([MONDAY, TUESDAY], () => null)).toBe(0);
    expect(countWeekMeals([], () => null)).toBe(0);
  });

  it("does not count a meal outside the days it is given", () => {
    const outsideWeek = createEntry("z", "2026-10-25", MEAL_TYPE.LUNCH, "Pasta");

    expect(countWeekMeals([MONDAY], (dateKey) => (dateKey === outsideWeek.dateKey ? outsideWeek : null))).toBe(0);
  });
});

describe("getWeekRange", () => {
  it("goes from the first day to the last", () => {
    expect(getWeekRange([MONDAY, TUESDAY, SUNDAY])).toEqual({
      fromDateKey: "2026-10-12",
      toDateKey: "2026-10-18",
    });
  });

  it("is a single day when there is only one", () => {
    expect(getWeekRange([MONDAY])).toEqual({ fromDateKey: "2026-10-12", toDateKey: "2026-10-12" });
  });

  it("is null while there are no days", () => {
    expect(getWeekRange([])).toBeNull();
  });
});

describe("toCountLabel", () => {
  it("uses the singular for one and the plural for the rest", () => {
    expect(toCountLabel(1, "comida", "comidas")).toBe("1 comida");
    expect(toCountLabel(5, "comida", "comidas")).toBe("5 comidas");
    expect(toCountLabel(0, "comida", "comidas")).toBe("0 comidas");
  });
});

describe("toAddWeekToListResponse", () => {
  it("adapts what the database returns and names a missing product once", () => {
    const response = toAddWeekToListResponse({
      added: ["Leche", "Harina"],
      ingredients: 4,
      meals: 3,
      missing: [
        { product_name: "Leche", quantity: 500, unit: "ml" },
        { product_name: "Leche", quantity: 2, unit: "unidad" },
        { product_name: "Azúcar", quantity: 100, unit: "g" },
      ],
      skipped: ["Sal"],
    });

    expect(response).toEqual({
      addedProductNames: ["Leche", "Harina"],
      ingredientCount: 4,
      mealCount: 3,
      missingProductNames: ["Leche", "Azúcar"],
      skippedProductNames: ["Sal"],
    });
  });
});

describe("toWeekAdditionSummary", () => {
  it("says how many ingredients of how many meals were added", () => {
    expect(toWeekAdditionSummary(createResponse())).toEqual(["Agregaste 4 ingredientes de 3 comidas a tu lista."]);
  });

  it("uses the singular for one ingredient and one meal", () => {
    expect(toWeekAdditionSummary(createResponse({ ingredientCount: 1, mealCount: 1 }))).toEqual([
      "Agregaste 1 ingrediente de 1 comida a tu lista.",
    ]);
  });

  it("lists what is missing to buy", () => {
    expect(toWeekAdditionSummary(createResponse({ missingProductNames: ["Leche", "Azúcar"] }))).toEqual([
      "Agregaste 4 ingredientes de 3 comidas a tu lista.",
      "Te falta comprar: Leche, Azúcar",
    ]);
  });

  it("lists what could not be added", () => {
    expect(toWeekAdditionSummary(createResponse({ skippedProductNames: ["Sal"] }))).toEqual([
      "Agregaste 4 ingredientes de 3 comidas a tu lista.",
      "No se pudieron agregar: Sal",
    ]);
  });

  it("says the list already had what the week needs when nothing was added and nothing is missing", () => {
    expect(toWeekAdditionSummary(createResponse({ addedProductNames: [] }))).toEqual([
      "Tu lista ya tenía lo necesario para esta semana.",
    ]);
  });

  it("does not say the list was enough when something could not be added", () => {
    expect(toWeekAdditionSummary(createResponse({ addedProductNames: [], skippedProductNames: ["Sal"] }))).toEqual([
      "No se pudieron agregar: Sal",
    ]);
  });

  it("says there were no planned meals", () => {
    expect(
      toWeekAdditionSummary(createResponse({ addedProductNames: [], ingredientCount: 0, mealCount: 0 })),
    ).toEqual(["No había comidas planeadas esta semana."]);
  });
});
