import { describe, expect, it, vi } from "vitest";
import { getCategories, listCatalogByCategory } from "../catalog.service";

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
