import { beforeEach, describe, expect, it, vi } from "vitest";
import { MY_INVENTORY_DB } from "../constants/my-inventory.constants";
import { SHELF_LIFE_CHOICE } from "@/features/shopping-list/constants/shelf-life.constants";
import {
  addInventoryItem,
  adjustInventoryItem,
  getMyInventory,
  markInventoryItemUsedUp,
} from "../services/my-inventory.service";

// Sin Supabase real: un cliente falso con solo rpc().
const rpcMock = vi.fn();
const ensureSessionMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => ensureSessionMock(),
  getSupabaseClient: () => ({ rpc: rpcMock }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  ensureSessionMock.mockResolvedValue({});
});

describe("getMyInventory (SCRUM-105)", () => {
  it("abre la sesión y adapta cada fila, también sin fecha", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          base_quantity: 1000,
          base_unit: "ml",
          expected_out_at: "2026-11-28T15:00:00Z",
          last_purchased_at: "2026-11-21T15:00:00Z",
          product_catalog_variant_id: "variant-leche",
          product_name: "Leche",
        },
        {
          base_quantity: 500,
          base_unit: "g",
          expected_out_at: null,
          last_purchased_at: "2026-11-01T15:00:00Z",
          product_catalog_variant_id: "variant-sal",
          product_name: "Sal",
        },
      ],
      error: null,
    });

    await expect(getMyInventory()).resolves.toEqual([
      { expectedOutAt: "2026-11-28T15:00:00Z", productName: "Leche", sizeLabel: "1000 ml", variantId: "variant-leche" },
      { expectedOutAt: null, productName: "Sal", sizeLabel: "500 g", variantId: "variant-sal" },
    ]);
    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(MY_INVENTORY_DB.RPC.GET_MY_INVENTORY);
  });

  it("propaga el error de la base", async () => {
    const databaseError = { code: "42501", message: "Se requiere una sesión para ver el inventario" };
    rpcMock.mockResolvedValue({ data: null, error: databaseError });

    await expect(getMyInventory()).rejects.toBe(databaseError);
  });
});

describe("markInventoryItemUsedUp (SCRUM-106)", () => {
  it("abre la sesión y manda la presentación", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(markInventoryItemUsedUp("variant-leche")).resolves.toBeUndefined();
    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(MY_INVENTORY_DB.RPC.MARK_INVENTORY_ITEM_USED_UP, {
      target_variant_id: "variant-leche",
    });
  });

  it("propaga el error de la base", async () => {
    const databaseError = { code: "22023", message: "El producto no está en tu inventario" };
    rpcMock.mockResolvedValue({ data: null, error: databaseError });

    await expect(markInventoryItemUsedUp("variant-leche")).rejects.toBe(databaseError);
  });
});

describe("addInventoryItem (SCRUM-107)", () => {
  it("abre la sesión y manda la presentación y el chip", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(addInventoryItem("variant-leche", SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS)).resolves.toBeUndefined();
    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(MY_INVENTORY_DB.RPC.ADD_INVENTORY_ITEM, {
      target_choice: "two_to_four_weeks",
      target_variant_id: "variant-leche",
    });
  });

  it("sin chip no manda target_choice (la base usa null)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await addInventoryItem("variant-leche", null);

    expect(rpcMock).toHaveBeenCalledWith(MY_INVENTORY_DB.RPC.ADD_INVENTORY_ITEM, {
      target_choice: undefined,
      target_variant_id: "variant-leche",
    });
  });

  it("propaga el error de la base", async () => {
    const databaseError = { code: "22023", message: "Ese producto no se puede agregar" };
    rpcMock.mockResolvedValue({ data: null, error: databaseError });

    await expect(addInventoryItem("variant-leche", null)).rejects.toBe(databaseError);
  });
});

describe("adjustInventoryItem (SCRUM-106)", () => {
  it("abre la sesión y manda la presentación y el chip", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await expect(adjustInventoryItem("variant-leche", SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS)).resolves.toBeUndefined();
    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(MY_INVENTORY_DB.RPC.ADJUST_INVENTORY_ITEM, {
      target_choice: "one_to_three_months",
      target_variant_id: "variant-leche",
    });
  });

  it("propaga el error de la base", async () => {
    const databaseError = { code: "22023", message: "Duración no válida" };
    rpcMock.mockResolvedValue({ data: null, error: databaseError });

    await expect(adjustInventoryItem("variant-leche", SHELF_LIFE_CHOICE.FEW_DAYS)).rejects.toBe(databaseError);
  });
});
