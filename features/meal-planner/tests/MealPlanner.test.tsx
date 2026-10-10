// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { MEAL_PLANNER_TEXT, MEAL_TYPE_LABEL } from "../constants/meal-planner.constants";
import { useToday } from "../hooks/useToday";
import { getMealPlan, getRecipeOptions } from "../services/meal-plan.service";
import { MealPlanner } from "../MealPlanner";
import { createMealPlannerPage } from "./MealPlanner.page";

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

const renderPlanner = (today: NullableRef<Date> = WEDNESDAY): ReturnType<typeof createMealPlannerPage> => {
  useTodayMock.mockReturnValue(today);
  render(<MealPlanner />);
  return createMealPlannerPage();
};

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

beforeEach(() => {
  useTodayMock.mockReset();
  getMealPlanMock.mockReset().mockResolvedValue([]);
  getRecipeOptionsMock.mockReset().mockResolvedValue([]);
});

describe("MealPlanner", () => {
  it("shows the section title with the planner as the current sub-tab", () => {
    const page = renderPlanner();

    expect(page.getTitle()).toBeInTheDocument();
    expect(page.getPlannerTab()).toHaveAttribute("aria-current", "page");
    expect(page.getRecipesTab()).not.toHaveAttribute("aria-current");
  });

  it("starts on the current week with its range", () => {
    const page = renderPlanner();

    expect(page.getRange("12 – 18 oct")).toBeInTheDocument();
    expect(page.getWeekLabel(MEAL_PLANNER_TEXT.THIS_WEEK)).toBeInTheDocument();
  });

  it("shows seven days, from Monday to Sunday, each with its date", () => {
    const page = renderPlanner();

    expect(page.getDays().map((day) => day.getAttribute("datetime"))).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("gives every day an empty breakfast, lunch and dinner", () => {
    const page = renderPlanner();

    Object.values(MEAL_TYPE_LABEL).forEach((mealLabel) => {
      expect(page.getEmptySlots(mealLabel)).toHaveLength(7);
    });
    expect(page.queryAllEmptySlots()).toHaveLength(21);
  });

  it("marks only today as the current date", () => {
    const page = renderPlanner();

    expect(page.getDay("Mié 14")).toHaveAttribute("aria-current", "date");
    expect(page.getDays().filter((day) => day.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("makes every slot a button named with its day, its meal and what pressing it does", () => {
    const page = renderPlanner();

    expect(page.getSlotButtons()).toHaveLength(21);
    expect(page.getSlotButton("Almuerzo del lunes 12, vacío, asignar")).toBeInTheDocument();
    expect(page.getSlotButton("Cena del domingo 18, vacío, asignar")).toBeInTheDocument();
  });

  it("starts with the back arrow disabled and the forward one enabled", () => {
    const page = renderPlanner();

    expect(page.getPreviousWeekButton()).toBeDisabled();
    expect(page.getNextWeekButton()).toBeEnabled();
  });

  it("shows the next week when the forward arrow is pressed", async () => {
    const page = renderPlanner();

    await page.goToNextWeek();

    expect(page.getRange("19 – 25 oct")).toBeInTheDocument();
    expect(page.getWeekLabel(MEAL_PLANNER_TEXT.NEXT_WEEK)).toBeInTheDocument();
    expect(page.getDays()[0]).toHaveAttribute("datetime", "2026-10-19");
  });

  it("marks nobody as today on the next week", async () => {
    const page = renderPlanner();

    await page.goToNextWeek();

    expect(page.getDays().some((day) => day.hasAttribute("aria-current"))).toBe(false);
  });

  it("swaps which arrow is disabled when it moves to the next week", async () => {
    const page = renderPlanner();

    await page.goToNextWeek();

    expect(page.getNextWeekButton()).toBeDisabled();
    expect(page.getPreviousWeekButton()).toBeEnabled();
  });

  it("goes back to the current week with today marked again", async () => {
    const page = renderPlanner();
    await page.goToNextWeek();

    await page.goToPreviousWeek();

    expect(page.getRange("12 – 18 oct")).toBeInTheDocument();
    expect(page.getDay("Mié 14")).toHaveAttribute("aria-current", "date");
  });

  it("keeps the three empty slots on every day of the next week", async () => {
    const page = renderPlanner();

    await page.goToNextWeek();

    expect(page.queryAllEmptySlots()).toHaveLength(21);
  });

  it("does not draw the grid while today is not known", () => {
    const page = renderPlanner(null);

    expect(page.queryDays()).toEqual([]);
    expect(page.queryAllEmptySlots()).toEqual([]);
  });
});
