// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { SHELF_LIFE_CHOICE, SHELF_LIFE_TEXT } from "../constants/shelf-life.constants";
import { useShelfLifeChips } from "../hooks/useShelfLifeChips";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { saveShelfLifeChoice } from "../services/shelf-life.service";

vi.mock("../services/shelf-life.service", () => ({ saveShelfLifeChoice: vi.fn() }));
const saveShelfLifeChoiceMock = vi.mocked(saveShelfLifeChoice);

const SESSION_ID = "session-maxipali";

const createItem = (id: string, checkedAt: NullableRef<string>): ShoppingListItem => ({
  checkedAt,
  id,
  productName: "Leche",
  purchaseSessionId: checkedAt ? SESSION_ID : null,
  quantity: 1,
  quantityBought: checkedAt ? 1 : null,
  recipeShortfalls: [],
  shortfallSnapshot: null,
  sizeLabel: "1000 ml",
  variantId: `variant-${id}`,
});

const CHECKED_MILK = createItem("item-leche", "2026-11-25T15:00:00Z");
const CHECKED_RICE = createItem("item-arroz", "2026-11-25T15:01:00Z");

beforeEach(() => {
  vi.resetAllMocks();
  saveShelfLifeChoiceMock.mockResolvedValue(undefined);
});

const renderChips = (activeSessionId: NullableRef<string>, items: ShoppingListItem[]) =>
  renderHook((props) => useShelfLifeChips(props), { initialProps: { activeSessionId, items } });

describe("useShelfLifeChips (SCRUM-103)", () => {
  it("no muestra chips hasta tachar algo", () => {
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK]);

    expect(result.current.chips.itemId).toBeNull();
  });

  it("muestra los chips en la fila recién tachada, sin nada elegido", () => {
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK]);

    act(() => result.current.openFor(CHECKED_MILK.id));

    expect(result.current.chips.itemId).toBe(CHECKED_MILK.id);
    expect(result.current.chips.selectedChoice).toBeNull();
  });

  it("tachar otra fila mueve los chips a esa", () => {
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK, CHECKED_RICE]);

    act(() => result.current.openFor(CHECKED_MILK.id));
    act(() => result.current.openFor(CHECKED_RICE.id));

    expect(result.current.chips.itemId).toBe(CHECKED_RICE.id);
  });

  it("fuera de modo compra no hay chips (CA-01)", () => {
    const { result } = renderChips(null, [CHECKED_MILK]);

    act(() => result.current.openFor(CHECKED_MILK.id));

    expect(result.current.chips.itemId).toBeNull();
  });

  it("si la fila se destacha, los chips desaparecen", () => {
    const { rerender, result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));

    rerender({ activeSessionId: SESSION_ID, items: [createItem(CHECKED_MILK.id, null)] });

    expect(result.current.chips.itemId).toBeNull();
  });

  it("si se cierra la compra, los chips desaparecen", () => {
    const { rerender, result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));

    rerender({ activeSessionId: null, items: [CHECKED_MILK] });

    expect(result.current.chips.itemId).toBeNull();
  });

  it("elegir un chip lo marca y lo guarda en esa fila", async () => {
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));

    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS));

    expect(result.current.chips.selectedChoice).toBe(SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS);
    expect(saveShelfLifeChoiceMock).toHaveBeenCalledExactlyOnceWith(
      CHECKED_MILK.id,
      SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS,
    );
    await waitFor(() => expect(result.current.chips.isSaving).toBe(false));
  });

  it("tocar el chip elegido lo quita", async () => {
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));
    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.FEW_DAYS));
    await waitFor(() => expect(result.current.chips.isSaving).toBe(false));

    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.FEW_DAYS));

    expect(result.current.chips.selectedChoice).toBeNull();
    expect(saveShelfLifeChoiceMock).toHaveBeenLastCalledWith(CHECKED_MILK.id, null);
    await waitFor(() => expect(result.current.chips.isSaving).toBe(false));
  });

  it("si no se pudo guardar, vuelve a lo de antes y muestra el error", async () => {
    saveShelfLifeChoiceMock.mockRejectedValue(new Error("network"));
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));

    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.NO_EXPIRY));

    await waitFor(() => expect(result.current.chips.errorMessage).toBe(SHELF_LIFE_TEXT.SAVE_ERROR));
    expect(result.current.chips.selectedChoice).toBeNull();
    expect(result.current.chips.isSaving).toBe(false);
  });

  it("mientras guarda, otro toque no sale a la base", async () => {
    let resolveSave: () => void = () => {};
    saveShelfLifeChoiceMock.mockReturnValue(new Promise<void>((resolve) => (resolveSave = resolve)));
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));

    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.FEW_DAYS));
    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.NO_EXPIRY));

    expect(saveShelfLifeChoiceMock).toHaveBeenCalledTimes(1);
    await act(async () => resolveSave());
  });
});

describe("useShelfLifeChips: una fila no afecta a otra (SCRUM-103)", () => {
  it("al volver a tachar una fila destachada, los chips arrancan sin nada elegido", async () => {
    const { rerender, result } = renderChips(SESSION_ID, [CHECKED_MILK]);
    act(() => result.current.openFor(CHECKED_MILK.id));
    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS));
    await waitFor(() => expect(result.current.chips.isSaving).toBe(false));

    // Destachar (la base borra el chip, 063) y volver a tachar.
    rerender({ activeSessionId: SESSION_ID, items: [createItem(CHECKED_MILK.id, null)] });
    rerender({ activeSessionId: SESSION_ID, items: [CHECKED_MILK] });
    act(() => result.current.openFor(CHECKED_MILK.id));

    expect(result.current.chips.selectedChoice).toBeNull();
  });

  it("el error de una fila no aparece debajo de otra", async () => {
    let rejectSave: () => void = () => {};
    saveShelfLifeChoiceMock.mockReturnValue(new Promise<void>((_, reject) => (rejectSave = () => reject(new Error("x")))));
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK, CHECKED_RICE]);
    act(() => result.current.openFor(CHECKED_MILK.id));
    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.FEW_DAYS));

    act(() => result.current.openFor(CHECKED_RICE.id));
    await act(async () => rejectSave());

    expect(result.current.chips.itemId).toBe(CHECKED_RICE.id);
    expect(result.current.chips.errorMessage).toBeNull();
  });

  it("mientras una fila guarda, los chips de otra se pueden tocar", async () => {
    let resolveSave: () => void = () => {};
    saveShelfLifeChoiceMock.mockReturnValueOnce(new Promise<void>((resolve) => (resolveSave = resolve)));
    const { result } = renderChips(SESSION_ID, [CHECKED_MILK, CHECKED_RICE]);
    act(() => result.current.openFor(CHECKED_MILK.id));
    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.FEW_DAYS));

    act(() => result.current.openFor(CHECKED_RICE.id));

    expect(result.current.chips.isSaving).toBe(false);
    act(() => result.current.chips.onChoose(SHELF_LIFE_CHOICE.NO_EXPIRY));
    expect(saveShelfLifeChoiceMock).toHaveBeenLastCalledWith(CHECKED_RICE.id, SHELF_LIFE_CHOICE.NO_EXPIRY);
    await act(async () => resolveSave());
  });
});
