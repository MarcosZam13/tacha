// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import { useToday } from "../hooks/useToday";
import type { MealPlanEntry, RecipeOption } from "../models/meal-plan.interfaces";
import type { AddWeekToListResponse } from "../models/week-list-addition.interfaces";
import { MealPlanner } from "../MealPlanner";
import { getMealPlan, getRecipeOptions } from "../services/meal-plan.service";
import { addWeekToList } from "../services/week-list.service";
import { createMealPlannerPage } from "./MealPlanner.page";
import { createPending } from "./mealPlan.fixtures";

vi.mock("../hooks/useToday", () => ({ useToday: vi.fn() }));
const useTodayMock = vi.mocked(useToday);

// Sin Supabase real: el plan, las recetas y la lista salen de servicios simulados.
vi.mock("../services/meal-plan.service", () => ({
  clearMealSlot: vi.fn(),
  getMealPlan: vi.fn(),
  getRecipeOptions: vi.fn(),
  saveMealSlot: vi.fn(),
}));
vi.mock("../services/week-list.service", () => ({ addWeekToList: vi.fn() }));
const getMealPlanMock = vi.mocked(getMealPlan);
const getRecipeOptionsMock = vi.mocked(getRecipeOptions);
const addWeekToListMock = vi.mocked(addWeekToList);

// El 14 de octubre de 2026 es miércoles: la semana actual va del 12 al 18 y la próxima, del 19 al 25.
const WEDNESDAY = new Date(2026, 9, 14);
const FLAN: RecipeOption = { baseServings: 4, id: "recipe-flan", name: "Flan", servingsLabel: "4 porciones" };

const createPlanEntry = (id: string, dateKey: string, mealType: MealPlanEntry["mealType"]): MealPlanEntry => ({
  baseServings: 6,
  cookChoice: COOK_CHOICE.SELF,
  cookLabel: "Yo",
  dateKey,
  id,
  mealType,
  multiplierLabel: null,
  recipeId: "recipe-arroz",
  recipeName: "Arroz con leche",
  servingsMultiplier: 1,
});

// Dos comidas esta semana y una la próxima.
const PLAN: MealPlanEntry[] = [
  createPlanEntry("a", "2026-10-12", MEAL_TYPE.LUNCH),
  createPlanEntry("b", "2026-10-13", MEAL_TYPE.DINNER),
  createPlanEntry("c", "2026-10-19", MEAL_TYPE.LUNCH),
];

const RESPONSE: AddWeekToListResponse = {
  addedProductNames: ["Leche"],
  ingredientCount: 4,
  mealCount: 2,
  missingProductNames: [],
  skippedProductNames: [],
};

const EMPTY_MONDAY_BREAKFAST = "Desayuno del lunes 12, vacío, asignar";
const EMPTY_MONDAY_DINNER = "Cena del lunes 12, vacío, asignar";
const CONFIRM_THIS_WEEK = "Vas a agregar a tu lista general los ingredientes de 2 comidas (12 – 18 oct).";
const SUCCESS_LINE = "Agregaste 4 ingredientes de 2 comidas a tu lista.";

const renderPlanner = async (plan: MealPlanEntry[] = PLAN): Promise<ReturnType<typeof createMealPlannerPage>> => {
  useTodayMock.mockReturnValue(WEDNESDAY);
  getMealPlanMock.mockResolvedValue(plan);
  render(<MealPlanner />);
  const page = createMealPlannerPage();
  await page.waitForEnabledSlot(EMPTY_MONDAY_BREAKFAST);
  return page;
};

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getRecipeOptionsMock.mockResolvedValue([FLAN]);
  addWeekToListMock.mockResolvedValue(RESPONSE);
});

