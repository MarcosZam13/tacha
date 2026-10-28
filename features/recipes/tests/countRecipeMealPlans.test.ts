import { beforeEach, describe, expect, it, vi } from "vitest";
import { countRecipeMealPlans } from "../services/recipes.service";

// Sin Supabase real: el cliente falso encadena from → select → eq y entrega la respuesta que decide el test.
const fromMock = vi.fn();
const selectMock = vi.fn();
const eqMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  ensureSession: vi.fn().mockResolvedValue(undefined),
  getSupabaseClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  fromMock.mockReturnValue({ select: selectMock });
  selectMock.mockReturnValue({ eq: eqMock });
});

describe("countRecipeMealPlans", () => {
  it("counts the slots of the plan that use the recipe, without bringing the rows", async () => {
    eqMock.mockResolvedValue({ count: 3, error: null });

    const count = await countRecipeMealPlans("recipe-flan");

    expect(fromMock).toHaveBeenCalledWith("meal_plans");
    expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqMock).toHaveBeenCalledWith("recipe_id", "recipe-flan");
    expect(count).toBe(3);
  });

  it("answers zero when the recipe is not in the plan", async () => {
    eqMock.mockResolvedValue({ count: 0, error: null });

    await expect(countRecipeMealPlans("recipe-flan")).resolves.toBe(0);
  });

  it("answers zero when the database gives no count", async () => {
    eqMock.mockResolvedValue({ count: null, error: null });

    await expect(countRecipeMealPlans("recipe-flan")).resolves.toBe(0);
  });

  it("throws the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "permission denied" };
    eqMock.mockResolvedValue({ count: null, error: supabaseError });

    await expect(countRecipeMealPlans("recipe-flan")).rejects.toBe(supabaseError);
  });
});
