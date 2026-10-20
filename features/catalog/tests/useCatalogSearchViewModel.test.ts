// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductSearch } from "@/hooks/useProductSearch";
import { getCategories, listCatalogByCategory } from "@/services/catalog.service";
import type { CatalogProduct, Category } from "@/types/catalog.types";
import { CATALOG_SEARCH_STATUS } from "../constants/catalog-search.constants";
import { useCatalogSearchViewModel } from "../hooks/useCatalogSearchViewModel";

// Se mockean los dos bordes externos: la búsqueda por texto (ya resuelta por
// useProductSearch, HU-51) y el servicio de catálogo (HU-52). Lo que se
// prueba acá es solo la tabla de decisión de qué RPC/fuente usar.
vi.mock("@/hooks/useProductSearch", () => ({ useProductSearch: vi.fn() }));
vi.mock("@/services/catalog.service", () => ({ getCategories: vi.fn(), listCatalogByCategory: vi.fn() }));

const useProductSearchMock = vi.mocked(useProductSearch);
const getCategoriesMock = vi.mocked(getCategories);
const listCatalogByCategoryMock = vi.mocked(listCatalogByCategory);

const CATEGORIES: Category[] = [
  { id: "category-1", name: "Lácteos" },
  { id: "category-2", name: "Postres" },
];

const createProduct = (category: string, productId: string, productName: string): CatalogProduct => ({
  category,
  productId,
  productName,
  variants: [
    { baseQuantity: 1000, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: `${productId}-variant` },
  ],
});

const LECHE = createProduct("Lácteos", "product-leche", "Leche");
const FLAN = createProduct("Postres", "product-flan", "Flan");

// Estado de useProductSearch sin texto buscable: lo que ve esta pantalla
// antes de escribir nada (idle de HU-51, sin cambios por HU-52).
const EMPTY_SEARCH = {
  clearQuery: vi.fn(),
  errorMessage: null,
  hasNoResults: false,
  isSearching: false,
  query: "",
  results: [] as CatalogProduct[],
  setQuery: vi.fn(),
};

/** Una respuesta que el test decide cuándo llega (igual que useRecipeCoverage.test.ts). */
const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
  getCategoriesMock.mockResolvedValue(CATEGORIES);
  useProductSearchMock.mockReturnValue({ ...EMPTY_SEARCH });
});

describe("useCatalogSearchViewModel", () => {
  it("stays idle with no text and no active category, without listing the catalog (SPEC.md §5 regla 13)", async () => {
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));

    expect(result.current.status).toBe(CATALOG_SEARCH_STATUS.IDLE);
    expect(listCatalogByCategoryMock).not.toHaveBeenCalled();
  });

  it("lists a category's products without any typed term", async () => {
    listCatalogByCategoryMock.mockResolvedValue([LECHE]);
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));

    act(() => result.current.onCategoryChange("category-1"));

    await waitFor(() => expect(result.current.status).toBe(CATALOG_SEARCH_STATUS.READY));
    expect(listCatalogByCategoryMock).toHaveBeenCalledWith("category-1");
    expect(result.current.cards).toHaveLength(1);
  });

  it("shows the empty state (not an error) for a category with no products", async () => {
    listCatalogByCategoryMock.mockResolvedValue([]);
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));

    act(() => result.current.onCategoryChange("category-2"));

    await waitFor(() => expect(result.current.status).toBe(CATALOG_SEARCH_STATUS.EMPTY));
  });

  it("shows an error when listing the category fails", async () => {
    listCatalogByCategoryMock.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));

    act(() => result.current.onCategoryChange("category-1"));

    await waitFor(() => expect(result.current.status).toBe(CATALOG_SEARCH_STATUS.ERROR));
  });

  it("uses the text search results as-is when no category is active (HU-51 unchanged)", async () => {
    useProductSearchMock.mockReturnValue({ ...EMPTY_SEARCH, query: "leche", results: [LECHE, FLAN] });

    const { result } = renderHook(() => useCatalogSearchViewModel());

    await waitFor(() => expect(result.current.cards).toHaveLength(2));
  });

  it("filters the text search results by the active category on the client, without a second request (CA-03)", async () => {
    useProductSearchMock.mockReturnValue({ ...EMPTY_SEARCH, query: "le", results: [LECHE, FLAN] });
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));

    act(() => result.current.onCategoryChange("category-1"));

    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    expect(result.current.cards[0]?.title).toContain("Leche");
    expect(listCatalogByCategoryMock).not.toHaveBeenCalled();
  });

  it("goes back to idle when the category filter is cleared (null) and there is no text", async () => {
    // El toggle de "tocar el mismo chip lo apaga" vive en CatalogCategoryChips
    // (presentación); acá se prueba que el ViewModel sabe volver a idle
    // cuando le llega null, sin importar quién decidió limpiarlo.
    listCatalogByCategoryMock.mockResolvedValue([LECHE]);
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));
    act(() => result.current.onCategoryChange("category-1"));
    await waitFor(() => expect(result.current.status).toBe(CATALOG_SEARCH_STATUS.READY));

    act(() => result.current.onCategoryChange(null));

    await waitFor(() => expect(result.current.status).toBe(CATALOG_SEARCH_STATUS.IDLE));
    expect(result.current.activeCategoryId).toBeNull();
  });

  it("discards a stale category response when the chip changes again before it answers (SPEC.md §5 regla 15)", async () => {
    const dairyResponse = createDeferred<CatalogProduct[]>();
    const dessertsResponse = createDeferred<CatalogProduct[]>();
    listCatalogByCategoryMock.mockImplementation((categoryId) =>
      categoryId === "category-1" ? dairyResponse.promise : dessertsResponse.promise,
    );
    const { result } = renderHook(() => useCatalogSearchViewModel());
    await waitFor(() => expect(result.current.categories).toEqual(CATEGORIES));

    act(() => result.current.onCategoryChange("category-1"));
    act(() => result.current.onCategoryChange("category-2"));

    // La respuesta vieja (Lácteos) llega tarde: no debe pisar el filtro actual (Postres).
    await act(async () => dairyResponse.resolve([LECHE]));
    expect(result.current.cards).toHaveLength(0);

    await act(async () => dessertsResponse.resolve([FLAN]));
    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    expect(result.current.cards[0]?.title).toContain("Flan");
  });
});
