// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_DETAIL_STATUS, PRODUCT_TARGET_KIND } from "../constants/finance.constants";
import { useProductPurchases } from "../hooks/useProductPurchases";
import type { ProductPurchase } from "../models/ProductPurchase.interface";
import type { ProductPurchaseTarget } from "../models/ProductPurchaseTarget.type";
import { getProductPurchases, getSavedTimeZone } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({ getProductPurchases: vi.fn(), getSavedTimeZone: vi.fn() }));
const purchasesMock = vi.mocked(getProductPurchases);
const timeZoneMock = vi.mocked(getSavedTimeZone);

const MILK: ProductPurchaseTarget = { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey: "leche" };
const RICE: ProductPurchaseTarget = { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey: "arroz" };

const purchase = (id: string): ProductPurchase => ({
  appearanceCount: 1,
  closedAt: "2026-10-18T21:00:00+00:00",
  id,
  storeName: "MaxiPali",
  totalAmount: 10000,
  variantNames: ["1 L"],
});

const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetAllMocks();
  timeZoneMock.mockResolvedValue("America/Costa_Rica");
});

afterEach(cleanup);

describe("useProductPurchases", () => {
  it("is idle and asks nothing without a chosen product", () => {
    const { result } = renderHook(() => useProductPurchases(null, true));

    expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.IDLE);
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("asks nothing without a registered account (D6)", () => {
    const { result } = renderHook(() => useProductPurchases(MILK, false));

    expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.IDLE);
    expect(purchasesMock).not.toHaveBeenCalled();
  });

  it("gives the purchases of the chosen product with the saved time zone (rule 87)", async () => {
    purchasesMock.mockResolvedValue([purchase("a")]);

    const { result } = renderHook(() => useProductPurchases(MILK, true));

    expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledWith(MILK);
    expect(result.current.purchases).toEqual([purchase("a")]);
    expect(result.current.timeZone).toBe("America/Costa_Rica");
  });

  it("is empty, not an error, when the product has no purchases left (rule 90)", async () => {
    purchasesMock.mockResolvedValue([]);

    const { result } = renderHook(() => useProductPurchases(MILK, true));

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.EMPTY));
  });

  it("fails if the time zone cannot be read, and retries both", async () => {
    purchasesMock.mockResolvedValue([purchase("a")]);
    timeZoneMock.mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useProductPurchases(MILK, true));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.FAILED));

    act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledTimes(2);
    expect(result.current.timeZone).toBeNull();
  });

  it("discards the purchases of a product chosen before", async () => {
    const milkPurchases = createPending<ProductPurchase[]>();
    purchasesMock.mockReturnValueOnce(milkPurchases.promise).mockResolvedValueOnce([purchase("rice")]);
    const { rerender, result } = renderHook(({ target }) => useProductPurchases(target, true), {
      initialProps: { target: MILK as ProductPurchaseTarget },
    });

    rerender({ target: RICE });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
    await act(async () => milkPurchases.resolve([purchase("milk")]));

    expect(result.current.purchases).toEqual([purchase("rice")]);
  });

  it("forgets the purchases when the detail closes: reopening shows loading again", async () => {
    purchasesMock.mockResolvedValue([purchase("a")]);
    const { rerender, result } = renderHook(({ target }) => useProductPurchases(target, true), {
      initialProps: { target: MILK as ProductPurchaseTarget | null },
    });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));

    rerender({ target: null });
    rerender({ target: MILK });

    expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
    expect(purchasesMock).toHaveBeenCalledTimes(2);
  });
});
