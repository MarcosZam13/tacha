// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEAL_TYPE } from "../constants/meal-planner.constants";
import { useWeekMealPlan } from "../hooks/useWeekMealPlan";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import { getMealPlan } from "../services/meal-plan.service";
import { createEntry, createPending } from "./mealPlan.fixtures";

vi.mock("../services/meal-plan.service", () => ({ getMealPlan: vi.fn() }));
const getMealPlanMock = vi.mocked(getMealPlan);

const RANGE = { fromDateKey: "2026-10-12", toDateKey: "2026-10-25" };

const MONDAY_LUNCH = createEntry("a", "2026-10-12", MEAL_TYPE.LUNCH, "Arroz");

beforeEach(() => {
  getMealPlanMock.mockReset();
});

describe("useWeekMealPlan", () => {
  it("starts loading and asks for the whole range once the range is known", async () => {
    getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);

    const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
    expect(result.current.isPlanReady).toBe(false);

    await waitFor(() => expect(result.current.isPlanReady).toBe(true));
    expect(getMealPlanMock).toHaveBeenCalledTimes(1);
    expect(getMealPlanMock).toHaveBeenCalledWith(RANGE);
  });

  it("does not ask while the range is not known", () => {
    renderHook(() => useWeekMealPlan({ range: null }));

    expect(getMealPlanMock).not.toHaveBeenCalled();
  });

  it("finds the entry of a slot and says null for an empty one", async () => {
    getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);
    const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
    await waitFor(() => expect(result.current.isPlanReady).toBe(true));

    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(MONDAY_LUNCH);
    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.DINNER)).toBeNull();
    expect(result.current.getEntry("2026-10-13", MEAL_TYPE.LUNCH)).toBeNull();
  });

  it("is ready with an empty plan when nothing is planned", async () => {
    getMealPlanMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));

    await waitFor(() => expect(result.current.isPlanReady).toBe(true));
    expect(result.current.hasLoadError).toBe(false);
  });

  it("says the load failed, and is not ready, when the database fails", async () => {
    getMealPlanMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));

    await waitFor(() => expect(result.current.hasLoadError).toBe(true));
    expect(result.current.isPlanReady).toBe(false);
  });

  it("loads again on retry and then is ready", async () => {
    getMealPlanMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([MONDAY_LUNCH]);
    const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
    await waitFor(() => expect(result.current.hasLoadError).toBe(true));

    act(() => result.current.onPlanRetry());
    expect(result.current.hasLoadError).toBe(false);
    expect(result.current.isPlanReady).toBe(false);

    await waitFor(() => expect(result.current.isPlanReady).toBe(true));
    expect(getMealPlanMock).toHaveBeenCalledTimes(2);
    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(MONDAY_LUNCH);
  });

  it("ignores an answer that arrives after the screen was closed", async () => {
    const response = createPending<MealPlanEntry[]>();
    getMealPlanMock.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(() => useWeekMealPlan({ range: RANGE }));

    unmount();
    await act(async () => response.resolve([MONDAY_LUNCH]));

    expect(result.current.isPlanReady).toBe(false);
  });

  it("does not ask again when it renders again with the same range", async () => {
    getMealPlanMock.mockResolvedValue([]);
    const { result, rerender } = renderHook(() => useWeekMealPlan({ range: { ...RANGE } }));
    await waitFor(() => expect(result.current.isPlanReady).toBe(true));

    rerender();

    expect(getMealPlanMock).toHaveBeenCalledTimes(1);
  });

  describe("changing the plan from the dialog", () => {
    it("adds a saved entry to an empty slot", async () => {
      getMealPlanMock.mockResolvedValue([]);
      const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));

      act(() => result.current.saveEntry(MONDAY_LUNCH));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(MONDAY_LUNCH);
    });

    it("replaces the entry of an occupied slot", async () => {
      getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);
      const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));
      const replacement = createEntry("b", "2026-10-12", MEAL_TYPE.LUNCH, "Flan");

      act(() => result.current.saveEntry(replacement));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(replacement);
    });

    it("removes the entry of a slot and leaves the others", async () => {
      const dinner = createEntry("c", "2026-10-12", MEAL_TYPE.DINNER, "Sopa");
      getMealPlanMock.mockResolvedValue([MONDAY_LUNCH, dinner]);
      const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));

      act(() => result.current.removeEntry({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH }));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.DINNER)).toEqual(dinner);
    });

    it("removes every slot of a recipe that no longer exists", async () => {
      const tuesdayLunch = createEntry("d", "2026-10-13", MEAL_TYPE.LUNCH, "Arroz");
      const dinner = createEntry("c", "2026-10-12", MEAL_TYPE.DINNER, "Sopa");
      getMealPlanMock.mockResolvedValue([MONDAY_LUNCH, dinner, tuesdayLunch]);
      const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));

      act(() => result.current.removeRecipeSlots("recipe-Arroz"));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.getEntry("2026-10-13", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.DINNER)).toEqual(dinner);
    });

    it("ignores a change while the plan is not loaded", () => {
      getMealPlanMock.mockReturnValue(new Promise(() => undefined));
      const { result } = renderHook(() => useWeekMealPlan({ range: RANGE }));

      act(() => result.current.saveEntry(MONDAY_LUNCH));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.isPlanReady).toBe(false);
    });
  });
});
