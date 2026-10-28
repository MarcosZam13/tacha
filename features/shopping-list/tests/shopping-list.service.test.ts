import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGeneralList, getKeptPersonalList } from "../services/shopping-list.service";

// Sin Supabase real: un cliente falso. Cada método de la consulta devuelve la
// misma consulta (como el builder de supabase-js) y maybeSingle la resuelve.
const rpcMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn();
const isMock = vi.fn();
const query = {
  eq: eqMock,
  is: isMock,
  maybeSingle: maybeSingleMock,
  or: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
};

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => Promise.resolve({ user: { id: "user-ana" } }),
  getSupabaseClient: () => ({ from: () => query, rpc: rpcMock }),
}));

// Ids inventados (no son de la base).
const HOUSEHOLD_LIST_ID = "list-household";
const PERSONAL_LIST_ID = "list-personal";

// Una fila de list_items como la devuelve el select embebido.
const LIST_ITEM_ROW = {
  checked_at: null,
  created_at: "2026-10-11T10:00:00Z",
  id: "item-1",
  product_catalog_variants: {
    base_quantity: 1000,
    base_unit: "ml",
    id: "variant-1",
    product_catalog: { name: "Leche" },
  },
  purchase_session_id: null,
  quantity_bought: null,
  quantity_requested: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  for (const method of [query.eq, query.is, query.or, query.order, query.select]) {
    method.mockReturnValue(query);
  }
});

describe("getGeneralList", () => {
  it("asks the database which list to show and reads that one (CA-05)", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LIST_ID, error: null });
    maybeSingleMock.mockResolvedValue({ data: { id: HOUSEHOLD_LIST_ID, list_items: [LIST_ITEM_ROW] }, error: null });

    const items = await getGeneralList();

    // Nombre literal a propósito: fija el contrato con la base (migración 024).
    expect(rpcMock).toHaveBeenCalledWith("find_general_list_id");
    expect(eqMock).toHaveBeenCalledWith("id", HOUSEHOLD_LIST_ID);
    expect(items).toEqual([
      expect.objectContaining({ id: "item-1", productName: "Leche", quantity: 2, variantId: "variant-1" }),
    ]);
  });

  it("returns an empty list without reading when there is no list yet", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(getGeneralList()).resolves.toEqual([]);
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "Se requiere una sesión para usar la lista" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getGeneralList()).rejects.toBe(supabaseError);
  });
});

describe("getKeptPersonalList", () => {
  it("returns the personal list when it is not the one already shown (D4)", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LIST_ID, error: null });
    maybeSingleMock.mockResolvedValue({ data: { id: PERSONAL_LIST_ID, list_items: [LIST_ITEM_ROW] }, error: null });

    const items = await getKeptPersonalList();

    expect(eqMock).toHaveBeenCalledWith("owner_id", "user-ana");
    expect(isMock).toHaveBeenCalledWith("household_id", null);
    expect(items).toHaveLength(1);
  });

  it("returns nothing without a household: the personal list is the main one", async () => {
    rpcMock.mockResolvedValue({ data: PERSONAL_LIST_ID, error: null });
    maybeSingleMock.mockResolvedValue({ data: { id: PERSONAL_LIST_ID, list_items: [LIST_ITEM_ROW] }, error: null });

    await expect(getKeptPersonalList()).resolves.toEqual([]);
  });

  it("returns nothing when there is no personal list", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LIST_ID, error: null });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(getKeptPersonalList()).resolves.toEqual([]);
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "PGRST000", message: "error" };
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LIST_ID, error: null });
    maybeSingleMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getKeptPersonalList()).rejects.toBe(supabaseError);
  });
});
