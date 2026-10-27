// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCatalogVariantDetail } from "@/services/catalog.service";
import { addVariantToGeneralList, changeListItemQuantity } from "@/services/list-items.service";
import type { CatalogVariantDetail } from "@/types/catalog.types";
import { ProductDetail } from "../ProductDetail";
import { createProductDetailPage } from "./ProductDetail.page";

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

afterEach(cleanup);

const VARIANT_ID = "variant-leche";

const createDetail = (overrides: Partial<CatalogVariantDetail> = {}): CatalogVariantDetail => ({
  brands: [{ logoUrl: null, name: "Dos Pinos" }],
  imageUrl: null,
  productName: "Leche",
  sizeLabel: "1000 ml",
  storePriceRanges: [{ maxPrice: 900, minPrice: 800, storeName: "MaxiPali", storeSlug: "maxipali" }],
  variantId: VARIANT_ID,
  ...overrides,
});

describe("ProductDetail", () => {
  // CA-01: foto grande, nombre y tamaño.
  it("shows the product name and size once it loads (CA-01)", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail());
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    expect(await waitFor(() => page.getHeading("Leche"))).toBeInTheDocument();
  });

  // CA-02: marcas disponibles, solo informativo.
  it("lists the available brands (CA-02)", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(
      createDetail({ brands: [{ logoUrl: null, name: "Dos Pinos" }, { logoUrl: null, name: "La Finca" }] }),
    );
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => page.getHeading("Leche"));
    expect(page.getBrandNames()).toEqual(["Dos Pinos", "La Finca"]);
  });

  it("shows a notice instead of an empty list when the variant has no brands", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail({ brands: [] }));
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => page.getHeading("Leche"));
    expect(page.queryNoBrandsMessage()).toBeInTheDocument();
  });

  // CA-03: precio aproximado por supermercado, como rango.
  it("shows the price range per store (CA-03)", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail());
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => page.getHeading("Leche"));
    const [row] = page.getStoreRows();
    expect(row).toContain("MaxiPali");
  });

  it("shows a notice instead of an empty list when the variant has no prices anywhere", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail({ storePriceRanges: [] }));
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => page.getHeading("Leche"));
    expect(page.queryNoPricesMessage()).toBeInTheDocument();
  });

  // "producto no encontrado": sin opción de reintentar.
  it("shows a not-found message without a retry button when the variant doesn't exist", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(null);
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => expect(page.getErrorMessage()).toBeInTheDocument());
    expect(page.queryRetryButton()).not.toBeInTheDocument();
  });

  it("offers to retry a failed load and recovers", async () => {
    getCatalogVariantDetailMock.mockRejectedValueOnce(new Error("network down"));
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => expect(page.queryRetryButton()).toBeInTheDocument());

    getCatalogVariantDetailMock.mockResolvedValue(createDetail());
    await page.clickRetry();

    await waitFor(() => page.getHeading("Leche"));
  });

  // CA-04: botón "Agregar a mi lista" con selector de cantidad.
  it("adds the chosen quantity to the list and confirms (CA-04)", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail());
    addVariantToGeneralListMock.mockResolvedValue({
      checkedAt: null,
      id: "item-1",
      purchaseSessionId: null,
      quantity: 1,
      quantityBought: null,
      variantId: VARIANT_ID,
    });
    changeListItemQuantityMock.mockResolvedValue(2);

    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();
    await waitFor(() => page.getHeading("Leche"));

    await page.clickIncreaseQuantity();
    expect(page.getQuantityValue()).toBe("2");

    await page.clickAddToList();

    await waitFor(() => expect(page.queryAddedConfirmation()).toBeInTheDocument());
    expect(addVariantToGeneralListMock).toHaveBeenCalledWith(VARIANT_ID);
    expect(changeListItemQuantityMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error and keeps the chosen quantity when adding fails", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail());
    addVariantToGeneralListMock.mockRejectedValue(new Error("down"));

    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();
    await waitFor(() => page.getHeading("Leche"));

    await page.clickIncreaseQuantity();
    await page.clickAddToList();

    await waitFor(() => expect(page.getAddErrorMessage()).toBeInTheDocument());
    expect(page.getQuantityValue()).toBe("2");
  });
});
