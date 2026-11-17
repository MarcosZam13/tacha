// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useClosePurchase } from "../hooks/useClosePurchase";
import { useItemDetail } from "../hooks/useItemDetail";
import { useItemRemoval } from "../hooks/useItemRemoval";
import { useKeptPersonalList } from "../hooks/useKeptPersonalList";
import { usePurchaseSession } from "../hooks/usePurchaseSession";
import { useShoppingList } from "../hooks/useShoppingList";
import { useShoppingListViewModel } from "../hooks/useShoppingListViewModel";
import { useShortfallFlowViewModel } from "../hooks/useShortfallFlowViewModel";
import { useStorePicker } from "../hooks/useStorePicker";

// El ViewModel solo une hooks: cada uno se reemplaza por lo mínimo que lee la fachada.
vi.mock("@/hooks/useProductSearch", () => ({ useProductSearch: vi.fn() }));
vi.mock("../hooks/useClosePurchase", () => ({ useClosePurchase: vi.fn() }));
vi.mock("../hooks/useItemDetail", () => ({ useItemDetail: vi.fn() }));
vi.mock("../hooks/useItemRemoval", () => ({ useItemRemoval: vi.fn() }));
vi.mock("../hooks/useKeptPersonalList", () => ({ useKeptPersonalList: vi.fn() }));
vi.mock("../hooks/usePurchaseSession", () => ({ usePurchaseSession: vi.fn() }));
vi.mock("../hooks/useShoppingList", () => ({ useShoppingList: vi.fn() }));
vi.mock("../hooks/useShortfallFlowViewModel", () => ({ useShortfallFlowViewModel: vi.fn() }));
vi.mock("../hooks/useStorePicker", () => ({ useStorePicker: vi.fn() }));

const ACTIVE_SESSION_ID = "session-maxipali";
const markPurchaseClosed = vi.fn();
const leaveClosedSession = vi.fn();

beforeEach(() => {
  markPurchaseClosed.mockReset();
  leaveClosedSession.mockReset();

  vi.mocked(useShoppingList).mockReturnValue({
    markPurchaseClosed,
    state: {
      addErrorMessage: null,
      checkErrorMessage: null,
      isLoading: false,
      items: [],
      loadErrorMessage: null,
      pendingItemIds: [],
      quantityErrorMessage: null,
      removeErrorMessage: null,
    },
  } as unknown as ReturnType<typeof useShoppingList>);
  vi.mocked(usePurchaseSession).mockReturnValue({
    activeSession: { id: ACTIVE_SESSION_ID, storeName: "MaxiPali" },
    isLoadingSession: false,
    leaveClosedSession,
    sessionNoticeMessage: null,
  } as unknown as ReturnType<typeof usePurchaseSession>);
  vi.mocked(useClosePurchase).mockReturnValue({} as ReturnType<typeof useClosePurchase>);
  vi.mocked(useProductSearch).mockReturnValue({ results: [] } as unknown as ReturnType<typeof useProductSearch>);
  vi.mocked(useItemDetail).mockReturnValue({} as ReturnType<typeof useItemDetail>);
  vi.mocked(useItemRemoval).mockReturnValue({ hiddenItemIds: [], undoItemId: null } as unknown as ReturnType<
    typeof useItemRemoval
  >);
  vi.mocked(useKeptPersonalList).mockReturnValue([]);
  vi.mocked(useShortfallFlowViewModel).mockReturnValue({} as ReturnType<typeof useShortfallFlowViewModel>);
  vi.mocked(useStorePicker).mockReturnValue({ stores: [] } as unknown as ReturnType<typeof useStorePicker>);
});

/** El onClosed que el ViewModel le pasó a useClosePurchase en el último render. */
const getOnPurchaseClosed = (): (() => void) => vi.mocked(useClosePurchase).mock.lastCall?.[0].onClosed ?? vi.fn();

describe("useShoppingListViewModel: closing the purchase (SCRUM-115, BUG-2)", () => {
  it("marks the closed purchase on the list, so its rows stop offering undo without a reload", () => {
    renderHook(() => useShoppingListViewModel());

    act(() => getOnPurchaseClosed()());

    expect(markPurchaseClosed).toHaveBeenCalledExactlyOnceWith(ACTIVE_SESSION_ID);
  });

  it("leaves shopping mode after closing the purchase", () => {
    renderHook(() => useShoppingListViewModel());

    act(() => getOnPurchaseClosed()());

    expect(leaveClosedSession).toHaveBeenCalledTimes(1);
  });

  it("does not mark anything while the purchase is still open", () => {
    renderHook(() => useShoppingListViewModel());

    expect(markPurchaseClosed).not.toHaveBeenCalled();
  });
});
