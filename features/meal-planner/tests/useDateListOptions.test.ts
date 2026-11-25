// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DATE_LIST_OPTIONS_STATUS } from "../constants/meal-planner.constants";
import { useDateListOptions } from "../hooks/useDateListOptions";
import type { DateListOption } from "../models/week-list-addition.interfaces";
import { getDateListOptions } from "../services/date-list-options.service";
import { createPending } from "./mealPlan.fixtures";

vi.mock("../services/date-list-options.service", () => ({ getDateListOptions: vi.fn() }));
const getDateListOptionsMock = vi.mocked(getDateListOptions);

const BEACH: DateListOption = { id: "list-beach", label: "Playa · 17 oct", name: "Playa" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useDateListOptions", () => {
  it("does not ask for anything until it is told to, nor without knowing today", () => {
    const { result } = renderHook(() => useDateListOptions({ todayKey: null }));

    act(() => result.current.load());

    expect(getDateListOptionsMock).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ status: DATE_LIST_OPTIONS_STATUS.IDLE });
  });

  it("keeps only the answer of the last request", async () => {
    const firstLoad = createPending<DateListOption[]>();
    getDateListOptionsMock.mockReturnValueOnce(firstLoad.promise).mockResolvedValueOnce([BEACH]);
    const { result } = renderHook(() => useDateListOptions({ todayKey: "2026-10-14" }));
    act(() => result.current.load());
    await act(async () => result.current.load());

    await act(async () => firstLoad.reject(new Error("late")));

    expect(result.current.state).toEqual({ options: [BEACH], status: DATE_LIST_OPTIONS_STATUS.READY });
  });

  it("ignores an answer that arrives after clearing", async () => {
    const pendingLoad = createPending<DateListOption[]>();
    getDateListOptionsMock.mockReturnValue(pendingLoad.promise);
    const { result } = renderHook(() => useDateListOptions({ todayKey: "2026-10-14" }));
    act(() => result.current.load());
    act(() => result.current.clear());

    await act(async () => pendingLoad.resolve([BEACH]));

    expect(result.current.state).toEqual({ status: DATE_LIST_OPTIONS_STATUS.IDLE });
  });
});
