// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ASSIGNEE_LIST_SOURCE,
  ASSIGNEE_TEXT,
  SET_ITEM_ASSIGNEE_RESULT,
} from "../constants/assignee-field.constants";
import type { SetItemAssigneeResultType } from "../constants/assignee-field.constants";
import type { ListAssigneeData } from "../models/ListAssigneeData.interface";
import { useListAssigneesViewModel } from "../hooks/useListAssigneesViewModel";
import { getListAssigneeData, setItemAssignee } from "../services/assignee.service";

vi.mock("../services/assignee.service", () => ({ getListAssigneeData: vi.fn(), setItemAssignee: vi.fn() }));
const getListAssigneeDataMock = vi.mocked(getListAssigneeData);
const setItemAssigneeMock = vi.mocked(setItemAssignee);

const SOURCE = { kind: ASSIGNEE_LIST_SOURCE.LIST, listId: "list-1" } as const;
const ENABLED_DATA: ListAssigneeData = {
  assignments: { "item-1": "user-beto" },
  candidates: [
    { displayName: "Ana", isCurrentUser: true, userId: "user-ana" },
    { displayName: "Beto", isCurrentUser: false, userId: "user-beto" },
  ],
  isEnabled: true,
};
const DISABLED_DATA: ListAssigneeData = { assignments: {}, candidates: [], isEnabled: false };

const renderLoaded = async () => {
  const hook = renderHook(() => useListAssigneesViewModel(SOURCE));
  await waitFor(() => expect(hook.result.current.isEnabled).toBe(true));
  return hook;
};

beforeEach(() => {
  vi.resetAllMocks();
  getListAssigneeDataMock.mockResolvedValue(ENABLED_DATA);
  setItemAssigneeMock.mockResolvedValue(SET_ITEM_ASSIGNEE_RESULT.SAVED);
});

