import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_CATEGORY_TEXT, CATALOG_SOURCE } from "@/constants";
import { MY_PRODUCTS_DB } from "../constants/my-products.constants";
import { listMyProducts } from "../services/my-products.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con un
// getSession y un from() que arma su propia cadena encadenable.
const getSessionMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ auth: { getSession: getSessionMock }, from: fromMock }),
}));

// Ids inventados (no son de la base).
const USER_ID = "a1b2c3d4-0000-4000-8000-000000000010";
const HOUSEHOLD_ID = "a1b2c3d4-0000-4000-8000-000000000020";

interface QueryResult {
  data: unknown;
  error: unknown;
}

// eq()/select() se encadenan a sí mismos; maybeSingle()/order() cierran la
// cadena con el resultado simulado, igual que haría el cliente real.
const createQueryBuilder = (result: QueryResult) => {
  const builder = {
    eq: () => builder,
    is: () => builder,
    maybeSingle: () => Promise.resolve(result),
    order: () => Promise.resolve(result),
    select: () => builder,
  };
  return builder;
};

// Igual que createQueryBuilder, pero distingue por cuál columna se filtró
// (HOUSEHOLD_ID u OWNER_ID): HU-56 consulta product_catalog dos veces en
// paralelo (household_id y owner_id), ambas por la misma tabla, y cada una
// necesita su propio resultado simulado.
const createProductCatalogBuilder = (resultByColumn: Record<string, QueryResult>) => {
  let matchedColumn: string | null = null;
  const builder = {
    eq: (column: string) => {
      if (column in resultByColumn) matchedColumn = column;
      return builder;
    },
    is: () => builder,
    order: () =>
      Promise.resolve(matchedColumn ? resultByColumn[matchedColumn] : { data: [], error: null }),
    select: () => builder,
  };
  return builder;
};

const manualProductRow = (id: string, name: string) => ({
  category_id: "category-1",
  id,
  name,
  product_catalog_variants: [
    { base_quantity: 1000, base_unit: "ml", id: `${id}-variant`, image_url: null, product_brands: [] },
  ],
});

const toExpectedProduct = (id: string, name: string) => ({
  category: CATALOG_CATEGORY_TEXT.UNASSIGNED,
  productId: id,
  productName: name,
  variants: [
    { baseQuantity: 1000, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: `${id}-variant` },
  ],
  editable: {
    baseQuantity: 1000,
    baseUnit: "ml",
    brandName: null,
    categoryId: "category-1",
    name,
    productId: id,
  },
});

const mockSession = (): void => {
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: USER_ID } } }, error: null });
};

const mockNoSession = (): void => {
  getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
};

