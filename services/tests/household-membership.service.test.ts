import { beforeEach, describe, expect, it, vi } from "vitest";
import { isHouseholdMember } from "../household-membership.service";

const rpcMock = vi.fn();
vi.mock("@/services/supabase.client", () => ({
  ensureSession: vi.fn().mockResolvedValue(undefined),
  getSupabaseClient: () => ({ rpc: rpcMock }),
}));

beforeEach(() => {
  rpcMock.mockReset();
});

describe("isHouseholdMember", () => {
  it.each([
    ["family", true],
    [null, false],
  ])("with %j is %j", async (data, expected) => {
    rpcMock.mockResolvedValue({ data, error: null });

    await expect(isHouseholdMember()).resolves.toBe(expected);
    expect(rpcMock).toHaveBeenCalledWith("current_household_id");
  });

  it("fails when it could not be asked", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "x" } });

    await expect(isHouseholdMember()).rejects.toEqual({ code: "x" });
  });
});
