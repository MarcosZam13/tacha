import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSONAL_PRODUCT_DB } from "@/constants/create-product-form.constants";
import { createPersonalProduct, hasHousehold } from "../personal-product.service";

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
