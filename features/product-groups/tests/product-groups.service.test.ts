import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_GROUPS_DB } from "../constants/product-groups.constants";
import { createProductGroup, listProductGroups } from "../services/product-groups.service";

// Sin Supabase real: un cliente falso con from() encadenable y una sesión.
const ensureSessionMock = vi.fn();
const fromMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => ensureSessionMock(),
  getSupabaseClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

beforeEach(() => {
  ensureSessionMock.mockReset().mockResolvedValue({});
  fromMock.mockReset().mockReturnValue({ select: selectMock });
  selectMock.mockReset().mockReturnValue({ order: orderMock });
  orderMock.mockReset();
  rpcMock.mockReset();
});

describe("listProductGroups", () => {
  it("reads the visible groups, most recently updated first", async () => {
    orderMock.mockResolvedValue({ data: [], error: null });

    await listProductGroups();

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith(PRODUCT_GROUPS_DB.TABLE.PRODUCT_GROUPS);
    expect(selectMock).toHaveBeenCalledWith(PRODUCT_GROUPS_DB.SELECT);
    expect(orderMock).toHaveBeenCalledWith(PRODUCT_GROUPS_DB.COLUMN.UPDATED_AT, { ascending: false });
  });

  it("maps each row to its name, product count and shared flag", async () => {
    orderMock.mockResolvedValue({
      data: [
        { household_id: null, id: "group-1", name: "Mercado", product_group_items: [{ count: 3 }] },
        { household_id: "household-1", id: "group-2", name: "Desayunos", product_group_items: [{ count: 1 }] },
      ],
      error: null,
    });

    await expect(listProductGroups()).resolves.toEqual([
      { id: "group-1", isShared: false, name: "Mercado", productCount: 3 },
      { id: "group-2", isShared: true, name: "Desayunos", productCount: 1 },
    ]);
  });

  it("counts zero products when the count comes empty", async () => {
    orderMock.mockResolvedValue({
      data: [{ household_id: null, id: "group-1", name: "Vacío", product_group_items: [] }],
      error: null,
    });

    await expect(listProductGroups()).resolves.toEqual([
      { id: "group-1", isShared: false, name: "Vacío", productCount: 0 },
    ]);
  });

  it("fails when the query fails", async () => {
    const queryError = new Error("permission denied");
    orderMock.mockResolvedValue({ data: null, error: queryError });

    await expect(listProductGroups()).rejects.toBe(queryError);
  });

  it("does not query when there is no session", async () => {
    ensureSessionMock.mockRejectedValue(new Error("no session"));

    await expect(listProductGroups()).rejects.toThrow("no session");
    expect(fromMock).not.toHaveBeenCalled();
  });
});

// SCRUM-110: crear un grupo con sus productos (create_product_group, 056).
describe("createProductGroup", () => {
  const VALUES = {
    items: [
      { isPersonal: false, productName: "Leche", quantity: 2, sizeLabel: "1 L", variantId: "variant-leche" },
      { isPersonal: true, productName: "Queso", quantity: 1, sizeLabel: "500 g", variantId: "variant-queso" },
    ],
    name: "  Desayuno  ",
    shareWithHousehold: true,
  };

  it("sends the trimmed name, the share intention and the items in order", async () => {
    rpcMock.mockResolvedValue({ data: "group-1", error: null });

    await expect(createProductGroup(VALUES)).resolves.toBe("group-1");

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(PRODUCT_GROUPS_DB.RPC.CREATE_PRODUCT_GROUP, {
      group_name: "Desayuno",
      item_list: [
        { quantity: 2, variant_id: "variant-leche" },
        { quantity: 1, variant_id: "variant-queso" },
      ],
      share_with_household: true,
    });
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "22023", message: "Agrega al menos un producto" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(createProductGroup(VALUES)).rejects.toBe(supabaseError);
  });
});
