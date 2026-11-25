import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import {
  clearHouseholdMealSlot,
  getHouseholdMealPlan,
  getHouseholdRecipeOptions,
  getOtherHouseholdCooks,
  saveHouseholdMealSlot,
} from "../services/household-meal-plan.service";

const rpcMock = vi.fn();
const query = { not: vi.fn(), order: vi.fn(), select: vi.fn() };
vi.mock("@/services/supabase.client", () => ({
  ensureSession: vi.fn().mockResolvedValue({ user: { id: "user-me" } }),
  getSupabaseClient: () => ({ from: () => query, rpc: rpcMock }),
}));

const RANGE = { fromDateKey: "2026-10-12", toDateKey: "2026-10-25" };
const ROW = {
  cook_is_current_user: false,
  cook_name: "Beto",
  cook_user_id: "user-beto",
  meal_type: "lunch",
  recipe_base_servings: 4,
  recipe_id: "flan",
  recipe_name: "Flan",
  servings_multiplier: 2,
  slot_date: "2026-10-12",
  slot_id: "slot-1",
};
const PAYLOAD = {
  cookChoice: "user-beto",
  dateKey: "2026-10-12",
  mealType: MEAL_TYPE.LUNCH,
  recipeId: "flan",
  servingsMultiplier: 2,
};
const NO_HOUSEHOLD = { code: "42501", hint: "plan_no_household" };

beforeEach(() => {
  rpcMock.mockReset();
  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
});

describe("getHouseholdMealPlan", () => {
  it.each([
    [{}, "user-beto", "Beto"],
    [{ cook_name: null }, "user-beto", "Integrante sin nombre"],
    [{ cook_is_current_user: true, cook_user_id: "user-me" }, COOK_CHOICE.SELF, "Yo"],
    [{ cook_name: null, cook_user_id: null }, COOK_CHOICE.NONE, null],
  ])("adapts the cook %j", async (overrides, cookChoice, cookLabel) => {
    rpcMock.mockResolvedValue({ data: [{ ...ROW, ...overrides }], error: null });

    expect(await getHouseholdMealPlan(RANGE)).toEqual([
      {
        baseServings: 4,
        cookChoice,
        cookLabel,
        dateKey: "2026-10-12",
        id: "slot-1",
        mealType: "lunch",
        multiplierLabel: "×2",
        recipeId: "flan",
        recipeName: "Flan",
        servingsMultiplier: 2,
      },
    ]);
    expect(rpcMock).toHaveBeenCalledWith("get_household_meal_plan", { plan_from: "2026-10-12", plan_to: "2026-10-25" });
  });

  it("is null without a family and fails with any other error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: NO_HOUSEHOLD });
    await expect(getHouseholdMealPlan(RANGE)).resolves.toBeNull();

    rpcMock.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(getHouseholdMealPlan(RANGE)).rejects.toEqual({ code: "42501" });
  });
});

describe("saveHouseholdMealSlot", () => {
  it.each([
    ["user-beto", "user-beto"],
    [COOK_CHOICE.SELF, "user-me"],
    [COOK_CHOICE.NONE, undefined],
  ])("sends the cook %s as %s, and never the family", async (cookChoice, cookUserId) => {
    rpcMock.mockResolvedValue({ data: "slot-1", error: null });

    await expect(saveHouseholdMealSlot({ ...PAYLOAD, cookChoice })).resolves.toEqual({ kind: "saved", slotId: "slot-1" });
    expect(rpcMock).toHaveBeenCalledWith("assign_household_meal_slot", {
      cook_user_id: cookUserId,
      slot_date: "2026-10-12",
      slot_meal_type: "lunch",
      slot_servings_multiplier: 2,
      target_recipe_id: "flan",
    });
  });

  it.each([
    [NO_HOUSEHOLD, "noHousehold"],
    [{ code: "P0002", hint: "plan_cook_not_member" }, "cookGone"],
    [{ code: "P0002" }, "recipeGone"],
  ])("with %j ends as %s", async (error, kind) => {
    rpcMock.mockResolvedValue({ data: null, error });

    await expect(saveHouseholdMealSlot(PAYLOAD)).resolves.toEqual({ kind });
  });

  it("fails with any other error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "23514" } });

    await expect(saveHouseholdMealSlot(PAYLOAD)).rejects.toEqual({ code: "23514" });
  });
});

describe("clearHouseholdMealSlot", () => {
  it("clears by day and meal, and says if there is no family", async () => {
    rpcMock.mockResolvedValueOnce({ error: null });
    await expect(clearHouseholdMealSlot(PAYLOAD)).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("clear_household_meal_slot", { slot_date: "2026-10-12", slot_meal_type: "lunch" });

    rpcMock.mockResolvedValueOnce({ error: NO_HOUSEHOLD });
    await expect(clearHouseholdMealSlot(PAYLOAD)).resolves.toBe(false);

    rpcMock.mockResolvedValueOnce({ error: { code: "x" } });
    await expect(clearHouseholdMealSlot(PAYLOAD)).rejects.toEqual({ code: "x" });
  });
});

describe("options of the dialog", () => {
  it("asks only for recipes of the family", async () => {
    query.order.mockResolvedValue({ data: [{ base_servings: 4, id: "flan", name: "Flan" }], error: null });

    expect(await getHouseholdRecipeOptions()).toEqual([
      { baseServings: 4, id: "flan", name: "Flan", servingsLabel: "4 porciones" },
    ]);
    expect(query.not).toHaveBeenCalledWith("household_id", "is", null);
  });

  it("brings the other members, also those without a name", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { display_name: "Yo misma", is_current_user: true, user_id: "user-me" },
        { display_name: "Beto", is_current_user: false, user_id: "user-beto" },
        { display_name: null, is_current_user: false, user_id: "user-c" },
      ],
      error: null,
    });

    expect(await getOtherHouseholdCooks()).toEqual([
      { label: "Beto", value: "user-beto" },
      { label: "Integrante sin nombre", value: "user-c" },
    ]);
    expect(rpcMock).toHaveBeenCalledWith("get_household_members_page", { page_size: 50 });
  });
});
