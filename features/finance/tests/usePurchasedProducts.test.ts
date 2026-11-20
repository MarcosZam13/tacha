// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRODUCT_HISTORY,
  PRODUCT_LIST_STATUS,
  PRODUCT_MORE_STATUS,
  PRODUCT_TARGET_KIND,
} from "../constants/finance.constants";
import { usePurchasedProducts } from "../hooks/usePurchasedProducts";
import type { PurchasedProduct } from "../models/PurchasedProduct.interface";
import type { PurchasedProductsPage } from "../models/PurchasedProductsPage.interface";
import { getPurchasedProducts } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({ getPurchasedProducts: vi.fn() }));
const productsMock = vi.mocked(getPurchasedProducts);

const product = (productKey: string): PurchasedProduct => ({
  appearanceCount: 1,
  lastPurchasedAt: "2026-10-18T21:00:00+00:00",
  name: productKey,
  target: { kind: PRODUCT_TARGET_KIND.BY_NAME, productKey },
});
const productsFrom = (first: number, count: number): PurchasedProduct[] =>
  Array.from({ length: count }, (_, index) => product(`producto ${first + index}`));
const page = (products: PurchasedProduct[], totalCount: number): PurchasedProductsPage => ({ products, totalCount });

const SIZE = PRODUCT_HISTORY.PAGE_SIZE;

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<Value>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(cleanup);

