import { beforeEach, describe, expect, it, vi } from "vitest";
import { SET_ASSIGNEE_ENABLED_RESULT } from "../constants/list-settings.constants";
import { getSettableLists, setAssigneeEnabled } from "../services/list-settings.service";

// Sin Supabase real: un cliente falso. select devuelve la misma consulta (como el builder de supabase-js) e in
// la resuelve.
const rpcMock = vi.fn();
const query = { in: vi.fn(), select: vi.fn() };

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => Promise.resolve({ user: { id: "user-ana" } }),
  getSupabaseClient: () => ({ from: () => query, rpc: rpcMock }),
}));

// Ids inventados (no son de la base).
const LIST_ROW = {
  event_date: null,
  household_id: null,
  id: "list-general",
  list_settings: { assignee_enabled: true },
  name: null,
  type: "general",
};

beforeEach(() => {
  vi.resetAllMocks();
  query.select.mockReturnValue(query);
  query.in.mockResolvedValue({ data: [LIST_ROW], error: null });
});

describe("getSettableLists", () => {
  it("returns the lists with their setting, asking only for general lists and sublists", async () => {
    const lists = await getSettableLists();

    expect(lists).toEqual([{ id: "list-general", isEnabled: true, label: "Lista general" }]);
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining("list_settings(assignee_enabled)"));
    expect(query.in).toHaveBeenCalledWith("type", ["date", "general"]);
  });

  it("throws when the read fails so the view model can show the retry", async () => {
    query.in.mockResolvedValue({ data: null, error: { code: "XX000" } });

    await expect(getSettableLists()).rejects.toEqual({ code: "XX000" });
  });
});

describe("setAssigneeEnabled", () => {
  it("turns the setting on for a list", async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null });

    const result = await setAssigneeEnabled("list-general", true);

    expect(result).toBe(SET_ASSIGNEE_ENABLED_RESULT.SAVED);
    expect(rpcMock).toHaveBeenCalledWith("set_list_assignee_enabled", { enabled: true, target_list_id: "list-general" });
  });

  it("turns the setting off for a list", async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null });

    await setAssigneeEnabled("list-general", false);

    expect(rpcMock).toHaveBeenCalledWith("set_list_assignee_enabled", { enabled: false, target_list_id: "list-general" });
  });

  it("recognizes a list that no longer exists by the database code", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "P0002", message: "texto que no se mira" } });

    expect(await setAssigneeEnabled("list-general", true)).toBe(SET_ASSIGNEE_ENABLED_RESULT.NOT_FOUND);
  });

  it("returns an error result for any other database error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "42501", message: "sin cuenta" } });

    expect(await setAssigneeEnabled("list-general", true)).toBe(SET_ASSIGNEE_ENABLED_RESULT.ERROR);
  });

  it("returns an error result instead of throwing when the request fails", async () => {
    rpcMock.mockRejectedValue(new Error("sin red"));

    expect(await setAssigneeEnabled("list-general", true)).toBe(SET_ASSIGNEE_ENABLED_RESULT.ERROR);
  });
});