describe("listMyProducts", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    fromMock.mockReset();
  });

  it("resolves to an empty list without querying anything when there is no session", async () => {
    mockNoSession();

    await expect(listMyProducts()).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // HU-56 (SPEC.md §5, §15): ya no se corta a [] sin household — siempre se
  // busca también por owner_id.
  it("queries product_catalog by owner_id even when the user has no household", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: null, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: [manualProductRow("product-1", "Tamal")], error: null },
      });
    });

    await expect(listMyProducts()).resolves.toEqual([toExpectedProduct("product-1", "Tamal")]);
    // household_members + product_catalog por owner_id (sin household no se
    // consulta además por household_id: Promise.resolve([]) sin tocar la base).
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  // Caso 6 de SPEC.md §13: visible solo para el usuario, no por household_id.
  it("resolves to an empty list when the user has no household and no own products", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: null, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: [], error: null },
      });
    });

    await expect(listMyProducts()).resolves.toEqual([]);
  });

  // CA-01 (SCRUM-86): productos manuales del household, mapeados con sus variantes.
  it("maps the household's manual products with their variants", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID]: { data: [manualProductRow("product-1", "Leche")], error: null },
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: [], error: null },
      });
    });

    await expect(listMyProducts()).resolves.toEqual([toExpectedProduct("product-1", "Leche")]);
  });

  // Caso 7/8 de SPEC.md §13: un producto compartido (household_id) y uno sin
  // compartir (owner_id) del mismo usuario se ven juntos, sin duplicarse —
  // nunca tienen ambos campos a la vez (lo decide create_personal_product).
  it("merges household and owner results, sorted alphabetically by product name", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID]: { data: [manualProductRow("product-2", "Leche")], error: null },
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: [manualProductRow("product-1", "Arroz")], error: null },
      });
    });

    await expect(listMyProducts()).resolves.toEqual([
      toExpectedProduct("product-1", "Arroz"),
      toExpectedProduct("product-2", "Leche"),
    ]);
  });

  // Caso 4 de SPEC.md §13: nunca se filtra solo por source, siempre junto con household_id/owner_id.
  it("filters each product_catalog query by source and by its own column", async () => {
    mockSession();
    const householdBuilder = createProductCatalogBuilder({
      [MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID]: { data: [], error: null },
    });
    const ownerBuilder = createProductCatalogBuilder({
      [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: [], error: null },
    });
    const householdEqSpy = vi.spyOn(householdBuilder, "eq");
    const ownerEqSpy = vi.spyOn(ownerBuilder, "eq");
    let productCatalogCallCount = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      productCatalogCallCount += 1;
      return productCatalogCallCount === 1 ? householdBuilder : ownerBuilder;
    });

    await listMyProducts();

    expect(householdEqSpy).toHaveBeenCalledWith(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL);
    expect(ownerEqSpy).toHaveBeenCalledWith(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL);
  });

  // HU-58 (SCRUM-89): un producto eliminado que seguía en uso queda archivado y no se lista.
  it("excludes archived products from both queries", async () => {
    mockSession();
    const builders = [
      createProductCatalogBuilder({ [MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID]: { data: [], error: null } }),
      createProductCatalogBuilder({ [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: [], error: null } }),
    ];
    const isSpies = builders.map((builder) => vi.spyOn(builder, "is"));
    let productCatalogCallCount = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      productCatalogCallCount += 1;
      return builders[productCatalogCallCount - 1];
    });

    await listMyProducts();

    isSpies.forEach((isSpy) => expect(isSpy).toHaveBeenCalledWith(MY_PRODUCTS_DB.COLUMN.ARCHIVED_AT, null));
  });

  // HU-58: la marca y la categoría salen de la fila, para abrir el formulario de edición precargado.
  it("maps the brand and category the edit form needs", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: null, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: {
          data: [
            {
              category_id: "category-9",
              id: "product-1",
              name: "Queso",
              product_catalog_variants: [
                { base_quantity: 250, base_unit: "g", id: "v-1", image_url: null, product_brands: [{ name: "Finca Eva" }] },
              ],
            },
          ],
          error: null,
        },
      });
    });

    const [product] = await listMyProducts();

    expect(product.editable).toEqual({
      baseQuantity: 250,
      baseUnit: "g",
      brandName: "Finca Eva",
      categoryId: "category-9",
      name: "Queso",
      productId: "product-1",
    });
  });

  // HU-58: sin su variante no se inventan datos para el formulario: el producto no se lista.
  it("skips a product without its variant instead of inventing its size", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: null, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: {
          data: [{ category_id: "category-1", id: "product-1", name: "Huérfano", product_catalog_variants: [] }],
          error: null,
        },
      });
    });

    await expect(listMyProducts()).resolves.toEqual([]);
  });

  it("rethrows the Supabase error from the household_members query", async () => {
    mockSession();
    const supabaseError = { code: "500", message: "network error" };
    fromMock.mockImplementation(() => createQueryBuilder({ data: null, error: supabaseError }));

    await expect(listMyProducts()).rejects.toBe(supabaseError);
  });

  it("rethrows the Supabase error from either product_catalog query", async () => {
    mockSession();
    const supabaseError = { code: "500", message: "network error" };
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: null, error: null });
      }
      return createProductCatalogBuilder({
        [MY_PRODUCTS_DB.COLUMN.OWNER_ID]: { data: null, error: supabaseError },
      });
    });

    await expect(listMyProducts()).rejects.toBe(supabaseError);
  });
});
