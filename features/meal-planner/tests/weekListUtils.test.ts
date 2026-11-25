import { describe, expect, it } from "vitest";
import { MEAL_TYPE, WEEK_LIST_DESTINATION } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { AddWeekToListResponse } from "../models/week-list-addition.interfaces";
import type { WeekListDestination } from "../models/week-list-addition.types";
import { countWeekMeals } from "../utils/countWeekMeals";
import { getWeekRange } from "../utils/getWeekRange";
import { toAddWeekToListResponse } from "../utils/toAddWeekToListResponse";
import { toCountLabel } from "../utils/toCountLabel";
import { toDateListOption } from "../utils/toDateListOption";
import { toWeekAdditionSummary } from "../utils/toWeekAdditionSummary";
import { GENERAL_DESTINATION } from "../utils/week-list-addition.reducer";
import { createDay, createEntry } from "./mealPlan.fixtures";

const MONDAY = createDay("2026-10-12");
const TUESDAY = createDay("2026-10-13");
const SUNDAY = createDay("2026-10-18");

const createDateList = (name: string): WeekListDestination => ({
  id: "list-1",
  kind: WEEK_LIST_DESTINATION.DATE_LIST,
  name,
});

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
    expect(toWeekAdditionSummary(createResponse(), GENERAL_DESTINATION)).toEqual(["Agregaste 4 ingredientes de 3 comidas a tu lista."]);
  });

  it("uses the singular for one ingredient and one meal", () => {
    expect(toWeekAdditionSummary(createResponse({ ingredientCount: 1, mealCount: 1 }), GENERAL_DESTINATION)).toEqual([
      "Agregaste 1 ingrediente de 1 comida a tu lista.",
    ]);
  });

  it("lists what is missing to buy", () => {
    expect(toWeekAdditionSummary(createResponse({ missingProductNames: ["Leche", "Azúcar"] }), GENERAL_DESTINATION)).toEqual([
      "Agregaste 4 ingredientes de 3 comidas a tu lista.",
      "Te falta comprar: Leche, Azúcar",
    ]);
  });

  it("lists what could not be added", () => {
    expect(toWeekAdditionSummary(createResponse({ skippedProductNames: ["Sal"] }), GENERAL_DESTINATION)).toEqual([
      "Agregaste 4 ingredientes de 3 comidas a tu lista.",
      "No se pudieron agregar: Sal",
    ]);
  });

  it("says the list already had what the week needs when nothing was added and nothing is missing", () => {
    expect(toWeekAdditionSummary(createResponse({ addedProductNames: [] }), GENERAL_DESTINATION)).toEqual([
      "Tu lista ya tenía lo necesario para esta semana.",
    ]);
  });

  it("does not say the list was enough when something could not be added", () => {
    expect(toWeekAdditionSummary(createResponse({ addedProductNames: [], skippedProductNames: ["Sal"] }), GENERAL_DESTINATION)).toEqual([
      "No se pudieron agregar: Sal",
    ]);
  });

  it("says there were no planned meals", () => {
    expect(
      toWeekAdditionSummary(createResponse({ addedProductNames: [], ingredientCount: 0, mealCount: 0 }), GENERAL_DESTINATION),
    ).toEqual(["No había comidas planeadas esta semana."]);
  });

  it("names the sublist the week was added to", () => {
    expect(toWeekAdditionSummary(createResponse(), createDateList("Paseo a la playa"))).toEqual([
      "Agregaste 4 ingredientes de 3 comidas a Paseo a la playa.",
    ]);
    expect(
      toWeekAdditionSummary(createResponse({ addedProductNames: [] }), createDateList("Paseo a la playa")),
    ).toEqual(["Paseo a la playa ya tenía lo necesario para esta semana."]);
  });

  it("shows the name of the sublist as it was written", () => {
    expect(toWeekAdditionSummary(createResponse(), createDateList("$& {meals}"))).toEqual([
      "Agregaste 4 ingredientes de 3 comidas a $& {meals}.",
    ]);
  });
});

describe("toDateListOption", () => {
  const TODAY_KEY = "2026-11-24";

  it("names the sublist with its short date", () => {
    expect(toDateListOption({ event_date: "2026-11-28", id: "a", name: "Paseo a la playa" }, TODAY_KEY)).toEqual({
      id: "a",
      label: "Paseo a la playa · 28 nov",
      name: "Paseo a la playa",
    });
  });

  it("adds the year when it is not the current one", () => {
    expect(toDateListOption({ event_date: "2027-01-01", id: "a", name: "Año nuevo" }, TODAY_KEY).label).toBe(
      "Año nuevo · 1 ene 2027",
    );
  });
});
