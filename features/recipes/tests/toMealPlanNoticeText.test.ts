import { describe, expect, it } from "vitest";
import { toMealPlanNoticeText } from "../utils/toMealPlanNoticeText";

describe("toMealPlanNoticeText", () => {
  it("says how many slots of the plan will be left empty", () => {
    expect(toMealPlanNoticeText(3)).toBe("Está en 3 espacios de tu plan; quedarán vacíos.");
  });

  it("uses the singular for one slot", () => {
    expect(toMealPlanNoticeText(1)).toBe("Está en 1 espacio de tu plan; quedará vacío.");
  });

  it("has no notice when the recipe is not in the plan", () => {
    expect(toMealPlanNoticeText(0)).toBeNull();
  });

  it("has no notice when the count is not known", () => {
    expect(toMealPlanNoticeText(null)).toBeNull();
  });
});