describe("useListAssigneesViewModel", () => {
  it("does not draw the field until the setting is known to be on", async () => {
    const { result } = renderHook(() => useListAssigneesViewModel(SOURCE));

    expect(result.current.isEnabled).toBe(false);
    await waitFor(() => expect(result.current.isEnabled).toBe(true));
  });

  it("stays off when the setting is off", async () => {
    getListAssigneeDataMock.mockResolvedValue(DISABLED_DATA);

    const { result } = renderHook(() => useListAssigneesViewModel(SOURCE));
    await waitFor(() => expect(getListAssigneeDataMock).toHaveBeenCalled());

    expect(result.current.isEnabled).toBe(false);
  });

  it("stays off when loading fails, so the list keeps working", async () => {
    getListAssigneeDataMock.mockRejectedValue(new Error("sin red"));

    const { result } = renderHook(() => useListAssigneesViewModel(SOURCE));
    await waitFor(() => expect(getListAssigneeDataMock).toHaveBeenCalled());

    expect(result.current.isEnabled).toBe(false);
  });

  it("names the assignee of each item and shows 'Sin asignar' for the rest", async () => {
    const { result } = await renderLoaded();

    expect(result.current.nameOf("item-1")).toBe("Beto");
    expect(result.current.nameOf("item-2")).toBe(ASSIGNEE_TEXT.UNASSIGNED);
    expect(result.current.selectedIdOf("item-1")).toBe("user-beto");
    expect(result.current.selectedIdOf("item-2")).toBeNull();
  });

  it("opens one picker at a time", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onOpen("item-1"));
    act(() => result.current.onOpen("item-2"));

    expect(result.current.openItemId).toBe("item-2");
  });

  it("closes the picker and clears the message", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onOpen("item-1"));
    act(() => result.current.onClose());

    expect(result.current.openItemId).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it("saves the choice, shows it and closes the picker", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onOpen("item-2"));
    act(() => result.current.onSelect("item-2", "user-ana"));
    await waitFor(() => expect(result.current.nameOf("item-2")).toBe("Ana"));

    expect(setItemAssigneeMock).toHaveBeenCalledWith({ assigneeId: "user-ana", itemId: "item-2" });
    expect(result.current.openItemId).toBeNull();
    expect(result.current.savingItemId).toBeNull();
  });

  it("clears the assignee when 'Sin asignar' is chosen", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onSelect("item-1", null));
    await waitFor(() => expect(result.current.nameOf("item-1")).toBe(ASSIGNEE_TEXT.UNASSIGNED));

    expect(setItemAssigneeMock).toHaveBeenCalledWith({ assigneeId: null, itemId: "item-1" });
  });

  it("disables the picker while saving and ignores a second choice", async () => {
    let finishSaving: (result: SetItemAssigneeResultType) => void = () => undefined;
    setItemAssigneeMock.mockReturnValue(new Promise((resolve) => (finishSaving = resolve)));
    const { result } = await renderLoaded();

    act(() => result.current.onSelect("item-2", "user-ana"));
    expect(result.current.savingItemId).toBe("item-2");
    act(() => result.current.onSelect("item-2", "user-beto"));
    act(() => result.current.onClose());

    expect(setItemAssigneeMock).toHaveBeenCalledTimes(1);
    await act(async () => finishSaving(SET_ITEM_ASSIGNEE_RESULT.SAVED));
    expect(result.current.savingItemId).toBeNull();
  });

  it("keeps the picker open with a message when saving fails", async () => {
    setItemAssigneeMock.mockResolvedValue(SET_ITEM_ASSIGNEE_RESULT.ERROR);
    const { result } = await renderLoaded();

    act(() => result.current.onOpen("item-2"));
    act(() => result.current.onSelect("item-2", "user-ana"));
    await waitFor(() => expect(result.current.errorMessage).toBe(ASSIGNEE_TEXT.ERROR_SAVE));

    expect(result.current.openItemId).toBe("item-2");
    expect(result.current.nameOf("item-2")).toBe(ASSIGNEE_TEXT.UNASSIGNED);
    expect(getListAssigneeDataMock).toHaveBeenCalledTimes(1);
  });

  it("saves on a second try after a failed one, with the picker still open", async () => {
    setItemAssigneeMock.mockResolvedValueOnce(SET_ITEM_ASSIGNEE_RESULT.ERROR);
    const { result } = await renderLoaded();

    act(() => result.current.onOpen("item-2"));
    act(() => result.current.onSelect("item-2", "user-ana"));
    await waitFor(() => expect(result.current.errorMessage).toBe(ASSIGNEE_TEXT.ERROR_SAVE));
    act(() => result.current.onSelect("item-2", "user-ana"));
    await waitFor(() => expect(result.current.nameOf("item-2")).toBe("Ana"));

    expect(setItemAssigneeMock).toHaveBeenCalledTimes(2);
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.openItemId).toBeNull();
  });

  it("reads the list again when the person chosen no longer has access", async () => {
    setItemAssigneeMock.mockResolvedValue(SET_ITEM_ASSIGNEE_RESULT.NOT_ALLOWED);
    const { result } = await renderLoaded();

    act(() => result.current.onSelect("item-2", "user-ana"));
    await waitFor(() => expect(result.current.errorMessage).toBe(ASSIGNEE_TEXT.ERROR_NOT_ALLOWED));
    await waitFor(() => expect(getListAssigneeDataMock).toHaveBeenCalledTimes(2));
  });

  it("tells the list was updated and reads it again when the item is gone", async () => {
    setItemAssigneeMock.mockResolvedValue(SET_ITEM_ASSIGNEE_RESULT.NOT_FOUND);
    const { result } = await renderLoaded();

    act(() => result.current.onSelect("item-2", "user-ana"));
    await waitFor(() => expect(result.current.errorMessage).toBe(ASSIGNEE_TEXT.LIST_UPDATED));
    await waitFor(() => expect(getListAssigneeDataMock).toHaveBeenCalledTimes(2));
  });

  it("asks for the general list when the source is the general one", async () => {
    renderHook(() => useListAssigneesViewModel({ kind: ASSIGNEE_LIST_SOURCE.GENERAL }));

    await waitFor(() => expect(getListAssigneeDataMock).toHaveBeenCalledWith({ kind: ASSIGNEE_LIST_SOURCE.GENERAL }));
  });
});

describe("useListAssigneesViewModel: when the screen moves to another list", () => {
  it("does not show what was read from the previous list while the new one loads", async () => {
    const { result, rerender } = renderHook(
      ({ listId }) => useListAssigneesViewModel({ kind: ASSIGNEE_LIST_SOURCE.LIST, listId }),
      { initialProps: { listId: "list-1" } },
    );
    await waitFor(() => expect(result.current.isEnabled).toBe(true));

    getListAssigneeDataMock.mockReturnValue(new Promise(() => undefined));
    rerender({ listId: "list-2" });

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.nameOf("item-1")).toBe(ASSIGNEE_TEXT.UNASSIGNED);
  });

  it("does not write a late save of the previous list into the new one", async () => {
    let finishSaving: (result: SetItemAssigneeResultType) => void = () => undefined;
    setItemAssigneeMock.mockReturnValue(new Promise((resolve) => (finishSaving = resolve)));
    const { result, rerender } = renderHook(
      ({ listId }) => useListAssigneesViewModel({ kind: ASSIGNEE_LIST_SOURCE.LIST, listId }),
      { initialProps: { listId: "list-1" } },
    );
    await waitFor(() => expect(result.current.isEnabled).toBe(true));

    act(() => result.current.onSelect("item-9", "user-ana"));
    getListAssigneeDataMock.mockResolvedValue({ ...ENABLED_DATA, assignments: {} });
    rerender({ listId: "list-2" });
    await waitFor(() => expect(result.current.isEnabled).toBe(true));
    await act(async () => finishSaving(SET_ITEM_ASSIGNEE_RESULT.SAVED));

    expect(result.current.selectedIdOf("item-9")).toBeNull();
  });
});
