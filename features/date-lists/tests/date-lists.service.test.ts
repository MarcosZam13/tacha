import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDateListDetail } from "../services/date-lists.service";

// Sin Supabase real: un cliente falso. Cada método de la consulta devuelve la
// misma consulta (como el builder de supabase-js) y maybeSingle la resuelve.
const maybeSingleMock = vi.fn();
const query = {
  eq: vi.fn(),
  maybeSingle: maybeSingleMock,
  order: vi.fn(),
  select: vi.fn(),
};

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => Promise.resolve({ user: { id: "user-ana" } }),
  getSupabaseClient: () => ({ from: () => query }),
}));

// Ids inventados (no son de la base).
const VISIBLE_ROW = {
  checked_at: null,
  created_at: "2026-11-25T10:00:00Z",
  id: "item-1",
  product_catalog_variant_id: "variant-1",
  product_catalog_variants: { base_quantity: 1000, base_unit: "g", id: "variant-1", product_catalog: { name: "Arroz" } },
  quantity_requested: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  for (const method of [query.eq, query.order, query.select]) {
    method.mockReturnValue(query);
  }
});

describe("getDateListDetail", () => {
  // SCRUM-163: un producto personal de otro miembro llega sin presentación (RLS
  // de la 032). La sublista no se cae: esa fila sale "no disponible".
  it("keeps loading when a row arrives without its product (SCRUM-163)", async () => {
    const hiddenRow = { ...VISIBLE_ROW, id: "item-2", product_catalog_variant_id: "variant-hidden", product_catalog_variants: null };
    maybeSingleMock.mockResolvedValue({
      data: { event_date: "2026-12-01", id: "list-1", list_items: [VISIBLE_ROW, hiddenRow], name: "Cena", status: "active" },
      error: null,
    });

    const detail = await getDateListDetail("list-1");

    expect(detail?.items).toHaveLength(2);
    expect(detail?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "item-1", productName: "Arroz", sizeLabel: "1000 g", variantId: "variant-1" }),
        expect.objectContaining({ id: "item-2", productName: "Producto no disponible", sizeLabel: "", variantId: "variant-hidden" }),
      ]),
    );
  });
});
