// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PURCHASE_SESSION_TEXT } from "../constants/purchase-session.constants";
import { useClosePurchase } from "../hooks/useClosePurchase";
import { closePurchaseSession } from "../services/purchase-session.service";

vi.mock("../services/purchase-session.service", () => ({ closePurchaseSession: vi.fn() }));

const closePurchaseSessionMock = vi.mocked(closePurchaseSession);
const SESSION_ID = "session-maxipali";

const renderPanel = (params: { isAllChecked: boolean; sessionId: string | null }) => {
  const onClosed = vi.fn();
  const hook = renderHook((props) => useClosePurchase({ ...props, onClosed }), { initialProps: params });
  return { ...hook, onClosed };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useClosePurchase: when the panel shows", () => {
  it("suggests closing once nothing is pending (CA-07), and hides again if something is unchecked", () => {
    const { result, rerender } = renderPanel({ isAllChecked: false, sessionId: SESSION_ID });
    expect(result.current.isVisible).toBe(false);

    rerender({ isAllChecked: true, sessionId: SESSION_ID });
    expect(result.current.isVisible).toBe(true);

    rerender({ isAllChecked: false, sessionId: SESSION_ID });
    expect(result.current.isVisible).toBe(false);
  });

  it("opens with 'Terminar compra' even with items pending", () => {
    const { result } = renderPanel({ isAllChecked: false, sessionId: SESSION_ID });

    act(() => result.current.request());

    expect(result.current.isVisible).toBe(true);
  });

  it("stops suggesting it for this purchase after 'Seguir comprando'", () => {
    const { result } = renderPanel({ isAllChecked: true, sessionId: SESSION_ID });

    act(() => result.current.dismiss());

    expect(result.current.isVisible).toBe(false);
  });

  it("never shows outside shopping mode", () => {
    const { result } = renderPanel({ isAllChecked: true, sessionId: null });

    expect(result.current.isVisible).toBe(false);
  });
});

describe("useClosePurchase: closing", () => {
  it("closes without a total when the field is empty", async () => {
    closePurchaseSessionMock.mockResolvedValue();
    const { result, onClosed } = renderPanel({ isAllChecked: true, sessionId: SESSION_ID });

    await act(async () => result.current.submit());

    expect(closePurchaseSessionMock).toHaveBeenCalledWith(SESSION_ID, null);
    expect(onClosed).toHaveBeenCalled();
  });

  it("sends the parsed total", async () => {
    closePurchaseSessionMock.mockResolvedValue();
    const { result } = renderPanel({ isAllChecked: true, sessionId: SESSION_ID });

    act(() => result.current.onTotalChange("12 500"));
    await act(async () => result.current.submit());

    expect(closePurchaseSessionMock).toHaveBeenCalledWith(SESSION_ID, 12500);
  });

  it("does not send an invalid total and shows the field error", async () => {
    const { result, onClosed } = renderPanel({ isAllChecked: true, sessionId: SESSION_ID });

    act(() => result.current.onTotalChange("12.5"));
    await act(async () => result.current.submit());

    expect(closePurchaseSessionMock).not.toHaveBeenCalled();
    expect(onClosed).not.toHaveBeenCalled();
    expect(result.current.totalErrorMessage).toBe(PURCHASE_SESSION_TEXT.TOTAL_ERROR);
  });

  it("keeps the purchase open with an error when closing fails", async () => {
    closePurchaseSessionMock.mockRejectedValue(new Error("network"));
    const { result, onClosed } = renderPanel({ isAllChecked: true, sessionId: SESSION_ID });

    await act(async () => result.current.submit());

    expect(onClosed).not.toHaveBeenCalled();
    expect(result.current.closeErrorMessage).toBe(PURCHASE_SESSION_TEXT.CLOSE_ERROR);
    expect(result.current.isVisible).toBe(true);
  });
});
