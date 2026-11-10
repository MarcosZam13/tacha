// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CATALOG_BASE_UNIT } from "@/constants";
import { ITEM_QUANTITY, SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import { useShoppingList } from "../hooks/useShoppingList";
import type { ItemCheck } from "../models/ItemCheck.interface";
import type { ItemCheckResult } from "../models/ItemCheckResult.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import {
  changeItemBoughtQuantity,
  changeItemQuantity,
  checkItemInSession,
  getGeneralList,
  getGeneralListShortfalls,
  setItemChecked,
} from "../services/shopping-list.service";

vi.mock("../services/shopping-list.service", () => ({
  addItemToGeneralList: vi.fn(),
  changeItemBoughtQuantity: vi.fn(),
  changeItemQuantity: vi.fn(),
  checkItemInSession: vi.fn(),
  deleteListItem: vi.fn(),
  getGeneralList: vi.fn(),
  // SCRUM-115: después de cada cambio se vuelven a pedir los avisos en vivo.
  getGeneralListShortfalls: vi.fn(() => Promise.resolve(new Map())),
  setItemChecked: vi.fn(),
}));
const changeItemBoughtQuantityMock = vi.mocked(changeItemBoughtQuantity);
const checkItemInSessionMock = vi.mocked(checkItemInSession);
const getGeneralListMock = vi.mocked(getGeneralList);
const setItemCheckedMock = vi.mocked(setItemChecked);
const changeItemQuantityMock = vi.mocked(changeItemQuantity);
const getGeneralListShortfallsMock = vi.mocked(getGeneralListShortfalls);

const LECHE: ShoppingListItem = {
  checkedAt: null,
  id: "item-leche",
  productName: "Leche entera",
  purchaseSessionId: null,
  quantity: 2,
  quantityBought: null,
  recipeShortfalls: [],
  shortfallSnapshot: null,
  sizeLabel: "1000 ml",
  variantId: "variant-leche",
};
// La hora que pone la base (trigger de 015).
const SERVER_CHECKED_AT = "2026-10-09T15:30:00.000Z";
const SESSION_ID = "session-maxipali";
const NO_SESSION = null;

/** Una respuesta de la base que el test decide cuándo llega y cómo termina. */
const createPendingResponse = <Response>() => {
  let resolve: (response: Response) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<Response>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
};

/** Lo que devuelve set_list_item_checked: la fila que quedó (la misma, o la pendiente si se juntaron). */
const toCheckResult = (check: ItemCheck, item: ShoppingListItem = LECHE): ItemCheckResult => ({
  check,
  itemId: item.id,
  quantity: item.quantity,
});

const renderLoadedList = async (items: ShoppingListItem[] = [LECHE]) => {
  getGeneralListMock.mockResolvedValue(items);
  const hook = renderHook(() => useShoppingList());
  await waitFor(() => expect(hook.result.current.state.isLoading).toBe(false));
  return hook;
};

