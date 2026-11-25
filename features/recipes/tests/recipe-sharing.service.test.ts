import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyRecipe, hasHousehold, shareRecipe } from "../services/recipe-sharing.service";

const rpcMock = vi.fn();
vi.mock("@/services/supabase.client", () => ({
  ensureSession: vi.fn().mockResolvedValue(undefined),
  getSupabaseClient: () => ({ rpc: rpcMock }),
}));

beforeEach(() => {
  rpcMock.mockReset();
});

describe("hasHousehold", () => {
  it.each([
    ["family", true],
    [null, false],
  ])("with %j is %j", async (data, expected) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(hasHousehold()).resolves.toBe(expected);
    expect(rpcMock).toHaveBeenCalledWith("current_household_id");
  });

  it("fails when it could not be asked", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "x" } });

    await expect(hasHousehold()).rejects.toEqual({ code: "x" });
  });
});

describe("shareRecipe", () => {
  it("shares without sending the family", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await expect(shareRecipe("flan")).resolves.toEqual({ kind: "shared" });
    expect(rpcMock).toHaveBeenCalledExactlyOnceWith("share_recipe", { target_recipe_id: "flan" });
  });

  it("brings the personal products", async () => {
    rpcMock.mockResolvedValue({ data: ["Pan"], error: null });

    await expect(shareRecipe("flan")).resolves.toEqual({ kind: "personalProducts", productNames: ["Pan"] });
  });

  it.each([
    [{ code: "P0002" }, "notFound"],
    [{ code: "42501", hint: "recipe_no_household" }, "noHousehold"],
    [{ code: "22023", hint: "recipe_household_limit" }, "householdLimit"],
    [{ code: "42501" }, "failed"],
    [{ code: "57014" }, "failed"],
  ])("with the error %j ends as %s", async (error, kind) => {
    rpcMock.mockResolvedValue({ data: null, error });

    await expect(shareRecipe("flan")).resolves.toEqual({ kind });
  });

  it("does not throw", async () => {
    rpcMock.mockRejectedValue(new Error("network"));

    await expect(shareRecipe("flan")).resolves.toEqual({ kind: "failed" });
  });
});

describe("copyRecipe", () => {
  it("copies, or says the recipe cannot be seen", async () => {
    rpcMock.mockResolvedValueOnce({ data: "copy", error: null });
    await expect(copyRecipe("flan")).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("copy_recipe", { target_recipe_id: "flan" });

    rpcMock.mockResolvedValueOnce({ data: null, error: { code: "P0002" } });
    await expect(copyRecipe("flan")).resolves.toBe(false);
  });

  it("fails with any other error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "57014" } });

    await expect(copyRecipe("flan")).rejects.toEqual({ code: "57014" });
  });
});
