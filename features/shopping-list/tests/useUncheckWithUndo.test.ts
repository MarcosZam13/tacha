// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UNDO_UNCHECK_STATUS, UNDO_UNCHECK_TEXT } from "../constants/shortfall-resolution.constants";
import { useUncheckWithUndo } from "../hooks/useUncheckWithUndo";
import { undoShortfallResolutionAndUncheck } from "../services/shortfall-resolution.service";

vi.mock("../services/shortfall-resolution.service", () => ({
  undoShortfallResolutionAndUncheck: vi.fn(),
}));
const undoMock = vi.mocked(undoShortfallResolutionAndUncheck);

const ITEM_ID = "item-leche";

const renderConfirming = () => {
  const reload = vi.fn(() => Promise.resolve([]));
  const hook = renderHook(() => useUncheckWithUndo({ reload }));
  act(() => hook.result.current.request(ITEM_ID));
  return { ...hook, reload };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useUncheckWithUndo", () => {
  it("asks before unchecking a row the panel changed (rule 45)", () => {
    const { result } = renderConfirming();

    expect(result.current.state).toEqual({ itemId: ITEM_ID, status: UNDO_UNCHECK_STATUS.CONFIRMING });
    expect(undoMock).not.toHaveBeenCalled();
  });

  it("undoes and unchecks in one call, reloads the list and closes", async () => {
    undoMock.mockResolvedValue({ isApplied: true });
    const { result, reload } = renderConfirming();

    await act(async () => result.current.confirm());

    expect(undoMock).toHaveBeenCalledWith(ITEM_ID);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe(UNDO_UNCHECK_STATUS.CLOSED);
  });

  it("cancel changes nothing", () => {
    const { result } = renderConfirming();

    act(() => result.current.cancel());

    expect(undoMock).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe(UNDO_UNCHECK_STATUS.CLOSED);
  });

  it("keeps the dialog open with the message when it fails, and the row stays as it was", async () => {
    undoMock.mockRejectedValue(new Error("network"));
    const { result, reload } = renderConfirming();

    await act(async () => result.current.confirm());

    expect(reload).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({
      errorMessage: UNDO_UNCHECK_TEXT.ERROR,
      itemId: ITEM_ID,
      status: UNDO_UNCHECK_STATUS.FAILED,
    });
  });
});