describe("MealPlanner: add the week to the list", () => {
  describe("the button", () => {
    it("is enabled when the week in view has meals", async () => {
      const page = await renderPlanner();

      expect(page.getAddWeekButton()).toBeEnabled();
    });

    it("is disabled when the week in view has no meals", async () => {
      const page = await renderPlanner([]);

      expect(page.getAddWeekButton()).toBeDisabled();
    });

    it("is disabled until the plan is read", async () => {
      const pendingPlan = createPending<MealPlanEntry[]>();
      getMealPlanMock.mockReturnValue(pendingPlan.promise);
      useTodayMock.mockReturnValue(WEDNESDAY);
      render(<MealPlanner />);
      const page = createMealPlannerPage();

      expect(page.getAddWeekButton()).toBeDisabled();

      pendingPlan.resolve(PLAN);
      await waitFor(() => expect(page.getAddWeekButton()).toBeEnabled());
    });

    it("follows the week in view", async () => {
      const page = await renderPlanner([PLAN[0]]);
      expect(page.getAddWeekButton()).toBeEnabled();

      await page.goToNextWeek();

      expect(page.getAddWeekButton()).toBeDisabled();
    });
  });

  describe("the confirmation", () => {
    it("asks first, with how many meals the week has, and adds nothing yet", async () => {
      const page = await renderPlanner();

      await page.openAddWeek();

      expect(page.getAddWeekMessage(CONFIRM_THIS_WEEK)).toBeInTheDocument();
      expect(addWeekToListMock).not.toHaveBeenCalled();
    });

    it("counts only the week in view", async () => {
      const page = await renderPlanner();
      await page.goToNextWeek();

      await page.openAddWeek();

      expect(
        page.getAddWeekMessage("Vas a agregar a tu lista general los ingredientes de 1 comida (19 – 25 oct)."),
      ).toBeInTheDocument();
    });

    it("cancels with the button or with Escape and changes nothing", async () => {
      const page = await renderPlanner();
      await page.openAddWeek();

      await page.cancelAddWeek();
      expect(page.queryAddWeekDialog()).not.toBeInTheDocument();

      await page.openAddWeek();
      await page.pressEscape();
      expect(page.queryAddWeekDialog()).not.toBeInTheDocument();
      expect(addWeekToListMock).not.toHaveBeenCalled();
    });

    it("gives the focus back to the button when it closes", async () => {
      const page = await renderPlanner();
      await page.openAddWeek();

      await page.cancelAddWeek();

      expect(page.getFocusedElement()).toBe(page.getAddWeekButton());
    });
  });

  describe("adding", () => {
    it("adds the week in view, closes the dialog and says how many ingredients with a link to the list", async () => {
      const page = await renderPlanner();
      await page.openAddWeek();

      await page.confirmAddWeek();

      await waitFor(() => expect(page.queryAddWeekDialog()).not.toBeInTheDocument());
      expect(addWeekToListMock).toHaveBeenCalledWith({ fromDateKey: "2026-10-12", toDateKey: "2026-10-18" });
      expect(page.getAddWeekResult(SUCCESS_LINE)).toBeInTheDocument();
      expect(page.getViewListLink()).toHaveAttribute("href", "/lista");
    });

    it("hides the notice in another week and shows it again when coming back", async () => {
      const page = await renderPlanner();
      await page.openAddWeek();
      await page.confirmAddWeek();
      await waitFor(() => expect(page.getAddWeekResult(SUCCESS_LINE)).toBeInTheDocument());

      await page.goToNextWeek();
      expect(page.queryAddWeekResult(SUCCESS_LINE)).not.toBeInTheDocument();
      expect(page.queryViewListLink()).not.toBeInTheDocument();

      await page.goToPreviousWeek();
      expect(page.getAddWeekResult(SUCCESS_LINE)).toBeInTheDocument();
    });

    it("shows it is adding and keeps the dialog open until the database answers", async () => {
      const response = createPending<AddWeekToListResponse>();
      addWeekToListMock.mockReturnValue(response.promise);
      const page = await renderPlanner();
      await page.openAddWeek();

      await page.confirmAddWeek();

      expect(page.getAddWeekConfirmButton()).toHaveTextContent("Agregando…");
      expect(page.getAddWeekConfirmButton()).toBeDisabled();
      expect(page.getAddWeekCancelButton()).toBeDisabled();

      response.resolve(RESPONSE);
      await waitFor(() => expect(page.queryAddWeekDialog()).not.toBeInTheDocument());
    });

    it("keeps the slots from opening another dialog while the confirmation is open", async () => {
      const page = await renderPlanner();

      await page.openAddWeek();

      expect(page.getSlotButton(EMPTY_MONDAY_DINNER)).toBeDisabled();
    });

    it("shows the error inside the dialog, keeps it open and adds on retry", async () => {
      addWeekToListMock.mockRejectedValueOnce(new Error("network"));
      const page = await renderPlanner();
      await page.openAddWeek();

      await page.confirmAddWeek();

      await waitFor(() =>
        expect(page.getAddWeekError()).toHaveTextContent("No se pudo agregar la semana a tu lista. Intenta de nuevo."),
      );
      expect(page.getAddWeekDialog()).toBeInTheDocument();

      await page.confirmAddWeek();

      await waitFor(() => expect(page.queryAddWeekDialog()).not.toBeInTheDocument());
      expect(addWeekToListMock).toHaveBeenCalledTimes(2);
      expect(page.getAddWeekResult(SUCCESS_LINE)).toBeInTheDocument();
    });

    it("lists what is missing to buy and what could not be added", async () => {
      addWeekToListMock.mockResolvedValue({ ...RESPONSE, missingProductNames: ["Harina"], skippedProductNames: ["Sal"] });
      const page = await renderPlanner();
      await page.openAddWeek();

      await page.confirmAddWeek();

      await waitFor(() => expect(page.getAddWeekResult("Te falta comprar: Harina")).toBeInTheDocument());
      expect(page.getAddWeekResult("No se pudieron agregar: Sal")).toBeInTheDocument();
    });
  });
});
