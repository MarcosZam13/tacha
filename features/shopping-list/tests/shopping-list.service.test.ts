import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGeneralList, getKeptPersonalList, setItemChecked } from "../services/shopping-list.service";

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

// Una fila de get_general_list_shortfalls (033) sobre LIST_ITEM_ROW.
const SHORTFALL_ROW = { list_item_id: "item-1", quantity_missing: 600, quantity_unit: "ml", recipe_name: "Tres leches" };

// getGeneralList llama dos RPC en paralelo: cada una responde por su nombre.
const mockGeneralListRpcs = (
  generalListResponse: { data: string | null; error: unknown },
  shortfallsResponse: { data: (typeof SHORTFALL_ROW)[] | null; error: unknown } = { data: [], error: null },
): void => {
  rpcMock.mockImplementation((rpcName: string) =>
    Promise.resolve(rpcName === "get_general_list_shortfalls" ? shortfallsResponse : generalListResponse),
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  for (const method of [query.eq, query.is, query.or, query.order, query.select]) {
    method.mockReturnValue(query);
  }
});

describe("getGeneralList", () => {
  it("asks the database which list to show and reads that one (CA-05)", async () => {
    mockGeneralListRpcs({ data: HOUSEHOLD_LIST_ID, error: null });
    maybeSingleMock.mockResolvedValue({ data: { id: HOUSEHOLD_LIST_ID, list_items: [LIST_ITEM_ROW] }, error: null });

    const items = await getGeneralList();

    // Nombre literal a propósito: fija el contrato con la base (migración 024).
    expect(rpcMock).toHaveBeenCalledWith("find_general_list_id");
    expect(eqMock).toHaveBeenCalledWith("id", HOUSEHOLD_LIST_ID);
    expect(items).toEqual([
      expect.objectContaining({ id: "item-1", productName: "Leche", quantity: 2, recipeShortfalls: [], variantId: "variant-1" }),
    ]);
  });

  it("attaches the recipe shortfalls to their rows (SCRUM-114)", async () => {
    mockGeneralListRpcs({ data: HOUSEHOLD_LIST_ID, error: null }, { data: [SHORTFALL_ROW], error: null });
    maybeSingleMock.mockResolvedValue({ data: { id: HOUSEHOLD_LIST_ID, list_items: [LIST_ITEM_ROW] }, error: null });

    const [item] = await getGeneralList();

    // Nombre literal a propósito: fija el contrato con la base (migración 033).
    expect(rpcMock).toHaveBeenCalledWith("get_general_list_shortfalls");
    expect(item.recipeShortfalls).toEqual([{ quantityMissing: 600, recipeName: "Tres leches", unit: "ml" }]);
  });

  it("fails the load when the shortfalls cannot be read, instead of showing a list without them", async () => {
    const supabaseError = { code: "PGRST000", message: "error" };
    mockGeneralListRpcs({ data: HOUSEHOLD_LIST_ID, error: null }, { data: null, error: supabaseError });
    maybeSingleMock.mockResolvedValue({ data: { id: HOUSEHOLD_LIST_ID, list_items: [LIST_ITEM_ROW] }, error: null });

    await expect(getGeneralList()).rejects.toBe(supabaseError);
  });

  it("returns an empty list without reading when there is no list yet", async () => {
    mockGeneralListRpcs({ data: null, error: null });

    await expect(getGeneralList()).resolves.toEqual([]);
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "Se requiere una sesión para usar la lista" };
    mockGeneralListRpcs({ data: null, error: supabaseError });

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
    // Sin avisos de faltante: no es la lista a la que se agregan recetas (SCRUM-114, regla 30).
    expect(items[0].recipeShortfalls).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalledWith("get_general_list_shortfalls");
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

describe("setItemChecked", () => {
  it("returns the check, the id and the quantity of the row the database left (SCRUM-156)", async () => {
    // Destachar con otra pendiente de la misma presentación: la base devuelve la pendiente.
    rpcMock.mockResolvedValue({
      data: { ...LIST_ITEM_ROW, id: "item-pending", quantity_requested: 4 },
      error: null,
    });

    await expect(setItemChecked("item-bought", false)).resolves.toEqual({
      check: { checkedAt: null, purchaseSessionId: null, quantityBought: null },
      itemId: "item-pending",
      quantity: 4,
    });
    expect(rpcMock).toHaveBeenCalledWith("set_list_item_checked", { is_checked: false, target_item_id: "item-bought" });
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "P0002", message: "El producto no está en tu lista" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(setItemChecked("item-ajeno", true)).rejects.toBe(supabaseError);
  });
});
