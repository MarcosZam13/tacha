import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHELF_LIFE_CHOICE } from "../constants/shelf-life.constants";
import { SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import { saveShelfLifeChoice } from "../services/shelf-life.service";

// Sin Supabase real: from() devuelve una cadena que anota cada paso.
const fromMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ from: fromMock }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  const builder = {
    eq: (...args: unknown[]) => {
      eqMock(...args);
      return builder;
    },
    select: () => builder,
    single: () => singleMock(),
    update: (...args: unknown[]) => {
      updateMock(...args);
      return builder;
    },
  };
  fromMock.mockReturnValue(builder);
  singleMock.mockResolvedValue({ data: { id: "item-leche" }, error: null });
});

describe("saveShelfLifeChoice (SCRUM-103)", () => {
  it("guarda el chip en la fila", async () => {
    await saveShelfLifeChoice("item-leche", SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS);

    expect(fromMock).toHaveBeenCalledWith(SHOPPING_LIST_DB.TABLE.LIST_ITEMS);
    expect(updateMock).toHaveBeenCalledWith({ shelf_life_choice: SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS });
    expect(eqMock).toHaveBeenCalledWith("id", "item-leche");
  });

  it("con null borra el chip", async () => {
    await saveShelfLifeChoice("item-leche", null);

    expect(updateMock).toHaveBeenCalledWith({ shelf_life_choice: null });
  });

  it("falla si la base no devuelve la fila (no se guardó)", async () => {
    const noRowError = { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" };
    singleMock.mockResolvedValue({ data: null, error: noRowError });

    await expect(saveShelfLifeChoice("item-ajeno", SHELF_LIFE_CHOICE.FEW_DAYS)).rejects.toBe(noRowError);
  });
});
