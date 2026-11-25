import { beforeEach, describe, expect, it, vi } from "vitest";
import { INVENTORY_SUGGESTIONS_DB } from "../constants/inventory-suggestions.constants";
import { getInventorySuggestions } from "../services/inventory-suggestions.service";

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

const SUGGESTION_ROW = {
  base_quantity: 1000,
  base_unit: "ml",
  expected_out_at: "2026-11-20T15:00:00Z",
  last_purchased_at: "2026-11-13T15:00:00Z",
  product_catalog_variant_id: "variant-1",
  product_name: "Leche",
};

describe("getInventorySuggestions", () => {
  it("abre la sesión antes de pedir las sugerencias", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await getInventorySuggestions();

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(INVENTORY_SUGGESTIONS_DB.RPC.GET_INVENTORY_SUGGESTIONS);
  });

  it("adapta cada fila con su presentación", async () => {
    rpcMock.mockResolvedValue({ data: [SUGGESTION_ROW], error: null });

    await expect(getInventorySuggestions()).resolves.toEqual([
      {
        lastPurchasedAt: "2026-11-13T15:00:00Z",
        productName: "Leche",
        sizeLabel: "1000 ml",
        variantId: "variant-1",
      },
    ]);
  });

  it("devuelve una lista vacía si no hay sugerencias", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await expect(getInventorySuggestions()).resolves.toEqual([]);
  });

  it("propaga el error de la base", async () => {
    const databaseError = { code: "42501", message: "Se requiere una sesión" };
    rpcMock.mockResolvedValue({ data: null, error: databaseError });

    await expect(getInventorySuggestions()).rejects.toBe(databaseError);
  });
});
