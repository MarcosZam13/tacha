// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ITEM_QUANTITY, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import { useShoppingList } from "../hooks/useShoppingList";
import type { ItemCheck } from "../models/ItemCheck.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import {
  changeItemBoughtQuantity,
  checkItemInSession,
  getGeneralList,
  setItemChecked,
} from "../services/shopping-list.service";

vi.mock("../services/shopping-list.service", () => ({
  addItemToGeneralList: vi.fn(),
  changeItemBoughtQuantity: vi.fn(),
  changeItemQuantity: vi.fn(),
  checkItemInSession: vi.fn(),
  deleteListItem: vi.fn(),
  getGeneralList: vi.fn(),
  setItemChecked: vi.fn(),
}));
const changeItemBoughtQuantityMock = vi.mocked(changeItemBoughtQuantity);
const checkItemInSessionMock = vi.mocked(checkItemInSession);
const getGeneralListMock = vi.mocked(getGeneralList);
const setItemCheckedMock = vi.mocked(setItemChecked);

const LECHE: ShoppingListItem = {
  checkedAt: null,
  id: "item-leche",
  productName: "Leche entera",
  purchaseSessionId: null,
  quantity: 2,
  quantityBought: null,
  sizeLabel: "1000 ml",
  variantId: "variant-leche",
};
// La hora que pone la base (trigger de 015).
const SERVER_CHECKED_AT = "2026-10-09T15:30:00.000Z";
const SESSION_ID = "session-maxipali";
const NO_SESSION = null;

/** Una respuesta de la base que el test decide cuándo llega y cómo termina. */
const createPendingResponse = () => {
  let resolve: (check: ItemCheck) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<ItemCheck>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
};

const renderLoadedList = async (items: ShoppingListItem[] = [LECHE]) => {
  getGeneralListMock.mockResolvedValue(items);
  const hook = renderHook(() => useShoppingList());
  await waitFor(() => expect(hook.result.current.state.isLoading).toBe(false));
  return hook;
};

describe("useShoppingList: optimistic check-off", () => {
  it("shows the row as checked before the database answers, then keeps the database time", async () => {
    const response = createPendingResponse();
    setItemCheckedMock.mockReturnValue(response.promise);
    const { result } = await renderLoadedList();

    act(() => result.current.toggleChecked(LECHE.id, true, NO_SESSION));

    // Optimista: ya está tachada y la fila sigue bloqueada mientras viaja.
    expect(result.current.state.items[0].checkedAt).not.toBeNull();
    expect(result.current.state.pendingItemIds).toEqual([LECHE.id]);

    await act(async () =>
      response.resolve({ checkedAt: SERVER_CHECKED_AT, purchaseSessionId: null, quantityBought: null }),
    );

    expect(result.current.state.items[0].checkedAt).toBe(SERVER_CHECKED_AT);
    expect(result.current.state.pendingItemIds).toEqual([]);
  });

  it("puts the row back where it was and shows the error when the database rejects the check", async () => {
    const response = createPendingResponse();
    setItemCheckedMock.mockReturnValue(response.promise);
    const { result } = await renderLoadedList();

    act(() => result.current.toggleChecked(LECHE.id, true, NO_SESSION));
    expect(result.current.state.items[0].checkedAt).not.toBeNull();

    await act(async () => response.reject(new Error("network")));

    // Nadie escribe un rollback: React descarta el valor optimista al terminar la transición.
    expect(result.current.state.items[0].checkedAt).toBeNull();
    expect(result.current.state.checkErrorMessage).toBe(SHOPPING_LIST_TEXT.CHECK_ERROR);
    expect(result.current.state.pendingItemIds).toEqual([]);
  });
});

describe("useShoppingList: shopping mode (SCRUM-67)", () => {
  it("checks off inside the purchase, showing it bought as requested before the database answers", async () => {
    const response = createPendingResponse();
    checkItemInSessionMock.mockReturnValue(response.promise);
    const { result } = await renderLoadedList();

    act(() => result.current.toggleChecked(LECHE.id, true, SESSION_ID));

    expect(checkItemInSessionMock).toHaveBeenCalledWith(LECHE.id, SESSION_ID);
    expect(result.current.state.items[0]).toMatchObject({ purchaseSessionId: SESSION_ID, quantityBought: 2 });

    await act(async () =>
      response.resolve({ checkedAt: SERVER_CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 2 }),
    );

    expect(result.current.state.items[0]).toMatchObject({ checkedAt: SERVER_CHECKED_AT, purchaseSessionId: SESSION_ID });
  });

  it("unchecks with the plain RPC even in shopping mode: the database clears the purchase", async () => {
    setItemCheckedMock.mockResolvedValue({ checkedAt: null, purchaseSessionId: null, quantityBought: null });
    const bought = { ...LECHE, checkedAt: SERVER_CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 2 };
    const { result } = await renderLoadedList([bought]);

    await act(async () => result.current.toggleChecked(LECHE.id, false, SESSION_ID));

    expect(setItemCheckedMock).toHaveBeenCalledWith(LECHE.id, false);
    expect(result.current.state.items[0]).toMatchObject({ checkedAt: null, purchaseSessionId: null, quantityBought: null });
  });

  it("changes what was bought and leaves what was requested alone", async () => {
    changeItemBoughtQuantityMock.mockResolvedValue(3);
    const bought = { ...LECHE, checkedAt: SERVER_CHECKED_AT, purchaseSessionId: SESSION_ID, quantityBought: 2 };
    const { result } = await renderLoadedList([bought]);

    await act(async () => result.current.changeBoughtQuantity(LECHE.id, ITEM_QUANTITY.STEP.INCREASE));

    expect(changeItemBoughtQuantityMock).toHaveBeenCalledWith(LECHE.id, ITEM_QUANTITY.STEP.INCREASE);
    expect(result.current.state.items[0]).toMatchObject({ quantity: 2, quantityBought: 3 });
  });
});
