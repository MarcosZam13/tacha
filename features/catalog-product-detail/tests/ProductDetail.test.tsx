// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REFERENCE_PRICE_TEXT } from "@/constants";
import { PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";
import { getCatalogVariantDetail } from "@/services/catalog.service";
import { addVariantToGeneralList, changeListItemQuantity } from "@/services/list-items.service";
import { hasHousehold } from "@/services/personal-product.service";
import type { CatalogVariantDetail } from "@/types/catalog.types";
import { ProductDetail } from "../ProductDetail";
import { formatPriceRange } from "@/utils/formatPriceRange";
import { createProductDetailPage } from "./ProductDetail.page";

vi.mock("@/services/catalog.service", () => ({
  getCatalogVariantDetail: vi.fn(),
}));
vi.mock("@/services/list-items.service", () => ({
  addVariantToGeneralList: vi.fn(),
  changeListItemQuantity: vi.fn(),
}));

vi.mock("@/services/personal-product.service", () => ({ hasHousehold: vi.fn() }));
const hasHouseholdMock = vi.mocked(hasHousehold);
const getCatalogVariantDetailMock = vi.mocked(getCatalogVariantDetail);
const addVariantToGeneralListMock = vi.mocked(addVariantToGeneralList);
const changeListItemQuantityMock = vi.mocked(changeListItemQuantity);

afterEach(cleanup);

const VARIANT_ID = "variant-leche";

const createDetail = (overrides: Partial<CatalogVariantDetail> = {}): CatalogVariantDetail => ({
  brands: [{ logoUrl: null, name: "Dos Pinos" }],
  imageUrl: null,
  isPersonal: false,
  productName: "Leche",
  referencePrice: null,
  referenceStoreName: null,
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
  // HU-57 (SCRUM-88) CA-02: precio de referencia de un producto personalizado,
  // con el aviso visible y separado de los precios por supermercado (CA-03).
  it("shows the user's reference price and store with its notice", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(
      createDetail({ referencePrice: 3200, referenceStoreName: "Carnicería Los Ángeles", storePriceRanges: [] }),
    );
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    expect(await page.findReferencePriceHeading()).toBeInTheDocument();
    expect(page.queryText("Carnicería Los Ángeles")).toBeInTheDocument();
    expect(page.queryPrice(formatPriceRange({ maxPrice: 3200, minPrice: 3200 }))).toBeInTheDocument();
    expect(page.queryText(REFERENCE_PRICE_TEXT.INFO)).toBeInTheDocument();
  });

  it("does not show a reference price section for a catalog product", async () => {
    getCatalogVariantDetailMock.mockResolvedValue(createDetail());
    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    expect(await page.findHeading("Leche")).toBeInTheDocument();
    expect(page.queryReferencePriceHeading()).not.toBeInTheDocument();
  });

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

  // SCRUM-163: en vez de "Agregar a mi lista", el aviso de por qué no se puede.
  it("explains why a personal product cannot go to the household list", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    getCatalogVariantDetailMock.mockResolvedValue(createDetail({ isPersonal: true }));

    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    expect(await page.findAddToListBlockedNote()).toHaveTextContent(PRODUCT_DETAIL_TEXT.PERSONAL_IN_HOUSEHOLD_LIST);
    expect(page.queryAddToListButton()).not.toBeInTheDocument();
  });

  // Un toque mientras se consulta la familia metería el producto en su lista.
  it("does not offer adding a personal product until the household check answers", async () => {
    hasHouseholdMock.mockReturnValue(new Promise(() => {}));
    getCatalogVariantDetailMock.mockResolvedValue(createDetail({ isPersonal: true }));

    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();
    await page.findHeading("Leche");

    expect(page.queryAddToListButton()).not.toBeInTheDocument();
  });

  it("lets a user without a household add a personal product", async () => {
    hasHouseholdMock.mockResolvedValue(false);
    getCatalogVariantDetailMock.mockResolvedValue(createDetail({ isPersonal: true }));
    addVariantToGeneralListMock.mockResolvedValue({
      checkedAt: null,
      id: "item-1",
      purchaseSessionId: null,
      quantity: 1,
      quantityBought: null,
      variantId: VARIANT_ID,
    });

    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();
    await waitFor(() => expect(page.queryAddToListButton()).toBeInTheDocument());
    await page.clickAddToList();

    await waitFor(() => expect(addVariantToGeneralListMock).toHaveBeenCalledWith(VARIANT_ID));
  });

  // Decisión: si no se puede saber, no se bloquea (la lista ya tolera la fila).
  it("still offers adding when the household check fails", async () => {
    hasHouseholdMock.mockRejectedValue(new Error("down"));
    getCatalogVariantDetailMock.mockResolvedValue(createDetail({ isPersonal: true }));

    render(<ProductDetail variantId={VARIANT_ID} />);
    const page = createProductDetailPage();

    await waitFor(() => expect(page.queryAddToListButton()).toBeInTheDocument());
  });
});
