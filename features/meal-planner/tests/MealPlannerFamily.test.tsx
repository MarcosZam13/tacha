// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isHouseholdMember } from "@/services/household-membership.service";
import { MEAL_TYPE, PLAN_SCOPE } from "../constants/meal-planner.constants";
import { useToday } from "../hooks/useToday";
import { MealPlanner } from "../MealPlanner";
import {
  getHouseholdMealPlan,
  getHouseholdRecipeOptions,
  getOtherHouseholdCooks,
} from "../services/household-meal-plan.service";
import { getDateListOptions } from "../services/date-list-options.service";
import { getMealPlan } from "../services/meal-plan.service";
import { addWeekToList } from "../services/week-list.service";
import { createEntry } from "./mealPlan.fixtures";
import { createMealPlannerPage } from "./MealPlanner.page";

vi.mock("../hooks/useToday", () => ({ useToday: vi.fn() }));
vi.mock("@/services/household-membership.service", () => ({ isHouseholdMember: vi.fn() }));
vi.mock("../services/meal-plan.service", () => ({ getMealPlan: vi.fn() }));
vi.mock("../services/week-list.service", () => ({ addWeekToList: vi.fn() }));
vi.mock("../services/date-list-options.service", () => ({ getDateListOptions: vi.fn() }));
vi.mock("../services/household-meal-plan.service", () => ({
  getHouseholdMealPlan: vi.fn(),
  getHouseholdRecipeOptions: vi.fn(),
  getOtherHouseholdCooks: vi.fn(),
}));

const PERSONAL_LUNCH = createEntry("p", "2026-10-12", MEAL_TYPE.LUNCH, "Arroz");
const FAMILY_LUNCH = {
  ...createEntry("f", "2026-10-12", MEAL_TYPE.LUNCH, "Sopa"),
  cookChoice: "user-beto",
  cookLabel: "Beto",
};

const renderPlanner = () => {
  render(<MealPlanner />);
  return createMealPlannerPage();
};

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useToday).mockReturnValue(new Date(2026, 9, 14));
  vi.mocked(isHouseholdMember).mockResolvedValue(true);
  vi.mocked(getDateListOptions).mockResolvedValue([]);
  vi.mocked(getMealPlan).mockResolvedValue([PERSONAL_LUNCH]);
  vi.mocked(getHouseholdMealPlan).mockResolvedValue([FAMILY_LUNCH]);
  vi.mocked(getHouseholdRecipeOptions).mockResolvedValue([]);
  vi.mocked(getOtherHouseholdCooks).mockResolvedValue([{ label: "Beto", value: "user-beto" }]);
});

describe("MealPlanner: the family plan", () => {
  it("does not offer it without a family", async () => {
    vi.mocked(isHouseholdMember).mockResolvedValue(false);
    const page = renderPlanner();

    await page.waitForEnabledSlot("Almuerzo del lunes 12: Arroz, cambiar");
    expect(page.queryPlanScope()).not.toBeInTheDocument();
  });

  it("starts with the own plan and changes to the family one, with the name of the cook", async () => {
    const page = renderPlanner();
    expect(await page.findPlanOption("Mi plan")).toBeChecked();

    await page.choosePlan("Plan de la familia");

    await page.waitForEnabledSlot("Almuerzo del lunes 12: Sopa, cambiar");
    expect(page.getSlotButton("Almuerzo del lunes 12: Sopa, cambiar")).toHaveTextContent("Beto");
    expect(page.querySlotButton("Almuerzo del lunes 12: Arroz, cambiar")).not.toBeInTheDocument();
  });

  it("lets the user choose a member as cook and cannot change of plan meanwhile", async () => {
    const page = renderPlanner();
    await page.choosePlan("Plan de la familia");
    await page.waitForEnabledSlot("Almuerzo del lunes 12: Sopa, cambiar");

    await page.openSlot("Almuerzo del lunes 12: Sopa, cambiar");

    await waitFor(() => expect(page.getCookRadio("Beto")).toBeChecked());
    expect(page.queryPlanScope()).toBeDisabled();
  });

  it("says the members could not be loaded", async () => {
    vi.mocked(getOtherHouseholdCooks).mockRejectedValue(new Error("network"));
    const page = renderPlanner();
    await page.choosePlan("Plan de la familia");
    await page.waitForEnabledSlot("Almuerzo del lunes 12: Sopa, cambiar");

    await page.openSlot("Almuerzo del lunes 12: Sopa, cambiar");

    expect(await page.findDialogText("No se pudieron cargar los integrantes.")).toBeInTheDocument();
  });

  it("goes back to the own plan when there is no family any more", async () => {
    vi.mocked(getHouseholdMealPlan).mockResolvedValue(null);
    const page = renderPlanner();

    await page.choosePlan("Plan de la familia");

    expect(await page.findNotice()).toHaveTextContent("Ya no formas parte de una familia. Te mostramos tu plan.");
    expect(page.queryPlanScope()).not.toBeInTheDocument();
    await page.waitForEnabledSlot("Almuerzo del lunes 12: Arroz, cambiar");
  });

  it("adds the week of the plan on screen, and goes back to the own plan if the family is lost", async () => {
    vi.mocked(addWeekToList).mockRejectedValue({ code: "42501", hint: "plan_no_household" });
    const page = renderPlanner();
    await page.choosePlan("Plan de la familia");
    await page.waitForEnabledSlot("Almuerzo del lunes 12: Sopa, cambiar");

    await page.openAddWeek();
    await page.confirmAddWeek();

    expect(vi.mocked(addWeekToList)).toHaveBeenCalledWith(expect.objectContaining({ scope: PLAN_SCOPE.FAMILY }));
    expect(await page.findNotice()).toBeInTheDocument();
    expect(page.queryAddWeekDialog()).not.toBeInTheDocument();
  });
});
