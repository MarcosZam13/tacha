import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_SOURCE } from "@/constants";
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
    maybeSingle: () => Promise.resolve(result),
    order: () => Promise.resolve(result),
    select: () => builder,
  };
  return builder;
};

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

  it("resolves to an empty list without querying product_catalog when there is no session", async () => {
    mockNoSession();

    await expect(listMyProducts()).resolves.toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // Regla de negocio SPEC.md §5: sin household no hay dónde buscar.
  it("resolves to an empty list without querying product_catalog when the user has no household", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: null, error: null });
      }
      throw new Error(`tabla inesperada: ${table}`);
    });

    await expect(listMyProducts()).resolves.toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  // CA-01: productos manuales del household, mapeados a CatalogProduct con sus variantes.
  it("maps the household's manual products with their variants", async () => {
    mockSession();
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      if (table === MY_PRODUCTS_DB.TABLE.PRODUCT_CATALOG) {
        return createQueryBuilder({
          data: [
            {
              id: "product-1",
              name: "Leche",
              product_catalog_variants: [
                { base_quantity: 1000, base_unit: "ml", id: "variant-1", image_url: null },
              ],
            },
          ],
          error: null,
        });
      }
      throw new Error(`tabla inesperada: ${table}`);
    });

    await expect(listMyProducts()).resolves.toEqual([
      {
        productId: "product-1",
        productName: "Leche",
        variants: [
          { baseQuantity: 1000, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: "variant-1" },
        ],
      },
    ]);
  });

  // Caso 4 de SPEC.md §13: nunca se filtra solo por source, siempre junto con el household_id.
  it("filters product_catalog by both source and the user's household_id", async () => {
    mockSession();
    const productCatalogBuilder = createQueryBuilder({ data: [], error: null });
    const eqSpy = vi.spyOn(productCatalogBuilder, "eq");

    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      return productCatalogBuilder;
    });

    await listMyProducts();

    expect(eqSpy).toHaveBeenCalledWith(MY_PRODUCTS_DB.COLUMN.SOURCE, CATALOG_SOURCE.MANUAL);
    expect(eqSpy).toHaveBeenCalledWith(MY_PRODUCTS_DB.COLUMN.HOUSEHOLD_ID, HOUSEHOLD_ID);
  });

  it("rethrows the Supabase error from the product_catalog query", async () => {
    mockSession();
    const supabaseError = { code: "500", message: "network error" };
    fromMock.mockImplementation((table: string) => {
      if (table === MY_PRODUCTS_DB.TABLE.HOUSEHOLD_MEMBERS) {
        return createQueryBuilder({ data: { household_id: HOUSEHOLD_ID }, error: null });
      }
      return createQueryBuilder({ data: null, error: supabaseError });
    });

    await expect(listMyProducts()).rejects.toBe(supabaseError);
  });

  it("rethrows the Supabase error from the household_members query", async () => {
    mockSession();
    const supabaseError = { code: "500", message: "network error" };
    fromMock.mockImplementation(() => createQueryBuilder({ data: null, error: supabaseError }));

    await expect(listMyProducts()).rejects.toBe(supabaseError);
  });
});
