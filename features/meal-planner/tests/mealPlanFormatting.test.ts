import { describe, expect, it } from "vitest";
import { MEAL_TYPE } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import { clampServingsMultiplier } from "../utils/clampServingsMultiplier";
import { formatMultiplier } from "../utils/formatMultiplier";
import { formatResultingServings } from "../utils/formatResultingServings";
import { getMealSlotLabel, getMealSlotName } from "../utils/getMealSlotLabel";
import { toDecimalCommaText } from "../utils/toDecimalCommaText";
import { toMultiplierLabel } from "../utils/toMultiplierLabel";
import { toServingsSummaryText } from "../utils/toServingsSummaryText";
import { toSlotKey } from "../utils/toSlotKey";

const ARROZ_ENTRY: MealPlanEntry = {
  baseServings: 6,
  cookChoice: "self",
  cookLabel: "Yo",
  dateKey: "2026-10-12",
  id: "slot-1",
  mealType: MEAL_TYPE.LUNCH,
  multiplierLabel: null,
  recipeId: "recipe-arroz",
  recipeName: "Arroz con leche",
  servingsMultiplier: 1,
};

describe("formatMultiplier", () => {
  it("writes a whole multiplier with the times sign", () => {
    expect(formatMultiplier(2)).toBe("×2");
  });

  it("writes a decimal multiplier with a comma", () => {
    expect(formatMultiplier(0.5)).toBe("×0,5");
    expect(formatMultiplier(2.5)).toBe("×2,5");
  });
});

describe("toDecimalCommaText", () => {
  it("writes a whole number as is", () => {
    expect(toDecimalCommaText(3)).toBe("3");
  });

  it("writes the decimal point as a comma", () => {
    expect(toDecimalCommaText(1.5)).toBe("1,5");
  });
});

describe("toMultiplierLabel", () => {
  it("hides the chip when the multiplier is x1", () => {
    expect(toMultiplierLabel(1)).toBeNull();
  });

  it("shows the chip for any other multiplier", () => {
    expect(toMultiplierLabel(2)).toBe("×2");
    expect(toMultiplierLabel(0.5)).toBe("×0,5");
  });
});

describe("formatResultingServings", () => {
  it("multiplies the base servings", () => {
    expect(formatResultingServings(12, 2)).toBe("24 porciones");
  });

  it("keeps the base servings with x1", () => {
    expect(formatResultingServings(4, 1)).toBe("4 porciones");
  });

  it("writes a decimal result with a comma", () => {
    expect(formatResultingServings(3, 0.5)).toBe("1,5 porciones");
  });

  it("uses the singular for exactly one serving", () => {
    expect(formatResultingServings(1, 1)).toBe("1 porción");
    expect(formatResultingServings(2, 0.5)).toBe("1 porción");
  });
});

describe("toServingsSummaryText", () => {
  it("joins the multiplier and the resulting servings", () => {
    expect(toServingsSummaryText(12, 2)).toBe("×2 · 24 porciones");
  });
});

describe("clampServingsMultiplier", () => {
  it("keeps a value inside the range", () => {
    expect(clampServingsMultiplier(2.5)).toBe(2.5);
  });

  it("raises a value under the minimum to x0.5", () => {
    expect(clampServingsMultiplier(0)).toBe(0.5);
    expect(clampServingsMultiplier(-3)).toBe(0.5);
  });

  it("lowers a value over the maximum to x4", () => {
    expect(clampServingsMultiplier(4.5)).toBe(4);
    expect(clampServingsMultiplier(10)).toBe(4);
  });

  it("keeps both ends", () => {
    expect(clampServingsMultiplier(0.5)).toBe(0.5);
    expect(clampServingsMultiplier(4)).toBe(4);
  });
});

describe("toSlotKey", () => {
  it("joins the day and the meal", () => {
    expect(toSlotKey("2026-10-12", MEAL_TYPE.LUNCH)).toBe("2026-10-12|lunch");
  });

  it("gives different keys to the three meals of a day", () => {
    const keys = [MEAL_TYPE.BREAKFAST, MEAL_TYPE.LUNCH, MEAL_TYPE.DINNER].map((mealType) =>
      toSlotKey("2026-10-12", mealType),
    );

    expect(new Set(keys).size).toBe(3);
  });
});

describe("getMealSlotName", () => {
  it("names the slot with the meal and the day in lower case", () => {
    expect(getMealSlotName(MEAL_TYPE.LUNCH, "Lunes 12")).toBe("Almuerzo del lunes 12");
    expect(getMealSlotName(MEAL_TYPE.DINNER, "Miércoles 7")).toBe("Cena del miércoles 7");
  });
});

describe("getMealSlotLabel", () => {
  it("says an empty slot is empty and what pressing it does", () => {
    expect(getMealSlotLabel(MEAL_TYPE.LUNCH, "Lunes 12", null)).toBe("Almuerzo del lunes 12, vacío, asignar");
  });

  it("says what an assigned slot has and that pressing it changes it", () => {
    expect(getMealSlotLabel(MEAL_TYPE.LUNCH, "Lunes 12", ARROZ_ENTRY)).toBe(
      "Almuerzo del lunes 12: Arroz con leche, cambiar",
    );
  });
});
