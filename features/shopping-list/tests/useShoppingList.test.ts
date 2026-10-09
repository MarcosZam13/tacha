// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import { useShoppingList } from "../hooks/useShoppingList";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { getGeneralList, setItemChecked } from "../services/shopping-list.service";

vi.mock("../services/shopping-list.service", () => ({
  addItemToGeneralList: vi.fn(),
  changeItemQuantity: vi.fn(),
  deleteListItem: vi.fn(),
  getGeneralList: vi.fn(),
  setItemChecked: vi.fn(),
}));
const getGeneralListMock = vi.mocked(getGeneralList);
const setItemCheckedMock = vi.mocked(setItemChecked);

const LECHE: ShoppingListItem = {
  checkedAt: null,
  id: "item-leche",
  productName: "Leche entera",
  quantity: 1,
  sizeLabel: "1000 ml",
  variantId: "variant-leche",
};
// La hora que pone la base (trigger de 015).
const SERVER_CHECKED_AT = "2026-10-09T15:30:00.000Z";

/** Una respuesta de la base que el test decide cuándo llega y cómo termina. */
const createPendingResponse = () => {
  let resolve: (checkedAt: NullableRef<string>) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<NullableRef<string>>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
};

const renderLoadedList = async () => {
  getGeneralListMock.mockResolvedValue([LECHE]);
  const hook = renderHook(() => useShoppingList());
  await waitFor(() => expect(hook.result.current.state.isLoading).toBe(false));
  return hook;
};

describe("useShoppingList: optimistic check-off", () => {
  it("shows the row as checked before the database answers, then keeps the database time", async () => {
    const response = createPendingResponse();
    setItemCheckedMock.mockReturnValue(response.promise);
    const { result } = await renderLoadedList();

    act(() => {
      void result.current.toggleChecked(LECHE.id, true);
    });

    // Optimista: ya está tachada y la fila sigue bloqueada mientras viaja.
    expect(result.current.state.items[0].checkedAt).not.toBeNull();
    expect(result.current.state.pendingItemIds).toEqual([LECHE.id]);

    await act(async () => response.resolve(SERVER_CHECKED_AT));

    expect(result.current.state.items[0].checkedAt).toBe(SERVER_CHECKED_AT);
    expect(result.current.state.pendingItemIds).toEqual([]);
  });

  it("puts the row back where it was and shows the error when the database rejects the check", async () => {
    const response = createPendingResponse();
    setItemCheckedMock.mockReturnValue(response.promise);
    const { result } = await renderLoadedList();

    act(() => {
      void result.current.toggleChecked(LECHE.id, true);
    });
    expect(result.current.state.items[0].checkedAt).not.toBeNull();

    await act(async () => response.reject(new Error("network")));

    // Nadie escribe un rollback: React descarta el valor optimista al terminar la transición.
    expect(result.current.state.items[0].checkedAt).toBeNull();
    expect(result.current.state.checkErrorMessage).toBe(SHOPPING_LIST_TEXT.CHECK_ERROR);
    expect(result.current.state.pendingItemIds).toEqual([]);
  });
});
