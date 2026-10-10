// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { RenderHookResult } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { MEAL_PLANNER_TEXT } from "../constants/meal-planner.constants";
import { useMealPlannerViewModel } from "../hooks/useMealPlannerViewModel";
import { useToday } from "../hooks/useToday";
import { getMealPlan, getRecipeOptions } from "../services/meal-plan.service";
import type { MealPlannerViewModel } from "../models/meal-planner.interfaces";

vi.mock("../hooks/useToday", () => ({ useToday: vi.fn() }));
const useTodayMock = vi.mocked(useToday);

// Sin Supabase real: el plan y las recetas salen de servicios simulados.
vi.mock("../services/meal-plan.service", () => ({
  clearMealSlot: vi.fn(),
  getMealPlan: vi.fn(),
  getRecipeOptions: vi.fn(),
  saveMealSlot: vi.fn(),
}));
const getMealPlanMock = vi.mocked(getMealPlan);
const getRecipeOptionsMock = vi.mocked(getRecipeOptions);

// El 14 de octubre de 2026 es miércoles: la semana actual va del 12 al 18 y la próxima, del 19 al 25.
const WEDNESDAY = new Date(2026, 9, 14);

const renderPlanner = (today: NullableRef<Date> = WEDNESDAY): RenderHookResult<MealPlannerViewModel, unknown> => {
  useTodayMock.mockReturnValue(today);
  return renderHook(() => useMealPlannerViewModel());
};

beforeEach(() => {
  useTodayMock.mockReset();
  getMealPlanMock.mockReset().mockResolvedValue([]);
  getRecipeOptionsMock.mockReset().mockResolvedValue([]);
});

describe("useMealPlannerViewModel", () => {
  it("starts on the current week", () => {
    const { result } = renderPlanner();

    expect(result.current.weekLabel).toBe(MEAL_PLANNER_TEXT.THIS_WEEK);
    expect(result.current.rangeLabel).toBe("12 – 18 oct");
    expect(result.current.days).toHaveLength(7);
    expect(result.current.days[0].dateKey).toBe("2026-10-12");
    expect(result.current.days[6].dateKey).toBe("2026-10-18");
  });

  it("marks today only on the current week", () => {
    const { result } = renderPlanner();

    expect(result.current.days.filter((day) => day.isToday).map((day) => day.dateKey)).toEqual(["2026-10-14"]);
  });

  it("can only go forward from the current week", () => {
    const { result } = renderPlanner();

    expect(result.current.canGoToNextWeek).toBe(true);
    expect(result.current.canGoToPreviousWeek).toBe(false);
  });

  it("moves to the next week and shows its range and days", () => {
    const { result } = renderPlanner();

    act(() => result.current.onNextWeek());

    expect(result.current.weekLabel).toBe(MEAL_PLANNER_TEXT.NEXT_WEEK);
    expect(result.current.rangeLabel).toBe("19 – 25 oct");
    expect(result.current.days[0].dateKey).toBe("2026-10-19");
    expect(result.current.days[6].dateKey).toBe("2026-10-25");
  });

  it("marks nobody as today on the next week", () => {
    const { result } = renderPlanner();

    act(() => result.current.onNextWeek());

    expect(result.current.days.some((day) => day.isToday)).toBe(false);
  });

  it("can only go back from the next week", () => {
    const { result } = renderPlanner();

    act(() => result.current.onNextWeek());

    expect(result.current.canGoToNextWeek).toBe(false);
    expect(result.current.canGoToPreviousWeek).toBe(true);
  });

  it("goes back to the current week", () => {
    const { result } = renderPlanner();
    act(() => result.current.onNextWeek());

    act(() => result.current.onPreviousWeek());

    expect(result.current.weekLabel).toBe(MEAL_PLANNER_TEXT.THIS_WEEK);
    expect(result.current.rangeLabel).toBe("12 – 18 oct");
    expect(result.current.days.some((day) => day.isToday)).toBe(true);
  });

  it("does not go past the next week when the forward arrow is pressed twice", () => {
    const { result } = renderPlanner();

    act(() => result.current.onNextWeek());
    act(() => result.current.onNextWeek());

    expect(result.current.rangeLabel).toBe("19 – 25 oct");
  });

  it("keeps a Sunday in the week that ends that day", () => {
    const sunday = new Date(2026, 9, 18);

    const { result } = renderPlanner(sunday);

    expect(result.current.rangeLabel).toBe("12 – 18 oct");
    expect(result.current.days[6].isToday).toBe(true);
  });

  it("names both months when the next week crosses a month", () => {
    // Miércoles 23 de septiembre: la próxima semana va del 28 de septiembre al 4 de octubre.
    const { result } = renderPlanner(new Date(2026, 8, 23));

    act(() => result.current.onNextWeek());

    expect(result.current.rangeLabel).toBe("28 sep – 4 oct");
  });

  it("does not build the grid while today is not known", () => {
    const { result } = renderPlanner(null);

    expect(result.current.isReady).toBe(false);
    expect(result.current.days).toEqual([]);
    expect(result.current.rangeLabel).toBeNull();
  });

  it("is ready as soon as today is known", () => {
    const { result } = renderPlanner();

    expect(result.current.isReady).toBe(true);
  });

  describe("the plan and the dialog (SCRUM-100)", () => {
    it("asks for the plan of the two weeks once today is known", async () => {
      const { result } = renderPlanner();

      await waitFor(() => expect(result.current.plan.isPlanReady).toBe(true));
      expect(getMealPlanMock).toHaveBeenCalledTimes(1);
      expect(getMealPlanMock).toHaveBeenCalledWith({ fromDateKey: "2026-10-12", toDateKey: "2026-10-25" });
    });

    it("does not ask for the plan while today is not known", () => {
      renderPlanner(null);

      expect(getMealPlanMock).not.toHaveBeenCalled();
    });

    it("does not ask again when it goes to the next week and back", async () => {
      const { result } = renderPlanner();
      await waitFor(() => expect(result.current.plan.isPlanReady).toBe(true));

      act(() => result.current.onNextWeek());
      act(() => result.current.onPreviousWeek());

      expect(getMealPlanMock).toHaveBeenCalledTimes(1);
    });

    it("opens the dialog on a slot of the week in view, named with its day", async () => {
      const { result } = renderPlanner();
      await waitFor(() => expect(result.current.plan.isPlanReady).toBe(true));

      act(() => result.current.dialog.onSlotOpen({ dateKey: "2026-10-14", mealType: "dinner" }));

      expect(result.current.dialog.isOpen).toBe(true);
      expect(result.current.dialog.subtitle).toBe("Cena del miércoles 14");
    });
  });
});
