import { describe, expect, it, vi } from "vitest";
import { getCatalogVariantDetail, getCategories, listCatalogByCategory } from "../catalog.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con un
// rpc() y un from() que arma su propia cadena encadenable (mismo patrón que
// features/my-products/tests/my-products.service.test.ts).
const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

interface QueryResult {
  data: unknown;
  error: unknown;
}

const createCategoriesBuilder = (result: QueryResult) => ({
  select: () => ({ order: () => Promise.resolve(result) }),
});

describe("listCatalogByCategory", () => {
  it("passes the category id as filter_category_id", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await listCatalogByCategory("category-1");

    expect(rpcMock).toHaveBeenCalledWith("list_catalog_by_category", { filter_category_id: "category-1" });
  });

  it('passes undefined (todo el catálogo) when the category is null ("Todas")', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await listCatalogByCategory(null);

    expect(rpcMock).toHaveBeenCalledWith("list_catalog_by_category", { filter_category_id: undefined });
  });

  it("maps each product's category from the RPC row", async () => {
    rpcMock.mockResolvedValue({
      data: [{ category: "Lácteos", name: "Leche", product_catalog_id: "product-1", variants: [] }],
      error: null,
    });

    await expect(listCatalogByCategory(null)).resolves.toEqual([
      { category: "Lácteos", productId: "product-1", productName: "Leche", variants: [] },
    ]);
  });

  it("throws when the RPC fails", async () => {
    const error = new Error("boom");
    rpcMock.mockResolvedValue({ data: null, error });

    await expect(listCatalogByCategory(null)).rejects.toThrow("boom");
  });
});

describe("getCategories", () => {
  it("reads categories ordered by name, without an RPC", async () => {
    fromMock.mockReturnValue(
      createCategoriesBuilder({ data: [{ id: "category-1", name: "Lácteos" }], error: null }),
    );

    await expect(getCategories()).resolves.toEqual([{ id: "category-1", name: "Lácteos" }]);
    expect(fromMock).toHaveBeenCalledWith("categories");
  });

  it("throws when the query fails", async () => {
    const error = new Error("boom");
    fromMock.mockReturnValue(createCategoriesBuilder({ data: null, error }));

    await expect(getCategories()).rejects.toThrow("boom");
  });
});

const createVariantDetailBuilder = (result: QueryResult) => ({
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
});

// Fila de product_catalog_variants tal como la devuelve VARIANT_DETAIL_SELECT.
const createVariantRow = (overrides: Record<string, unknown>) => ({
  base_quantity: 500,
  base_unit: "g",
  image_url: null,
  latest_prices: [],
  product_brands: [],
  product_catalog: { name: "Queso Turrialba" },
  reference_price: null,
  reference_store_name: null,
  stores: null,
  ...overrides,
});

// HU-57 (SCRUM-88): la tienda de referencia es un supermercado (por su
// relación con stores) o una escrita a mano, nunca las dos (check de 051).
describe("getCatalogVariantDetail: tienda y precio de referencia", () => {
  it("uses the supermarket's display name when the store is one of the three", async () => {
    fromMock.mockReturnValue(
      createVariantDetailBuilder({
        data: createVariantRow({ reference_price: 2850, stores: { display_name: "MaxiPali" } }),
        error: null,
      }),
    );

    const detail = await getCatalogVariantDetail("variant-1");

    expect(detail?.referencePrice).toBe(2850);
    expect(detail?.referenceStoreName).toBe("MaxiPali");
  });

  it("uses the typed store name when the store is a custom one", async () => {
    fromMock.mockReturnValue(
      createVariantDetailBuilder({
        data: createVariantRow({ reference_price: 3200, reference_store_name: "Carnicería Los Ángeles" }),
        error: null,
      }),
    );

    const detail = await getCatalogVariantDetail("variant-1");

    expect(detail?.referenceStoreName).toBe("Carnicería Los Ángeles");
  });

  it("keeps the reference price out of the per-store prices (CA-03)", async () => {
    fromMock.mockReturnValue(
      createVariantDetailBuilder({
        data: createVariantRow({ reference_price: 2850, stores: { display_name: "MaxiPali" } }),
        error: null,
      }),
    );

    const detail = await getCatalogVariantDetail("variant-1");

    expect(detail?.storePriceRanges).toEqual([]);
  });
});
