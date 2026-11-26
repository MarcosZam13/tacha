import { beforeEach, describe, expect, it, vi } from "vitest";
import { MY_INVENTORY_DB } from "../constants/my-inventory.constants";
import { getMyInventory } from "../services/my-inventory.service";

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
