import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASSIGNEE_LIST_SOURCE, SET_ITEM_ASSIGNEE_RESULT } from "../constants/assignee-field.constants";
import { getListAssigneeData, setItemAssignee } from "../services/assignee.service";

// Sin Supabase real: un cliente falso. Cada método de la consulta devuelve la misma consulta (como el builder
// de supabase-js) y el último la resuelve.
const rpcMock = vi.fn();
const fromMock = vi.fn();
const settingsQuery = { eq: vi.fn(), maybeSingle: vi.fn(), select: vi.fn() };
const itemsQuery = { eq: vi.fn(), not: vi.fn(), select: vi.fn() };

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => Promise.resolve({ user: { id: "user-ana" } }),
  getSupabaseClient: () => ({
    from: (table: string) => {
      fromMock(table);
      return table === "list_settings" ? settingsQuery : itemsQuery;
    },
    rpc: rpcMock,
  }),
}));

// Ids inventados (no son de la base).
const LIST_ID = "list-1";
const LIST_SOURCE = { kind: ASSIGNEE_LIST_SOURCE.LIST, listId: LIST_ID } as const;
const GENERAL_SOURCE = { kind: ASSIGNEE_LIST_SOURCE.GENERAL } as const;

const CANDIDATE_ROWS = [
  { display_name: "Ana", is_current_user: true, user_id: "user-ana" },
  { display_name: null, is_current_user: false, user_id: "user-beto" },
];

beforeEach(() => {
  vi.resetAllMocks();
  settingsQuery.select.mockReturnValue(settingsQuery);
  settingsQuery.eq.mockReturnValue(settingsQuery);
  itemsQuery.select.mockReturnValue(itemsQuery);
  itemsQuery.eq.mockReturnValue(itemsQuery);
  settingsQuery.maybeSingle.mockResolvedValue({ data: { assignee_enabled: true }, error: null });
  itemsQuery.not.mockResolvedValue({
    data: [{ assigned_to: "user-beto", id: "item-1" }],
    error: null,
  });
  rpcMock.mockImplementation((rpcName: string) =>
    Promise.resolve(
      rpcName === "get_list_assignee_candidates"
        ? { data: CANDIDATE_ROWS, error: null }
        : { data: LIST_ID, error: null },
    ),
  );
});

describe("getListAssigneeData", () => {
  it("returns who is assigned to each item and who can be chosen when the setting is on", async () => {
    const data = await getListAssigneeData(LIST_SOURCE);

    expect(data).toEqual({
      assignments: { "item-1": "user-beto" },
      candidates: [
        { displayName: "Ana", isCurrentUser: true, userId: "user-ana" },
        { displayName: null, isCurrentUser: false, userId: "user-beto" },
      ],
      isEnabled: true,
    });
    expect(settingsQuery.eq).toHaveBeenCalledWith("list_id", LIST_ID);
    expect(itemsQuery.eq).toHaveBeenCalledWith("list_id", LIST_ID);
    expect(rpcMock).toHaveBeenCalledWith("get_list_assignee_candidates", { target_list_id: LIST_ID });
  });

  // Fija la tabla, las columnas y el filtro con nombres literales: los mocks no los comprueban solos.
  it("reads the setting from list_settings and only the items that have an assignee from list_items", async () => {
    await getListAssigneeData(LIST_SOURCE);

    expect(fromMock).toHaveBeenCalledWith("list_settings");
    expect(fromMock).toHaveBeenCalledWith("list_items");
    expect(settingsQuery.select).toHaveBeenCalledWith("assignee_enabled");
    expect(itemsQuery.select).toHaveBeenCalledWith("id, assigned_to");
    expect(itemsQuery.not).toHaveBeenCalledWith("assigned_to", "is", null);
  });

  it("does not read items or candidates when the setting is off", async () => {
    settingsQuery.maybeSingle.mockResolvedValue({ data: { assignee_enabled: false }, error: null });

    const data = await getListAssigneeData(LIST_SOURCE);

    expect(data.isEnabled).toBe(false);
    expect(itemsQuery.not).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("counts a list without a settings row as off", async () => {
    settingsQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

    expect((await getListAssigneeData(LIST_SOURCE)).isEnabled).toBe(false);
  });

  it("finds the general list through the database", async () => {
    await getListAssigneeData(GENERAL_SOURCE);

    expect(rpcMock).toHaveBeenCalledWith("find_general_list_id");
    expect(settingsQuery.eq).toHaveBeenCalledWith("list_id", LIST_ID);
  });

  it("is off when the general list does not exist yet", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const data = await getListAssigneeData(GENERAL_SOURCE);

    expect(data.isEnabled).toBe(false);
    expect(settingsQuery.select).not.toHaveBeenCalled();
  });

  it("throws when a read fails so the view model can decide", async () => {
    settingsQuery.maybeSingle.mockResolvedValue({ data: null, error: { code: "XX000" } });

    await expect(getListAssigneeData(LIST_SOURCE)).rejects.toEqual({ code: "XX000" });
  });
});

describe("setItemAssignee", () => {
  it("saves the chosen assignee", async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null });

    const result = await setItemAssignee({ assigneeId: "user-beto", itemId: "item-1" });

    expect(result).toBe(SET_ITEM_ASSIGNEE_RESULT.SAVED);
    expect(rpcMock).toHaveBeenCalledWith("set_list_item_assignee", {
      new_assignee: "user-beto",
      target_item_id: "item-1",
    });
  });

  it("sends a null assignee to clear it", async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null });

    await setItemAssignee({ assigneeId: null, itemId: "item-1" });

    expect(rpcMock).toHaveBeenCalledWith("set_list_item_assignee", { new_assignee: null, target_item_id: "item-1" });
  });

  it.each([
    ["P0002", SET_ITEM_ASSIGNEE_RESULT.NOT_FOUND],
    ["22023", SET_ITEM_ASSIGNEE_RESULT.NOT_ALLOWED],
    ["42501", SET_ITEM_ASSIGNEE_RESULT.ERROR],
  ])("recognizes the database error %s by its code", async (code, expected) => {
    rpcMock.mockResolvedValue({ data: null, error: { code, message: "texto que no se mira" } });

    expect(await setItemAssignee({ assigneeId: "user-beto", itemId: "item-1" })).toBe(expected);
  });

  it("returns an error result instead of throwing when the request fails", async () => {
    rpcMock.mockRejectedValue(new Error("sin red"));

    expect(await setItemAssignee({ assigneeId: "user-beto", itemId: "item-1" })).toBe(SET_ITEM_ASSIGNEE_RESULT.ERROR);
  });
});
