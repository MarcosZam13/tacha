// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCatalogVariantDetail } from "@/services/catalog.service";
import { addVariantToGeneralList, changeListItemQuantity } from "@/services/list-items.service";
import type { CatalogVariantDetail } from "@/types/catalog.types";
import { PRODUCT_DETAIL_STATUS } from "../constants/catalog-product-detail.constants";
import { useProductDetailViewModel } from "../hooks/useProductDetailViewModel";

vi.mock("@/services/catalog.service", () => ({
  getCatalogVariantDetail: vi.fn(),
}));
vi.mock("@/services/list-items.service", () => ({
  addVariantToGeneralList: vi.fn(),
  changeListItemQuantity: vi.fn(),
}));

const getCatalogVariantDetailMock = vi.mocked(getCatalogVariantDetail);
const addVariantToGeneralListMock = vi.mocked(addVariantToGeneralList);
const changeListItemQuantityMock = vi.mocked(changeListItemQuantity);

const VARIANT_ID = "variant-leche";

const DETAIL: CatalogVariantDetail = {
  brands: [{ logoUrl: null, name: "Dos Pinos" }],
  imageUrl: "https://example.com/leche.jpg",
  productName: "Leche",
  sizeLabel: "1000 ml",
  storePriceRanges: [
    { maxPrice: 900, minPrice: 800, storeName: "MaxiPali", storeSlug: "maxipali" },
  ],
  variantId: VARIANT_ID,
};

const renderReadyViewModel = async () => {
  getCatalogVariantDetailMock.mockResolvedValue(DETAIL);
  const hook = renderHook(() => useProductDetailViewModel(VARIANT_ID));
  await waitFor(() => expect(hook.result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
  return hook;
};

describe("useProductDetailViewModel", () => {
  it("starts loading and shows the fetched detail once it resolves", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(DETAIL);

    const { result } = renderHook(() => useProductDetailViewModel(VARIANT_ID));
    expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.LOADING);

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
    expect(result.current.productName).toBe(DETAIL.productName);
    expect(result.current.storePriceRows).toHaveLength(1);
    expect(result.current.storePriceRows[0]).toMatchObject({ storeName: "MaxiPali", storeSlug: "maxipali" });
    expect(result.current.storePriceRows[0].priceLabel).toContain("800");
  });

  it("shows a not-found error without data when the variant doesn't exist", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(null);

    const { result } = renderHook(() => useProductDetailViewModel(VARIANT_ID));

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.ERROR));
    expect(result.current.isNotFound).toBe(true);
  });

  it("shows a generic load error and retries the fetch on demand", async () => {
    getCatalogVariantDetailMock.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useProductDetailViewModel(VARIANT_ID));
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.ERROR));
    expect(result.current.isNotFound).toBe(false);

    getCatalogVariantDetailMock.mockResolvedValue(DETAIL);
    act(() => {
      result.current.onRetry();
    });

    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));
  });

  it("never lets the quantity go below the minimum", async () => {
    const { result } = await renderReadyViewModel();

    act(() => {
      result.current.onDecreaseQuantity();
    });

    expect(result.current.quantity).toBe(1);
    expect(result.current.canDecreaseQuantity).toBe(false);
  });

  it("adds the item once and steps the quantity up sequentially", async () => {
    const { result } = await renderReadyViewModel();
    addVariantToGeneralListMock.mockResolvedValue({
      checkedAt: null,
      id: "item-1",
      purchaseSessionId: null,
      quantity: 1,
      quantityBought: null,
      variantId: VARIANT_ID,
    });
    changeListItemQuantityMock.mockResolvedValue(3);

    act(() => {
      result.current.onIncreaseQuantity();
      result.current.onIncreaseQuantity();
    });
    expect(result.current.quantity).toBe(3);

    act(() => {
      result.current.onAddToList();
    });
    await waitFor(() => expect(result.current.status).toBe(PRODUCT_DETAIL_STATUS.READY));

    expect(addVariantToGeneralListMock).toHaveBeenCalledWith(VARIANT_ID);
    expect(changeListItemQuantityMock).toHaveBeenCalledTimes(2);
    expect(result.current.wasJustAdded).toBe(true);
    expect(result.current.addErrorMessage).toBeNull();
  });

  it("reports how much was added when a step fails partway", async () => {
    const { result } = await renderReadyViewModel();
    addVariantToGeneralListMock.mockResolvedValue({
      checkedAt: null,
      id: "item-1",
      purchaseSessionId: null,
      quantity: 1,
      quantityBought: null,
      variantId: VARIANT_ID,
    });
    changeListItemQuantityMock.mockRejectedValueOnce(new Error("conflict"));

    act(() => {
      result.current.onIncreaseQuantity();
      result.current.onIncreaseQuantity();
    });
    expect(result.current.quantity).toBe(3);

    act(() => {
      result.current.onAddToList();
    });
    await waitFor(() => expect(result.current.addErrorMessage).not.toBeNull());

    expect(result.current.wasJustAdded).toBe(false);
    expect(result.current.addErrorMessage).toContain("1");
  });
});
