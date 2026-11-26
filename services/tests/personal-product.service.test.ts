import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSONAL_PRODUCT_DB, PERSONAL_PRODUCT_DELETE_RESULT } from "@/constants/create-product-form.constants";
import { STORE_NAMES } from "@/constants/stores.constants";
import {
  createPersonalProduct,
  deletePersonalProduct,
  getPersonalProductUsage,
  hasHousehold,
  updatePersonalProduct,
} from "../personal-product.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con un
// getSession, un from() (hasHousehold) y un rpc() (createPersonalProduct);
// ensureSession se mockea aparte (mismo patrón que services/list-items.service.ts).
// vi.mock se ejecuta antes que los imports: los mocks se crean con vi.hoisted
// para que ya existan cuando corre.
const { ensureSessionMock, getSessionMock, fromMock, rpcMock } = vi.hoisted(() => ({
  ensureSessionMock: vi.fn(),
  getSessionMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/services/supabase.client", () => ({
  ensureSession: ensureSessionMock,
  getSupabaseClient: () => ({ auth: { getSession: getSessionMock }, from: fromMock, rpc: rpcMock }),
}));

const USER_ID = "a1b2c3d4-0000-4000-8000-000000000030";

interface QueryResult {
  data: unknown;
  error: unknown;
}

const createQueryBuilder = (result: QueryResult) => {
  const builder = {
    eq: () => builder,
    maybeSingle: () => Promise.resolve(result),
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

describe("createPersonalProduct", () => {
  beforeEach(() => {
    ensureSessionMock.mockReset();
    rpcMock.mockReset();
    ensureSessionMock.mockResolvedValue({ user: { id: USER_ID } });
  });

  it("ensures a session before calling the RPC (an anonymous user can also create one, caso 2 del test SQL)", async () => {
    rpcMock.mockResolvedValue({ data: "product-1", error: null });

    await createPersonalProduct({
      baseQuantity: 1000,
      baseUnit: "ml",
      categoryId: "category-1",
      name: "Leche",
      shareWithHousehold: false,
    });

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
  });

  it("calls create_personal_product with the payload mapped to snake_case", async () => {
    rpcMock.mockResolvedValue({ data: "product-1", error: null });

    await createPersonalProduct({
      baseQuantity: 1000,
      baseUnit: "ml",
      brandName: "Dos Pinos",
      categoryId: "category-1",
      name: "Leche",
      shareWithHousehold: true,
    });

    expect(rpcMock).toHaveBeenCalledWith(PERSONAL_PRODUCT_DB.RPC.CREATE_PERSONAL_PRODUCT, {
      base_quantity: 1000,
      base_unit: "ml",
      brand_name: "Dos Pinos",
      category_id: "category-1",
      product_name: "Leche",
      share_with_household: true,
    });
  });

  // HU-57 (SCRUM-88): tienda y precio de referencia viajan como parámetros propios del RPC.
  it("passes the reference price and store to the RPC", async () => {
    rpcMock.mockResolvedValue({ data: "product-1", error: null });

    await createPersonalProduct({
      baseQuantity: 500,
      baseUnit: "g",
      categoryId: "category-1",
      name: "Queso Turrialba",
      referencePrice: 2850,
      referenceStoreSlug: "maxipali",
      shareWithHousehold: false,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      PERSONAL_PRODUCT_DB.RPC.CREATE_PERSONAL_PRODUCT,
      expect.objectContaining({
        reference_price: 2850,
        reference_store_name: undefined,
        reference_store_slug: "maxipali",
      }),
    );
  });

  it("passes brand_name as undefined when there is no brand", async () => {
    rpcMock.mockResolvedValue({ data: "product-1", error: null });

    await createPersonalProduct({
      baseQuantity: 1,
      baseUnit: "unidad",
      categoryId: "category-1",
      name: "Tamal navideño",
      shareWithHousehold: false,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      PERSONAL_PRODUCT_DB.RPC.CREATE_PERSONAL_PRODUCT,
      expect.objectContaining({ brand_name: undefined }),
    );
  });

  it("resolves to the id the RPC returns", async () => {
    rpcMock.mockResolvedValue({ data: "product-42", error: null });

    await expect(
      createPersonalProduct({
        baseQuantity: 1,
        baseUnit: "unidad",
        categoryId: "category-1",
        name: "Tamal",
        shareWithHousehold: false,
      }),
    ).resolves.toBe("product-42");
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "22023", message: "category_id no existe" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(
      createPersonalProduct({
        baseQuantity: 1,
        baseUnit: "unidad",
        categoryId: "category-inexistente",
        name: "Tamal",
        shareWithHousehold: false,
      }),
    ).rejects.toBe(supabaseError);
  });
});

describe("hasHousehold", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    fromMock.mockReset();
  });

  it("resolves to false without querying household_members when there is no session", async () => {
    mockNoSession();

    await expect(hasHousehold()).resolves.toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("resolves to false when the user has no membership row", async () => {
    mockSession();
    fromMock.mockReturnValue(createQueryBuilder({ data: null, error: null }));

    await expect(hasHousehold()).resolves.toBe(false);
  });

  it("resolves to true when the user belongs to a household", async () => {
    mockSession();
    fromMock.mockReturnValue(createQueryBuilder({ data: { user_id: USER_ID }, error: null }));

    await expect(hasHousehold()).resolves.toBe(true);
  });

  it("queries household_members filtered by the current user's id", async () => {
    mockSession();
    const builder = createQueryBuilder({ data: null, error: null });
    const eqSpy = vi.spyOn(builder, "eq");
    fromMock.mockReturnValue(builder);

    await hasHousehold();

    expect(fromMock).toHaveBeenCalledWith(PERSONAL_PRODUCT_DB.TABLE.HOUSEHOLD_MEMBERS);
    expect(eqSpy).toHaveBeenCalledWith(PERSONAL_PRODUCT_DB.COLUMN.USER_ID, USER_ID);
  });

  it("rethrows the Supabase error", async () => {
    mockSession();
    const supabaseError = { code: "500", message: "network error" };
    fromMock.mockReturnValue(createQueryBuilder({ data: null, error: supabaseError }));

    await expect(hasHousehold()).rejects.toBe(supabaseError);
  });
});

// HU-58 (SCRUM-89): editar, eliminar y consultar el uso, todo por RPC (migración 052).
describe("updatePersonalProduct / deletePersonalProduct / getPersonalProductUsage", () => {
  beforeEach(() => {
    ensureSessionMock.mockReset();
    rpcMock.mockReset();
    ensureSessionMock.mockResolvedValue({ user: { id: USER_ID } });
  });

  it("calls update_personal_product with the payload mapped to its parameter names", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await updatePersonalProduct({
      baseQuantity: 500,
      baseUnit: "g",
      brandName: "Finca Eva",
      categoryId: "category-1",
      name: "Queso Turrialba",
      productId: "product-7",
    });

    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(PERSONAL_PRODUCT_DB.RPC.UPDATE_PERSONAL_PRODUCT, {
      new_base_quantity: 500,
      new_base_unit: "g",
      new_brand_name: "Finca Eva",
      new_category_id: "category-1",
      new_product_name: "Queso Turrialba",
      target_product_id: "product-7",
    });
  });

  // HU-57 en edición (055): la tienda y el precio viajan igual que al crear.
  it("sends the reference store and price to update_personal_product", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await updatePersonalProduct({
      baseQuantity: 500,
      baseUnit: "g",
      categoryId: "category-1",
      name: "Queso Turrialba",
      productId: "product-7",
      referencePrice: 2850.5,
      referenceStoreSlug: STORE_NAMES.MAXIPALI,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      PERSONAL_PRODUCT_DB.RPC.UPDATE_PERSONAL_PRODUCT,
      expect.objectContaining({
        new_reference_price: 2850.5,
        new_reference_store_name: undefined,
        new_reference_store_slug: STORE_NAMES.MAXIPALI,
      }),
    );
  });

  it("rethrows the Supabase error when the update fails", async () => {
    const supabaseError = { code: "42501", message: "No encontramos ese producto" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(
      updatePersonalProduct({
        baseQuantity: 1,
        baseUnit: "unidad",
        categoryId: "category-1",
        name: "X",
        productId: "product-7",
      }),
    ).rejects.toBe(supabaseError);
  });

  it("returns what delete_personal_product decided (deleted or archived)", async () => {
    rpcMock.mockResolvedValue({ data: PERSONAL_PRODUCT_DELETE_RESULT.ARCHIVED, error: null });

    await expect(deletePersonalProduct("product-7")).resolves.toBe(PERSONAL_PRODUCT_DELETE_RESULT.ARCHIVED);
    expect(rpcMock).toHaveBeenCalledWith(PERSONAL_PRODUCT_DB.RPC.DELETE_PERSONAL_PRODUCT, {
      target_product_id: "product-7",
    });
  });

  it("fails instead of reporting zero uses when the RPC returns no row", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await expect(getPersonalProductUsage("product-7")).rejects.toThrow(
      "get_personal_product_usage no devolvió ninguna fila",
    );
  });

  it("maps the usage row to camelCase", async () => {
    rpcMock.mockResolvedValue({ data: [{ active_list_count: 2, group_count: 3, recipe_count: 1 }], error: null });

    await expect(getPersonalProductUsage("product-7")).resolves.toEqual({
      activeListCount: 2,
      groupCount: 3,
      recipeCount: 1,
    });
    expect(rpcMock).toHaveBeenCalledWith(PERSONAL_PRODUCT_DB.RPC.GET_PERSONAL_PRODUCT_USAGE, {
      target_product_id: "product-7",
    });
  });
});

