import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import { clearMealSlot, getMealPlan, getRecipeOptions, saveMealSlot } from "../services/meal-plan.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso. Cada método de
// la consulta devuelve el mismo objeto (encadenable) y el último paso entrega
// la respuesta que el test decide.
const rpcMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const gteMock = vi.fn();
const lteMock = vi.fn();
const orderMock = vi.fn();
const deleteMock = vi.fn();
const eqMock = vi.fn();
const ensureSessionMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => ensureSessionMock(),
  getSupabaseClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

const PLAN_ROW = {
  assigned_cook: "user-1",
  date: "2026-10-12",
  id: "slot-1",
  meal_type: "lunch",
  recipes: { base_servings: 12, id: "recipe-tres-leches", name: "Tres leches" },
  servings_multiplier: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  ensureSessionMock.mockResolvedValue(undefined);
  fromMock.mockReturnValue({ delete: deleteMock, select: selectMock });
  selectMock.mockReturnValue({ gte: gteMock, order: orderMock });
  gteMock.mockReturnValue({ lte: lteMock });
  deleteMock.mockReturnValue({ eq: eqMock });
  eqMock.mockReturnValue({ eq: eqMock });
});

describe("getMealPlan", () => {
  it("asks for the plan between the two dates and adapts each row", async () => {
    lteMock.mockResolvedValue({ data: [PLAN_ROW], error: null });

    const entries = await getMealPlan({ fromDateKey: "2026-10-05", toDateKey: "2026-10-18" });

    expect(fromMock).toHaveBeenCalledWith("meal_plans");
    expect(selectMock).toHaveBeenCalledWith(
      "id, date, meal_type, assigned_cook, servings_multiplier, recipes(id, name, base_servings)",
    );
    expect(gteMock).toHaveBeenCalledWith("date", "2026-10-05");
    expect(lteMock).toHaveBeenCalledWith("date", "2026-10-18");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      cookLabel: "Yo",
      dateKey: "2026-10-12",
      mealType: MEAL_TYPE.LUNCH,
      multiplierLabel: "×2",
      recipeName: "Tres leches",
    });
  });

  it("does not filter by owner: row level security decides what is visible", async () => {
    lteMock.mockResolvedValue({ data: [], error: null });

    await getMealPlan({ fromDateKey: "2026-10-05", toDateKey: "2026-10-18" });

    expect(eqMock).not.toHaveBeenCalled();
  });

  it("returns an empty plan when the user has nothing planned", async () => {
    lteMock.mockResolvedValue({ data: [], error: null });

    await expect(getMealPlan({ fromDateKey: "2026-10-05", toDateKey: "2026-10-18" })).resolves.toEqual([]);
  });

  it("makes sure there is a session before asking", async () => {
    lteMock.mockResolvedValue({ data: [], error: null });

    await getMealPlan({ fromDateKey: "2026-10-05", toDateKey: "2026-10-18" });

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
  });

  it("throws the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "permission denied" };
    lteMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getMealPlan({ fromDateKey: "2026-10-05", toDateKey: "2026-10-18" })).rejects.toBe(supabaseError);
  });
});

describe("saveMealSlot", () => {
  const PAYLOAD = {
    cookChoice: COOK_CHOICE.SELF,
    dateKey: "2026-10-12",
    mealType: MEAL_TYPE.LUNCH,
    recipeId: "recipe-tres-leches",
    servingsMultiplier: 2,
  };

  it("calls assign_meal_slot with the slot, the recipe and the multiplier, and returns the slot id", async () => {
    rpcMock.mockResolvedValue({ data: "slot-1", error: null });

    const response = await saveMealSlot(PAYLOAD);

    // Nombres literales a propósito: fijan el contrato con la base (migración 019).
    expect(rpcMock).toHaveBeenCalledWith("assign_meal_slot", {
      cook_is_self: true,
      slot_date: "2026-10-12",
      slot_meal_type: "lunch",
      slot_servings_multiplier: 2,
      target_recipe_id: "recipe-tres-leches",
    });
    expect(response).toEqual({ slotId: "slot-1" });
  });

  it("sends only whether the user cooks, never a user id", async () => {
    rpcMock.mockResolvedValue({ data: "slot-1", error: null });

    await saveMealSlot({ ...PAYLOAD, cookChoice: COOK_CHOICE.NONE });

    const [, args] = rpcMock.mock.calls[0];
    expect(args.cook_is_self).toBe(false);
    expect(Object.keys(args)).not.toContain("assigned_cook");
    expect(Object.keys(args)).not.toContain("owner_id");
  });

  it("returns null when the recipe does not exist any more", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "P0002", message: "Receta no encontrada" } });

    await expect(saveMealSlot(PAYLOAD)).resolves.toBeNull();
  });

  it("throws any other error", async () => {
    const supabaseError = { code: "23514", message: "check violation" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(saveMealSlot(PAYLOAD)).rejects.toBe(supabaseError);
  });
});

describe("clearMealSlot", () => {
  it("deletes the slot by day and meal and returns the empty slot", async () => {
    eqMock.mockReturnValueOnce({ eq: eqMock }).mockResolvedValueOnce({ error: null });

    const response = await clearMealSlot({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH });

    expect(fromMock).toHaveBeenCalledWith("meal_plans");
    expect(eqMock).toHaveBeenNthCalledWith(1, "date", "2026-10-12");
    expect(eqMock).toHaveBeenNthCalledWith(2, "meal_type", "lunch");
    expect(response).toEqual({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH });
  });

  it("throws the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "permission denied" };
    eqMock.mockReturnValueOnce({ eq: eqMock }).mockResolvedValueOnce({ error: supabaseError });

    await expect(clearMealSlot({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH })).rejects.toBe(supabaseError);
  });
});

describe("getRecipeOptions", () => {
  it("asks only for id, name and base servings, in alphabetical order, and adapts them", async () => {
    orderMock.mockResolvedValue({
      data: [{ base_servings: 4, id: "recipe-flan", name: "Flan" }],
      error: null,
    });

    const options = await getRecipeOptions();

    expect(fromMock).toHaveBeenCalledWith("recipes");
    expect(selectMock).toHaveBeenCalledWith("id, name, base_servings");
    expect(orderMock).toHaveBeenCalledWith("name", { ascending: true });
    expect(options).toEqual([{ baseServings: 4, id: "recipe-flan", name: "Flan", servingsLabel: "4 porciones" }]);
  });

  it("returns an empty list for a user without recipes", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });

    await expect(getRecipeOptions()).resolves.toEqual([]);
  });

  it("throws the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "permission denied" };
    orderMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getRecipeOptions()).rejects.toBe(supabaseError);
  });
});
