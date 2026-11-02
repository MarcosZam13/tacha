// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import {
  SHORTFALL_PANEL_STATUS,
  SHORTFALL_PANEL_TEXT,
  SHORTFALL_RESOLUTION,
} from "../constants/shortfall-resolution.constants";
import { useShortfallResolution } from "../hooks/useShortfallResolution";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { getProductPresentations, resolveShortfall } from "../services/shortfall-resolution.service";

vi.mock("../services/shortfall-resolution.service", () => ({
  getProductPresentations: vi.fn(),
  resolveShortfall: vi.fn(),
}));
const resolveShortfallMock = vi.mocked(resolveShortfall);
const getProductPresentationsMock = vi.mocked(getProductPresentations);

const SHORTFALL = { quantityMissing: 600, recipeName: "Tres leches", unit: CATALOG_BASE_UNIT.MILLILITERS };
const CHECKED_LECHE: ShoppingListItem = {
  checkedAt: "2026-11-01T15:00:00.000Z",
  id: "item-leche",
  productName: "Leche Dos Pinos",
  purchaseSessionId: null,
  quantity: 1,
  quantityBought: null,
  recipeShortfalls: [SHORTFALL],
  shortfallSnapshot: null,
  sizeLabel: "1000 ml",
  variantId: "variant-1l",
};

/** Una respuesta que el test decide cuándo llega. */
const createPendingResponse = <Response>() => {
  let resolve: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderOpenPanel = (reloadedItems: ShoppingListItem[] | null) => {
  const reload = vi.fn(() => Promise.resolve(reloadedItems));
  const hook = renderHook(() => useShortfallResolution({ items: [CHECKED_LECHE], reload }));
  act(() => hook.result.current.openFor(CHECKED_LECHE.id));
  return { ...hook, reload };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useShortfallResolution", () => {
  it("stays open with the choices when the row is still short after adding another one (rule 39)", async () => {
    resolveShortfallMock.mockResolvedValue({ isApplied: true });
    const { result, reload } = renderOpenPanel([{ ...CHECKED_LECHE, quantity: 2 }]);

    await act(async () => result.current.choose(SHORTFALL_RESOLUTION.SAME_AGAIN));

    expect(resolveShortfallMock).toHaveBeenCalledWith({
      itemId: CHECKED_LECHE.id,
      resolution: SHORTFALL_RESOLUTION.SAME_AGAIN,
      variantId: undefined,
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({
      isStillShort: true,
      itemId: CHECKED_LECHE.id,
      status: SHORTFALL_PANEL_STATUS.CHOOSING,
    });
  });

  it("closes once the row has no shortfall left", async () => {
    resolveShortfallMock.mockResolvedValue({ isApplied: true });
    const { result } = renderOpenPanel([{ ...CHECKED_LECHE, recipeShortfalls: [] }]);

    await act(async () => result.current.choose(SHORTFALL_RESOLUTION.HAD_ENOUGH));

    expect(result.current.state.status).toBe(SHORTFALL_PANEL_STATUS.CLOSED);
  });

  it("closes and reloads when another member already unchecked the row", async () => {
    resolveShortfallMock.mockResolvedValue({ isApplied: false });
    const { result, reload } = renderOpenPanel([CHECKED_LECHE]);

    await act(async () => result.current.choose(SHORTFALL_RESOLUTION.SAME_AGAIN));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe(SHORTFALL_PANEL_STATUS.CLOSED);
    expect(result.current.noticeMessage).toBe(SHORTFALL_PANEL_TEXT.ROW_CHANGED);
  });

  it("keeps the panel open with the message when saving fails", async () => {
    resolveShortfallMock.mockRejectedValue(new Error("network"));
    const { result } = renderOpenPanel([CHECKED_LECHE]);

    await act(async () => result.current.choose(SHORTFALL_RESOLUTION.SAME_AGAIN));

    expect(result.current.state).toEqual({
      errorMessage: SHORTFALL_PANEL_TEXT.RESOLVE_ERROR,
      itemId: CHECKED_LECHE.id,
      status: SHORTFALL_PANEL_STATUS.FAILED,
    });
  });

  it("sends a single request on a double click", async () => {
    const response = createPendingResponse<{ isApplied: boolean }>();
    resolveShortfallMock.mockReturnValue(response.promise);
    const { result } = renderOpenPanel([CHECKED_LECHE]);

    act(() => {
      void result.current.choose(SHORTFALL_RESOLUTION.SAME_AGAIN);
    });
    act(() => {
      void result.current.choose(SHORTFALL_RESOLUTION.SAME_AGAIN);
    });
    await act(async () => response.resolve({ isApplied: true }));

    expect(resolveShortfallMock).toHaveBeenCalledTimes(1);
  });

  it("does not close while saving", async () => {
    const response = createPendingResponse<{ isApplied: boolean }>();
    resolveShortfallMock.mockReturnValue(response.promise);
    const { result } = renderOpenPanel([CHECKED_LECHE]);

    act(() => {
      void result.current.choose(SHORTFALL_RESOLUTION.SAME_AGAIN);
    });
    act(() => result.current.close());

    expect(result.current.state.status).toBe(SHORTFALL_PANEL_STATUS.RESOLVING);
    await act(async () => response.resolve({ isApplied: true }));
  });

  it("shows the other presentations of the product and saves the one picked (CA-02, CA-04)", async () => {
    getProductPresentationsMock.mockResolvedValue([
      { baseQuantity: 1000, baseUnit: CATALOG_BASE_UNIT.MILLILITERS, prices: [900], variantId: "variant-1l" },
      { baseQuantity: 3780, baseUnit: CATALOG_BASE_UNIT.MILLILITERS, prices: [2300], variantId: "variant-galon" },
      // En g: no cubre los avisos en ml de la fila, no se ofrece.
      { baseQuantity: 800, baseUnit: CATALOG_BASE_UNIT.GRAMS, prices: [5800], variantId: "variant-polvo" },
    ]);
    resolveShortfallMock.mockResolvedValue({ isApplied: true });
    const { result } = renderOpenPanel([{ ...CHECKED_LECHE, recipeShortfalls: [] }]);

    await act(async () => result.current.requestPresentations());

    expect(getProductPresentationsMock).toHaveBeenCalledWith("variant-1l");
    expect(result.current.state).toMatchObject({
      presentations: [expect.objectContaining({ variantId: "variant-galon" })],
      status: SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION,
    });

    await act(async () => result.current.pickPresentation("variant-galon"));

    expect(resolveShortfallMock).toHaveBeenCalledWith({
      itemId: CHECKED_LECHE.id,
      resolution: SHORTFALL_RESOLUTION.OTHER_PRESENTATION,
      variantId: "variant-galon",
    });
  });

  it("shows the error with a retry when the presentations cannot be loaded", async () => {
    getProductPresentationsMock.mockRejectedValue(new Error("network"));
    const { result } = renderOpenPanel([CHECKED_LECHE]);

    await act(async () => result.current.requestPresentations());

    expect(result.current.state).toEqual({
      errorMessage: SHORTFALL_PANEL_TEXT.PRESENTATIONS_ERROR,
      itemId: CHECKED_LECHE.id,
      status: SHORTFALL_PANEL_STATUS.PRESENTATIONS_FAILED,
    });
  });
});
