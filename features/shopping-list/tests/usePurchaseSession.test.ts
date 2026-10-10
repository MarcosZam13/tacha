// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import { usePurchaseSession } from "../hooks/usePurchaseSession";
import { getPurchaseSession } from "../services/purchase-session.service";

vi.mock("next/navigation", () => ({ useRouter: vi.fn(), useSearchParams: vi.fn() }));
vi.mock("../services/purchase-session.service", () => ({ getPurchaseSession: vi.fn() }));

const getPurchaseSessionMock = vi.mocked(getPurchaseSession);
const router = { push: vi.fn(), replace: vi.fn() };
const SESSION = { id: "session-maxipali", storeName: "MaxiPali" };

const renderAtUrl = (search: string) => {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>);
  return renderHook(() => usePurchaseSession());
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
});

describe("usePurchaseSession", () => {
  it("is not in shopping mode without ?compra and does not ask the database", () => {
    const { result } = renderAtUrl("");

    expect(result.current.activeSession).toBeNull();
    expect(result.current.isLoadingSession).toBe(false);
    expect(getPurchaseSessionMock).not.toHaveBeenCalled();
  });

  it("loads the purchase in the URL and enters shopping mode", async () => {
    getPurchaseSessionMock.mockResolvedValue(SESSION);
    const { result } = renderAtUrl(`compra=${SESSION.id}`);

    expect(result.current.isLoadingSession).toBe(true);
    await waitFor(() => expect(result.current.activeSession).toEqual(SESSION));
    expect(getPurchaseSessionMock).toHaveBeenCalledWith(SESSION.id);
  });

  it("leaves shopping mode with a notice when the purchase is closed, someone else's or missing", async () => {
    getPurchaseSessionMock.mockResolvedValue(null);
    const { result } = renderAtUrl("compra=closed-session");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(APP_ROUTE.LIST));
    expect(result.current.activeSession).toBeNull();
    expect(result.current.sessionNoticeMessage).toBe(PURCHASE_SESSION_TEXT.INVALID_SESSION);
  });

  it("enters a purchase through the URL and clears the previous notice", async () => {
    getPurchaseSessionMock.mockResolvedValue(null);
    const { result } = renderAtUrl("compra=closed-session");
    await waitFor(() => expect(result.current.sessionNoticeMessage).not.toBeNull());

    act(() => result.current.enterShoppingMode(SESSION.id));

    expect(router.push).toHaveBeenCalledWith(`/lista?compra=${SESSION.id}`);
    expect(result.current.sessionNoticeMessage).toBeNull();
  });

  it("exits to the plain list without closing anything", () => {
    const { result } = renderAtUrl(`compra=${SESSION.id}`);

    act(() => result.current.exitShoppingMode());

    expect(router.push).toHaveBeenCalledWith(APP_ROUTE.LIST);
  });

  it("leaves shopping mode with a load error when the purchase cannot be read", async () => {
    getPurchaseSessionMock.mockRejectedValue(new Error("network"));
    const { result } = renderAtUrl(`compra=${SESSION.id}`);

    await waitFor(() => expect(result.current.sessionNoticeMessage).toBe(PURCHASE_SESSION_TEXT.SESSION_LOAD_ERROR));
    expect(router.replace).toHaveBeenCalledWith(APP_ROUTE.LIST);
  });
});
