// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEAL_TYPE, PLAN_SCOPE } from "../constants/meal-planner.constants";
import { useWeekMealPlan } from "../hooks/useWeekMealPlan";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { PlanScopeType } from "../models/meal-planner.types";
import { getHouseholdMealPlan } from "../services/household-meal-plan.service";
import { getMealPlan } from "../services/meal-plan.service";
import { createEntry, createPending } from "./mealPlan.fixtures";

vi.mock("../services/meal-plan.service", () => ({ getMealPlan: vi.fn() }));
vi.mock("../services/household-meal-plan.service", () => ({ getHouseholdMealPlan: vi.fn() }));
const getMealPlanMock = vi.mocked(getMealPlan);
const getHouseholdMealPlanMock = vi.mocked(getHouseholdMealPlan);
const onHouseholdLost = vi.fn();

const RANGE = { fromDateKey: "2026-10-12", toDateKey: "2026-10-25" };

const MONDAY_LUNCH = createEntry("a", "2026-10-12", MEAL_TYPE.LUNCH, "Arroz");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useWeekMealPlan", () => {
  it("starts loading and asks for the whole range once the range is known", async () => {
    getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);

    const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
    expect(result.current.isPlanReady).toBe(false);

    await waitFor(() => expect(result.current.isPlanReady).toBe(true));
    expect(getMealPlanMock).toHaveBeenCalledTimes(1);
    expect(getMealPlanMock).toHaveBeenCalledWith(RANGE);
  });

  it("does not ask while the range is not known", () => {
    renderHook(() => useWeekMealPlan({ onHouseholdLost, range: null, scope: PLAN_SCOPE.PERSONAL }));

    expect(getMealPlanMock).not.toHaveBeenCalled();
  });

  it("finds the entry of a slot and says null for an empty one", async () => {
    getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);
    const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
    await waitFor(() => expect(result.current.isPlanReady).toBe(true));

    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(MONDAY_LUNCH);
    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.DINNER)).toBeNull();
    expect(result.current.getEntry("2026-10-13", MEAL_TYPE.LUNCH)).toBeNull();
  });

  it("is ready with an empty plan when nothing is planned", async () => {
    getMealPlanMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));

    await waitFor(() => expect(result.current.isPlanReady).toBe(true));
    expect(result.current.hasLoadError).toBe(false);
  });

  it("says the load failed, and is not ready, when the database fails", async () => {
    getMealPlanMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));

    await waitFor(() => expect(result.current.hasLoadError).toBe(true));
    expect(result.current.isPlanReady).toBe(false);
  });

  it("loads again on retry and then is ready", async () => {
    getMealPlanMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([MONDAY_LUNCH]);
    const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
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
    const { result, unmount } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));

    unmount();
    await act(async () => response.resolve([MONDAY_LUNCH]));

    expect(result.current.isPlanReady).toBe(false);
  });

  it("does not ask again when it renders again with the same range", async () => {
    getMealPlanMock.mockResolvedValue([]);
    const { result, rerender } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: { ...RANGE }, scope: PLAN_SCOPE.PERSONAL }));
    await waitFor(() => expect(result.current.isPlanReady).toBe(true));

    rerender();

    expect(getMealPlanMock).toHaveBeenCalledTimes(1);
  });

  describe("changing the plan from the dialog", () => {
    it("adds a saved entry to an empty slot", async () => {
      getMealPlanMock.mockResolvedValue([]);
      const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));

      act(() => result.current.saveEntry(MONDAY_LUNCH));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(MONDAY_LUNCH);
    });

    it("replaces the entry of an occupied slot", async () => {
      getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);
      const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));
      const replacement = createEntry("b", "2026-10-12", MEAL_TYPE.LUNCH, "Flan");

      act(() => result.current.saveEntry(replacement));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(replacement);
    });

    it("removes the entry of a slot and leaves the others", async () => {
      const dinner = createEntry("c", "2026-10-12", MEAL_TYPE.DINNER, "Sopa");
      getMealPlanMock.mockResolvedValue([MONDAY_LUNCH, dinner]);
      const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));

      act(() => result.current.removeEntry({ dateKey: "2026-10-12", mealType: MEAL_TYPE.LUNCH }));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.DINNER)).toEqual(dinner);
    });

    it("removes every slot of a recipe that no longer exists", async () => {
      const tuesdayLunch = createEntry("d", "2026-10-13", MEAL_TYPE.LUNCH, "Arroz");
      const dinner = createEntry("c", "2026-10-12", MEAL_TYPE.DINNER, "Sopa");
      getMealPlanMock.mockResolvedValue([MONDAY_LUNCH, dinner, tuesdayLunch]);
      const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));
      await waitFor(() => expect(result.current.isPlanReady).toBe(true));

      act(() => result.current.removeRecipeSlots("recipe-Arroz"));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.getEntry("2026-10-13", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.DINNER)).toEqual(dinner);
    });

    it("ignores a change while the plan is not loaded", () => {
      getMealPlanMock.mockReturnValue(new Promise(() => undefined));
      const { result } = renderHook(() => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope: PLAN_SCOPE.PERSONAL }));

      act(() => result.current.saveEntry(MONDAY_LUNCH));

      expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
      expect(result.current.isPlanReady).toBe(false);
    });
  });
});

describe("useWeekMealPlan: changing between plans", () => {
  const FAMILY_LUNCH = createEntry("f", "2026-10-12", MEAL_TYPE.LUNCH, "Sopa");

  const renderScoped = () =>
    renderHook(({ scope }: { scope: PlanScopeType }) => useWeekMealPlan({ onHouseholdLost, range: RANGE, scope }), {
      initialProps: { scope: PLAN_SCOPE.PERSONAL as PlanScopeType },
    });

  it("loads the family plan and never shows the previous one meanwhile", async () => {
    const family = createPending<MealPlanEntry[] | null>();
    getMealPlanMock.mockResolvedValue([MONDAY_LUNCH]);
    getHouseholdMealPlanMock.mockReturnValue(family.promise);
    const { rerender, result } = renderScoped();
    await waitFor(() => expect(result.current.isPlanReady).toBe(true));

    rerender({ scope: PLAN_SCOPE.FAMILY });

    expect(result.current.isPlanReady).toBe(false);
    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toBeNull();
    await act(async () => family.resolve([FAMILY_LUNCH]));
    expect(getHouseholdMealPlanMock).toHaveBeenCalledExactlyOnceWith(RANGE);
    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(FAMILY_LUNCH);
  });

  it("ignores an answer of the other plan that arrives late", async () => {
    const personal = createPending<MealPlanEntry[]>();
    getMealPlanMock.mockReturnValue(personal.promise);
    getHouseholdMealPlanMock.mockResolvedValue([FAMILY_LUNCH]);
    const { rerender, result } = renderScoped();
    rerender({ scope: PLAN_SCOPE.FAMILY });
    await waitFor(() => expect(result.current.isPlanReady).toBe(true));

    await act(async () => personal.resolve([MONDAY_LUNCH]));

    expect(result.current.getEntry("2026-10-12", MEAL_TYPE.LUNCH)).toEqual(FAMILY_LUNCH);
  });

  it("warns that there is no family any more", async () => {
    getMealPlanMock.mockResolvedValue([]);
    getHouseholdMealPlanMock.mockResolvedValue(null);
    const { rerender } = renderScoped();

    rerender({ scope: PLAN_SCOPE.FAMILY });

    await waitFor(() => expect(onHouseholdLost).toHaveBeenCalledTimes(1));
  });
});