describe("usePurchasedProducts", () => {
  it("asks nothing without a registered account (D6)", () => {
    const { result } = renderHook(() => usePurchasedProducts("", false));

    expect(productsMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe(PRODUCT_LIST_STATUS.LOADING);
  });

  it("loads the first block with the search and says whether more are missing", async () => {
    productsMock.mockResolvedValue(page(productsFrom(0, SIZE), SIZE + 5));

    const { result } = renderHook(() => usePurchasedProducts("  leche ", true));

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));
    expect(productsMock).toHaveBeenCalledWith({ offset: 0, search: "leche" });
    expect(result.current.products).toHaveLength(SIZE);
    expect(result.current.totalCount).toBe(SIZE + 5);
    expect(result.current.hasMore).toBe(true);
  });

  it("is empty without products and without a search", async () => {
    productsMock.mockResolvedValue(page([], 0));

    const { result } = renderHook(() => usePurchasedProducts("", true));

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.EMPTY));
  });

  it("is noMatches when a search finds nothing", async () => {
    productsMock.mockResolvedValue(page([], 0));

    const { result } = renderHook(() => usePurchasedProducts("zzz", true));

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.NO_MATCHES));
  });

  it("fails and retries the first block", async () => {
    productsMock.mockRejectedValueOnce(new Error("red")).mockResolvedValueOnce(page([product("leche")], 1));

    const { result } = renderHook(() => usePurchasedProducts("", true));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.FAILED));

    act(() => result.current.onRetry());

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));
    expect(productsMock).toHaveBeenCalledTimes(2);
  });

  it("loads more from the rows received, repeats included, until the end (rule 94)", async () => {
    const repeated = product("producto 0");
    productsMock
      .mockResolvedValueOnce(page(productsFrom(0, SIZE), SIZE + 3))
      .mockResolvedValueOnce(page([repeated, ...productsFrom(SIZE, 2)], SIZE + 3));

    const { result } = renderHook(() => usePurchasedProducts("", true));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.moreStatus).toBe(PRODUCT_MORE_STATUS.IDLE));

    expect(productsMock).toHaveBeenLastCalledWith({ offset: SIZE, search: "" });
    // El repetido se ve una vez, pero el offset cuenta las 3 filas que llegaron.
    expect(result.current.products).toHaveLength(SIZE + 2);
    expect(result.current.hasMore).toBe(false);
  });

  it("asks the next offset from the rows received, not from the merged length", async () => {
    productsMock
      .mockResolvedValueOnce(page(productsFrom(0, SIZE), SIZE * 3))
      .mockResolvedValueOnce(page([product("producto 0"), ...productsFrom(SIZE, SIZE - 1)], SIZE * 3))
      .mockResolvedValueOnce(page(productsFrom(SIZE * 2, SIZE), SIZE * 3));

    const { result } = renderHook(() => usePurchasedProducts("", true));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.products).toHaveLength(SIZE * 2 - 1));

    act(() => result.current.loadMore());

    await waitFor(() => expect(productsMock).toHaveBeenLastCalledWith({ offset: SIZE * 2, search: "" }));
  });

  it("ignores a second tap while a block is on its way: no duplicate requests", async () => {
    const pendingMore = createPending<PurchasedProductsPage>();
    productsMock.mockResolvedValueOnce(page(productsFrom(0, SIZE), SIZE + 1)).mockReturnValueOnce(pendingMore.promise);

    const { result } = renderHook(() => usePurchasedProducts("", true));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    act(() => result.current.loadMore());

    expect(productsMock).toHaveBeenCalledTimes(2);
    expect(result.current.moreStatus).toBe(PRODUCT_MORE_STATUS.LOADING_MORE);
    await act(async () => pendingMore.resolve(page(productsFrom(SIZE, 1), SIZE + 1)));
    expect(result.current.products).toHaveLength(SIZE + 1);
  });

  it("keeps what was loaded when Load more fails, and retries the same block", async () => {
    productsMock
      .mockResolvedValueOnce(page(productsFrom(0, SIZE), SIZE + 1))
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce(page(productsFrom(SIZE, 1), SIZE + 1));

    const { result } = renderHook(() => usePurchasedProducts("", true));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.moreStatus).toBe(PRODUCT_MORE_STATUS.MORE_FAILED));
    expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY);
    expect(result.current.products).toHaveLength(SIZE);

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.products).toHaveLength(SIZE + 1));
    expect(productsMock).toHaveBeenLastCalledWith({ offset: SIZE, search: "" });
  });

  it("goes back to the first block when the search changes", async () => {
    productsMock.mockResolvedValue(page([product("leche")], 1));
    const { rerender, result } = renderHook(({ search }) => usePurchasedProducts(search, true), {
      initialProps: { search: "" },
    });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));

    rerender({ search: "lec" });

    expect(result.current.status).toBe(PRODUCT_LIST_STATUS.LOADING);
    await waitFor(() => expect(productsMock).toHaveBeenLastCalledWith({ offset: 0, search: "lec" }));
  });

  it("discards a first block that arrives after the search changed", async () => {
    const oldSearch = createPending<PurchasedProductsPage>();
    productsMock.mockReturnValueOnce(oldSearch.promise).mockResolvedValueOnce(page([product("arroz")], 1));
    const { rerender, result } = renderHook(({ search }) => usePurchasedProducts(search, true), {
      initialProps: { search: "le" },
    });

    rerender({ search: "arr" });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));
    await act(async () => oldSearch.resolve(page([product("leche")], 1)));

    expect(result.current.products).toEqual([product("arroz")]);
  });

  it("discards a Load more block that arrives after the search changed", async () => {
    const oldMore = createPending<PurchasedProductsPage>();
    productsMock
      .mockResolvedValueOnce(page(productsFrom(0, SIZE), SIZE + 1))
      .mockReturnValueOnce(oldMore.promise)
      .mockResolvedValueOnce(page([product("arroz")], 1));
    const { rerender, result } = renderHook(({ search }) => usePurchasedProducts(search, true), {
      initialProps: { search: "" },
    });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));
    act(() => result.current.loadMore());

    rerender({ search: "arr" });
    await waitFor(() => expect(result.current.products).toEqual([product("arroz")]));
    await act(async () => oldMore.resolve(page(productsFrom(SIZE, 1), SIZE + 1)));

    expect(result.current.products).toEqual([product("arroz")]);
    expect(result.current.moreStatus).toBe(PRODUCT_MORE_STATUS.IDLE);
  });

  it("does not ask again for a search that only adds spaces at the ends", async () => {
    productsMock.mockResolvedValue(page([product("leche")], 1));
    const { rerender, result } = renderHook(({ search }) => usePurchasedProducts(search, true), {
      initialProps: { search: "lec" },
    });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY));

    rerender({ search: " lec  " });

    expect(result.current.status).toBe(PRODUCT_LIST_STATUS.READY);
    expect(productsMock).toHaveBeenCalledTimes(1);
  });
});