describe("useShoppingList: optimistic check-off", () => {
  it("shows the row as checked before the database answers, then keeps the database time", async () => {
    const response = createPendingResponse<ItemCheckResult>();
    setItemCheckedMock.mockReturnValue(response.promise);
    const { result } = await renderLoadedList();

    act(() => result.current.toggleChecked(LECHE.id, true, NO_SESSION));

    // Optimista: ya está tachada y la fila sigue bloqueada mientras viaja.
    expect(result.current.state.items[0].checkedAt).not.toBeNull();
    expect(result.current.state.pendingItemIds).toEqual([LECHE.id]);

    await act(async () =>
      response.resolve(toCheckResult({ checkedAt: SERVER_CHECKED_AT, purchaseSessionId: null, quantityBought: null })),
    );

    expect(result.current.state.items[0].checkedAt).toBe(SERVER_CHECKED_AT);
    expect(result.current.state.pendingItemIds).toEqual([]);
  });

  it("puts the row back where it was and shows the error when the database rejects the check", async () => {
    const response = createPendingResponse<ItemCheckResult>();
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

  it("drops the unchecked row when the database merges it into the pending row of the same variant (SCRUM-156)", async () => {
    const boughtLeche = { ...LECHE, checkedAt: SERVER_CHECKED_AT, quantity: 3 };
    const pendingLeche = { ...LECHE, id: "item-leche-2", quantity: 1 };
    // La base devuelve la pendiente (otro id) con la suma.
    setItemCheckedMock.mockResolvedValue(
      toCheckResult({ checkedAt: null, purchaseSessionId: null, quantityBought: null }, { ...pendingLeche, quantity: 4 }),
    );
    const { result } = await renderLoadedList([boughtLeche, pendingLeche]);

    await act(async () => result.current.toggleChecked(boughtLeche.id, false, NO_SESSION));

    expect(result.current.state.items).toHaveLength(1);
    expect(result.current.state.items[0]).toMatchObject({ checkedAt: null, id: pendingLeche.id, quantity: 4 });
    expect(result.current.state.pendingItemIds).toEqual([]);
  });
});

describe("useShoppingList: shopping mode (SCRUM-67)", () => {
  it("checks off inside the purchase, showing it bought as requested before the database answers", async () => {
    const response = createPendingResponse<ItemCheck>();
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
    setItemCheckedMock.mockResolvedValue(
      toCheckResult({ checkedAt: null, purchaseSessionId: null, quantityBought: null }),
    );
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

describe("useShoppingList: recipe shortfalls (SCRUM-115)", () => {
  const SHORTFALL = { quantityMissing: 600, recipeName: "Tres leches", unit: CATALOG_BASE_UNIT.MILLILITERS };

  it("tells the caller once the database confirms a check, to open \"¿Qué hiciste?\"", async () => {
    setItemCheckedMock.mockResolvedValue(
      toCheckResult({ checkedAt: SERVER_CHECKED_AT, purchaseSessionId: null, quantityBought: null }),
    );
    const onChecked = vi.fn();
    const { result } = await renderLoadedList();

    await act(async () => result.current.toggleChecked(LECHE.id, true, NO_SESSION, onChecked));

    expect(onChecked).toHaveBeenCalledTimes(1);
  });

  it("does not open the panel when the check fails", async () => {
    setItemCheckedMock.mockRejectedValue(new Error("network"));
    const onChecked = vi.fn();
    const { result } = await renderLoadedList();

    await act(async () => result.current.toggleChecked(LECHE.id, true, NO_SESSION, onChecked));

    expect(onChecked).not.toHaveBeenCalled();
  });

  it("asks for the live shortfalls again after the quantity changes (rule 47)", async () => {
    changeItemQuantityMock.mockResolvedValue(3);
    getGeneralListShortfallsMock.mockResolvedValue(new Map([[LECHE.id, [SHORTFALL]]]));
    const { result } = await renderLoadedList();

    await act(async () => result.current.changeQuantity(LECHE.id, ITEM_QUANTITY.STEP.INCREASE));

    await waitFor(() => expect(result.current.state.items[0].recipeShortfalls).toEqual([SHORTFALL]));
  });

  it("keeps the last shortfalls when asking for them again fails", async () => {
    changeItemQuantityMock.mockResolvedValue(3);
    getGeneralListShortfallsMock.mockRejectedValue(new Error("network"));
    const { result } = await renderLoadedList([{ ...LECHE, recipeShortfalls: [SHORTFALL] }]);

    await act(async () => result.current.changeQuantity(LECHE.id, ITEM_QUANTITY.STEP.INCREASE));

    expect(result.current.state.items[0].recipeShortfalls).toEqual([SHORTFALL]);
    expect(result.current.state.quantityErrorMessage).toBeNull();
  });

  it("reloads the whole list and returns what is on screen", async () => {
    const { result } = await renderLoadedList();
    const reloadedLeche = { ...LECHE, quantity: 5 };
    getGeneralListMock.mockResolvedValue([reloadedLeche]);

    let reloadedItems: ShoppingListItem[] | null = null;
    await act(async () => {
      reloadedItems = await result.current.reload();
    });

    expect(reloadedItems).toEqual([reloadedLeche]);
    expect(result.current.state.items).toEqual([reloadedLeche]);
  });

  it("does not let an older shortfall refresh overwrite a newer reload", async () => {
    changeItemQuantityMock.mockResolvedValue(3);
    const staleShortfalls = createPendingResponse<Map<string, (typeof SHORTFALL)[]>>();
    getGeneralListShortfallsMock.mockReturnValue(staleShortfalls.promise);
    const { result } = await renderLoadedList();

    // Sale un refresco de avisos que todavía no responde...
    await act(async () => result.current.changeQuantity(LECHE.id, ITEM_QUANTITY.STEP.INCREASE));
    // ...y una recarga trae la lista con su aviso.
    getGeneralListMock.mockResolvedValue([{ ...LECHE, recipeShortfalls: [SHORTFALL] }]);
    await act(async () => {
      await result.current.reload();
    });
    // El refresco viejo responde después, sin avisos: no pisa la recarga.
    await act(async () => staleShortfalls.resolve(new Map()));

    expect(result.current.state.items[0].recipeShortfalls).toEqual([SHORTFALL]);
  });
});

