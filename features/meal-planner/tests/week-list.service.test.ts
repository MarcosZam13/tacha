import { beforeEach, describe, expect, it, vi } from "vitest";
import { addWeekToList } from "../services/week-list.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso que responde lo que el test decide.
const rpcMock = vi.fn();
const ensureSessionMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => ensureSessionMock(),
  getSupabaseClient: () => ({ rpc: rpcMock }),
}));

const RANGE = { fromDateKey: "2026-10-12", toDateKey: "2026-10-18" };

beforeEach(() => {
  vi.resetAllMocks();
  ensureSessionMock.mockResolvedValue(undefined);
});

describe("addWeekToList", () => {
  it("calls the RPC with the two dates of the week and adapts the answer", async () => {
    rpcMock.mockResolvedValue({
      data: {
        added: ["Leche"],
        ingredients: 2,
        meals: 3,
        missing: [{ product_name: "Harina", quantity: 300, unit: "g" }],
        skipped: [],
      },
      error: null,
    });

    const response = await addWeekToList(RANGE);

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("add_week_to_general_list", {
      week_from: "2026-10-12",
      week_to: "2026-10-18",
    });
    expect(response).toEqual({
      addedProductNames: ["Leche"],
      ingredientCount: 2,
      mealCount: 3,
      missingProductNames: ["Harina"],
      skippedProductNames: [],
    });
  });

  it("sends nothing about the user, the recipes or the quantities", async () => {
    rpcMock.mockResolvedValue({ data: { added: [], ingredients: 0, meals: 0, missing: [], skipped: [] }, error: null });

    await addWeekToList(RANGE);

    expect(Object.keys(rpcMock.mock.calls[0][1]).sort()).toEqual(["week_from", "week_to"]);
  });

  it("throws the database error", async () => {
    const databaseError = { code: "22023", message: "La receta puede tener hasta 50 ingredientes" };
    rpcMock.mockResolvedValue({ data: null, error: databaseError });

    await expect(addWeekToList(RANGE)).rejects.toBe(databaseError);
  });

  it("does not call the database when the session could not be opened", async () => {
    ensureSessionMock.mockRejectedValue(new Error("no session"));

    await expect(addWeekToList(RANGE)).rejects.toThrow("no session");
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
