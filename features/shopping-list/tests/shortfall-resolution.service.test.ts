import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHORTFALL_RESOLUTION } from "../constants/shortfall-resolution.constants";
import {
  getProductPresentations,
  resolveShortfall,
  undoShortfallResolutionAndUncheck,
} from "../services/shortfall-resolution.service";

// Sin Supabase real: un cliente falso. La consulta de presentaciones devuelve
// la misma consulta en cada paso (como el builder de supabase-js) y single la resuelve.
const rpcMock = vi.fn();
const singleMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();
const query = { eq: eqMock, select: selectMock, single: singleMock };

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => Promise.resolve({ user: { id: "user-ana" } }),
  getSupabaseClient: () => ({ from: () => query, rpc: rpcMock }),
}));

const ITEM_ID = "item-leche";

beforeEach(() => {
  vi.resetAllMocks();
  eqMock.mockReturnValue(query);
  selectMock.mockReturnValue(query);
});

describe("resolveShortfall", () => {
  it("sends the choice to the database (migration 037)", async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null });

    const response = await resolveShortfall({
      itemId: ITEM_ID,
      resolution: SHORTFALL_RESOLUTION.OTHER_PRESENTATION,
      variantId: "variant-galon",
    });

    // Nombre literal a propósito: fija el contrato con la base.
    expect(rpcMock).toHaveBeenCalledWith("resolve_list_item_shortfall", {
      resolution: "otherPresentation",
      target_item_id: ITEM_ID,
      target_variant_id: "variant-galon",
    });
    expect(response).toEqual({ isApplied: true });
  });

  it("reports a row that another member unchecked or deleted as not applied, not as an error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "22023", message: "ya no está tachado" } });

    await expect(
      resolveShortfall({ itemId: ITEM_ID, resolution: SHORTFALL_RESOLUTION.SAME_AGAIN }),
    ).resolves.toEqual({ isApplied: false });
  });

  it("rethrows any other Supabase error", async () => {
    const supabaseError = { code: "PGRST000", message: "error" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(
      resolveShortfall({ itemId: ITEM_ID, resolution: SHORTFALL_RESOLUTION.HAD_ENOUGH }),
    ).rejects.toBe(supabaseError);
  });
});

describe("undoShortfallResolutionAndUncheck", () => {
  it("undoes and unchecks in one call", async () => {
    rpcMock.mockResolvedValue({ data: {}, error: null });

    await expect(undoShortfallResolutionAndUncheck(ITEM_ID)).resolves.toEqual({ isApplied: true });
    expect(rpcMock).toHaveBeenCalledWith("undo_shortfall_resolution_and_uncheck", { target_item_id: ITEM_ID });
  });

  it("reports a row that is no longer visible as not applied", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "P0002", message: "no está en tu lista" } });

    await expect(undoShortfallResolutionAndUncheck(ITEM_ID)).resolves.toEqual({ isApplied: false });
  });
});

describe("getProductPresentations", () => {
  it("reads every presentation of the product with its prices, ignoring missing prices", async () => {
    singleMock.mockResolvedValue({
      data: {
        product_catalog: {
          product_catalog_variants: [
            { base_quantity: 1000, base_unit: "ml", id: "variant-1l", latest_prices: [{ price: 900 }, { price: null }] },
            { base_quantity: 3780, base_unit: "ml", id: "variant-galon", latest_prices: [] },
          ],
        },
      },
      error: null,
    });

    const presentations = await getProductPresentations("variant-1l");

    expect(eqMock).toHaveBeenCalledWith("id", "variant-1l");
    expect(presentations).toEqual([
      { baseQuantity: 1000, baseUnit: "ml", prices: [900], variantId: "variant-1l" },
      { baseQuantity: 3780, baseUnit: "ml", prices: [], variantId: "variant-galon" },
    ]);
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "PGRST116", message: "no encontrada" };
    singleMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getProductPresentations("variant-1l")).rejects.toBe(supabaseError);
  });
});
