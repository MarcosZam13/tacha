// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import { useStorePicker } from "../hooks/useStorePicker";
import { getStores, startPurchaseSession } from "../services/purchase-session.service";

vi.mock("../services/purchase-session.service", () => ({ getStores: vi.fn(), startPurchaseSession: vi.fn() }));

const getStoresMock = vi.mocked(getStores);
const startPurchaseSessionMock = vi.mocked(startPurchaseSession);
const STORES = [
  { id: "store-maxipali", name: "MaxiPali" },
  { id: "store-masxmenos", name: "MasXMenos" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useStorePicker", () => {
  it("asks for the stores only when it opens, once", async () => {
    getStoresMock.mockResolvedValue(STORES);
    const { result } = renderHook(() => useStorePicker({ onStarted: vi.fn() }));
    expect(getStoresMock).not.toHaveBeenCalled();

    act(() => result.current.open());
    expect(result.current.isLoadingStores).toBe(true);
    await waitFor(() => expect(result.current.stores).toEqual(STORES));

    act(() => result.current.close());
    act(() => result.current.open());
    expect(getStoresMock).toHaveBeenCalledTimes(1);
  });

  it("starts the purchase in the picked store, closes and hands over the purchase", async () => {
    getStoresMock.mockResolvedValue(STORES);
    startPurchaseSessionMock.mockResolvedValue("session-maxipali");
    const onStarted = vi.fn();
    const { result } = renderHook(() => useStorePicker({ onStarted }));
    act(() => result.current.open());

    await act(async () => result.current.pickStore("store-maxipali"));

    expect(startPurchaseSessionMock).toHaveBeenCalledWith("store-maxipali");
    expect(onStarted).toHaveBeenCalledWith("session-maxipali");
    expect(result.current.isOpen).toBe(false);
  });

  it("stays open with an error when the purchase cannot start", async () => {
    getStoresMock.mockResolvedValue(STORES);
    startPurchaseSessionMock.mockRejectedValue(new Error("network"));
    const onStarted = vi.fn();
    const { result } = renderHook(() => useStorePicker({ onStarted }));
    act(() => result.current.open());

    await act(async () => result.current.pickStore("store-maxipali"));

    expect(onStarted).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);
    expect(result.current.errorMessage).toBe(PURCHASE_SESSION_TEXT.START_ERROR);
  });

  it("shows an error when the stores cannot load, and tries again when reopened", async () => {
    getStoresMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(STORES);
    const { result } = renderHook(() => useStorePicker({ onStarted: vi.fn() }));

    act(() => result.current.open());
    await waitFor(() => expect(result.current.errorMessage).toBe(PURCHASE_SESSION_TEXT.STORES_ERROR));
    expect(result.current.isLoadingStores).toBe(false);

    act(() => result.current.close());
    act(() => result.current.open());
    await waitFor(() => expect(result.current.stores).toEqual(STORES));
    expect(result.current.errorMessage).toBeNull();
  });
});
