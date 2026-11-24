// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIST_SETTINGS_STATUS,
  SET_ASSIGNEE_ENABLED_RESULT,
  SET_ASSIGNEE_ENABLED_RESULT_MESSAGE,
} from "../constants/list-settings.constants";
import type { SetAssigneeEnabledResultType } from "../constants/list-settings.constants";
import { useListSettingsViewModel } from "../hooks/useListSettingsViewModel";
import type { SettableList } from "../models/SettableList.interface";
import { getSettableLists, setAssigneeEnabled } from "../services/list-settings.service";

vi.mock("../services/list-settings.service", () => ({ getSettableLists: vi.fn(), setAssigneeEnabled: vi.fn() }));
const getSettableListsMock = vi.mocked(getSettableLists);
const setAssigneeEnabledMock = vi.mocked(setAssigneeEnabled);

const GENERAL: SettableList = { id: "list-general", isEnabled: false, label: "Lista general" };
const SUBLIST: SettableList = { id: "date-1", isEnabled: true, label: "Cumple · 20/12/2099" };

const renderLoaded = async () => {
  const hook = renderHook(() => useListSettingsViewModel());
  await waitFor(() => expect(hook.result.current.status).toBe(LIST_SETTINGS_STATUS.READY));
  return hook;
};

beforeEach(() => {
  vi.resetAllMocks();
  getSettableListsMock.mockResolvedValue([GENERAL, SUBLIST]);
  setAssigneeEnabledMock.mockResolvedValue(SET_ASSIGNEE_ENABLED_RESULT.SAVED);
});

describe("useListSettingsViewModel", () => {
  it("starts loading and then shows the lists", async () => {
    const { result } = renderHook(() => useListSettingsViewModel());

    expect(result.current.status).toBe(LIST_SETTINGS_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(LIST_SETTINGS_STATUS.READY));
    expect(result.current.lists).toEqual([GENERAL, SUBLIST]);
  });

  it("is empty when the person has no lists", async () => {
    getSettableListsMock.mockResolvedValue([]);

    const { result } = renderHook(() => useListSettingsViewModel());
    await waitFor(() => expect(result.current.status).toBe(LIST_SETTINGS_STATUS.EMPTY));
  });

  it("shows an error when the lists do not load and loads them again on retry", async () => {
    getSettableListsMock.mockRejectedValueOnce(new Error("sin red"));
    const { result } = renderHook(() => useListSettingsViewModel());
    await waitFor(() => expect(result.current.status).toBe(LIST_SETTINGS_STATUS.ERROR));

    act(() => result.current.onRetry());
    expect(result.current.status).toBe(LIST_SETTINGS_STATUS.LOADING);
    await waitFor(() => expect(result.current.status).toBe(LIST_SETTINGS_STATUS.READY));
  });

  it("turns the setting on only for the list that was toggled", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("list-general"));
    await waitFor(() => expect(result.current.lists[0]?.isEnabled).toBe(true));

    expect(setAssigneeEnabledMock).toHaveBeenCalledWith("list-general", true);
    expect(result.current.lists[1]).toEqual(SUBLIST);
  });

  it("turns the setting off when it was on", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("date-1"));
    await waitFor(() => expect(result.current.lists[1]?.isEnabled).toBe(false));

    expect(setAssigneeEnabledMock).toHaveBeenCalledWith("date-1", false);
  });

  it("disables the switch of a list while it saves and ignores a second toggle", async () => {
    let finishSaving: (result: SetAssigneeEnabledResultType) => void = () => undefined;
    setAssigneeEnabledMock.mockReturnValue(new Promise((resolve) => (finishSaving = resolve)));
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("list-general"));
    expect(result.current.savingListIds).toEqual(["list-general"]);
    act(() => result.current.onToggle("list-general"));

    expect(setAssigneeEnabledMock).toHaveBeenCalledTimes(1);
    await act(async () => finishSaving(SET_ASSIGNEE_ENABLED_RESULT.SAVED));
    expect(result.current.savingListIds).toEqual([]);
  });

  it("keeps the previous value and shows the error next to that list when saving fails", async () => {
    setAssigneeEnabledMock.mockResolvedValue(SET_ASSIGNEE_ENABLED_RESULT.ERROR);
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("list-general"));
    await waitFor(() =>
      expect(result.current.errorByListId["list-general"]).toBe(
        SET_ASSIGNEE_ENABLED_RESULT_MESSAGE[SET_ASSIGNEE_ENABLED_RESULT.ERROR],
      ),
    );

    expect(result.current.lists[0]?.isEnabled).toBe(false);
    expect(result.current.errorByListId["date-1"]).toBeUndefined();
  });

  it("clears the error of a list when it is toggled again", async () => {
    setAssigneeEnabledMock.mockResolvedValueOnce(SET_ASSIGNEE_ENABLED_RESULT.ERROR);
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("list-general"));
    await waitFor(() => expect(result.current.errorByListId["list-general"]).toBeDefined());
    act(() => result.current.onToggle("list-general"));
    await waitFor(() => expect(result.current.lists[0]?.isEnabled).toBe(true));

    expect(result.current.errorByListId["list-general"]).toBeUndefined();
  });

  it("reads the lists again when the list no longer exists", async () => {
    setAssigneeEnabledMock.mockResolvedValue(SET_ASSIGNEE_ENABLED_RESULT.NOT_FOUND);
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("list-general"));
    await waitFor(() => expect(getSettableListsMock).toHaveBeenCalledTimes(2));

    expect(result.current.errorByListId["list-general"]).toBe(
      SET_ASSIGNEE_ENABLED_RESULT_MESSAGE[SET_ASSIGNEE_ENABLED_RESULT.NOT_FOUND],
    );
  });

  it("ignores a toggle of a list that is not on screen", async () => {
    const { result } = await renderLoaded();

    act(() => result.current.onToggle("otra-lista"));

    expect(setAssigneeEnabledMock).not.toHaveBeenCalled();
  });
});
