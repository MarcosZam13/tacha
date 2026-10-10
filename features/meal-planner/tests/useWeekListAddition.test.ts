// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEAL_TYPE } from "../constants/meal-planner.constants";
import { useWeekListAddition } from "../hooks/useWeekListAddition";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { WeekDay } from "../models/meal-planner.interfaces";
import type { AddWeekToListResponse, UseWeekListAdditionParams } from "../models/week-list-addition.interfaces";
import { addWeekToList } from "../services/week-list.service";
import { createEntry, createPending } from "./mealPlan.fixtures";

vi.mock("../services/week-list.service", () => ({ addWeekToList: vi.fn() }));
const addWeekToListMock = vi.mocked(addWeekToList);

const createDay = (dateKey: string): WeekDay => ({
  dateKey,
  isToday: false,
  longLabel: dateKey,
  shortLabel: dateKey,
  slots: [
    { label: "Desayuno", mealType: MEAL_TYPE.BREAKFAST },
    { label: "Almuerzo", mealType: MEAL_TYPE.LUNCH },
    { label: "Cena", mealType: MEAL_TYPE.DINNER },
  ],
});

const THIS_WEEK = [createDay("2026-10-12"), createDay("2026-10-13"), createDay("2026-10-14")];
const NEXT_WEEK = [createDay("2026-10-19"), createDay("2026-10-20")];

const MONDAY_LUNCH = createEntry("a", "2026-10-12", MEAL_TYPE.LUNCH, "Arroz");
const TUESDAY_DINNER = createEntry("b", "2026-10-13", MEAL_TYPE.DINNER, "Sopa");

const RESPONSE: AddWeekToListResponse = {
  addedProductNames: ["Leche"],
  ingredientCount: 4,
  mealCount: 2,
  missingProductNames: [],
  skippedProductNames: [],
};

const getEntryOf =
  (entries: MealPlanEntry[]): UseWeekListAdditionParams["getEntry"] =>
  (dateKey, mealType) =>
    entries.find((entry) => entry.dateKey === dateKey && entry.mealType === mealType) ?? null;

const createParams = (overrides: Partial<UseWeekListAdditionParams> = {}): UseWeekListAdditionParams => ({
  days: THIS_WEEK,
  getEntry: getEntryOf([MONDAY_LUNCH, TUESDAY_DINNER]),
  isBlocked: false,
  isPlanReady: true,
  rangeLabel: "12 – 18 oct",
  ...overrides,
});

const renderAddition = (initialParams: UseWeekListAdditionParams = createParams()) =>
  renderHook((params: UseWeekListAdditionParams) => useWeekListAddition(params), { initialProps: initialParams });

beforeEach(() => {
  vi.resetAllMocks();
  addWeekToListMock.mockResolvedValue(RESPONSE);
});

describe("useWeekListAddition", () => {
  describe("the button", () => {
    it("is enabled when the week in view has meals and the plan is read", () => {
      const { result } = renderAddition();

      expect(result.current.canOpen).toBe(true);
    });

    it("is disabled when the week has no meals", () => {
      const { result } = renderAddition(createParams({ getEntry: () => null }));

      expect(result.current.canOpen).toBe(false);
    });

    it("is disabled while the plan is not read, and while another dialog is open", () => {
      expect(renderAddition(createParams({ isPlanReady: false })).result.current.canOpen).toBe(false);
      expect(renderAddition(createParams({ isBlocked: true })).result.current.canOpen).toBe(false);
    });

    it("is disabled while there are no days", () => {
      expect(renderAddition(createParams({ days: [] })).result.current.canOpen).toBe(false);
    });

    it("follows the week in view", () => {
      const { result, rerender } = renderAddition();
      expect(result.current.canOpen).toBe(true);

      rerender(createParams({ days: NEXT_WEEK }));

      expect(result.current.canOpen).toBe(false);
    });
  });

  describe("the confirmation", () => {
    it("asks first, with the number of meals of the week and its range", () => {
      const { result } = renderAddition();

      act(() => result.current.onOpen());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.confirmMessage).toBe(
        "Vas a agregar a tu lista general los ingredientes de 2 comidas (12 – 18 oct).",
      );
      expect(addWeekToListMock).not.toHaveBeenCalled();
    });

    it("says one meal in the singular", () => {
      const { result } = renderAddition(createParams({ getEntry: getEntryOf([MONDAY_LUNCH]) }));

      act(() => result.current.onOpen());

      expect(result.current.confirmMessage).toBe(
        "Vas a agregar a tu lista general los ingredientes de 1 comida (12 – 18 oct).",
      );
    });

    it("does not open when the button is disabled", () => {
      const { result } = renderAddition(createParams({ getEntry: () => null }));

      act(() => result.current.onOpen());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.confirmMessage).toBeNull();
    });

    it("cancels without calling the database", () => {
      const { result } = renderAddition();
      act(() => result.current.onOpen());

      act(() => result.current.onClose());

      expect(result.current.isOpen).toBe(false);
      expect(addWeekToListMock).not.toHaveBeenCalled();
    });

    it("gives the focus back to the button that opened it", () => {
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      const { result } = renderAddition();
      act(() => result.current.onOpen());
      opener.blur();

      act(() => result.current.onClose());

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });
  });

  describe("adding", () => {
    it("adds the week in view, closes the confirmation and keeps the summary", async () => {
      const { result } = renderAddition();
      act(() => result.current.onOpen());

      await act(async () => result.current.onConfirm());

      expect(addWeekToListMock).toHaveBeenCalledWith({ fromDateKey: "2026-10-12", toDateKey: "2026-10-14" });
      expect(result.current.isOpen).toBe(false);
      expect(result.current.resultLines).toEqual(["Agregaste 4 ingredientes de 2 comidas a tu lista."]);
    });

    it("shows it is adding and does not close while the database answers", async () => {
      const response = createPending<AddWeekToListResponse>();
      addWeekToListMock.mockReturnValue(response.promise);
      const { result } = renderAddition();
      act(() => result.current.onOpen());

      act(() => result.current.onConfirm());
      expect(result.current.isAdding).toBe(true);

      act(() => result.current.onClose());
      expect(result.current.isOpen).toBe(true);

      await act(async () => response.resolve(RESPONSE));
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isAdding).toBe(false);
    });

    it("sends one request when the user double clicks add", async () => {
      const response = createPending<AddWeekToListResponse>();
      addWeekToListMock.mockReturnValue(response.promise);
      const { result } = renderAddition();
      act(() => result.current.onOpen());

      act(() => {
        result.current.onConfirm();
        result.current.onConfirm();
      });

      expect(addWeekToListMock).toHaveBeenCalledTimes(1);
      await act(async () => response.resolve(RESPONSE));
    });

    it("keeps the confirmation open with the error when the database fails, and adds on retry", async () => {
      addWeekToListMock.mockRejectedValueOnce(new Error("network"));
      const { result } = renderAddition();
      act(() => result.current.onOpen());

      await act(async () => result.current.onConfirm());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.errorMessage).toBe("No se pudo agregar la semana a tu lista. Intenta de nuevo.");
      expect(result.current.resultLines).toBeNull();

      await act(async () => result.current.onConfirm());

      expect(addWeekToListMock).toHaveBeenCalledTimes(2);
      expect(result.current.isOpen).toBe(false);
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.resultLines).not.toBeNull();
    });

    it("sends the week that was confirmed even if the view changes before the answer", async () => {
      const response = createPending<AddWeekToListResponse>();
      addWeekToListMock.mockReturnValue(response.promise);
      const { result, rerender } = renderAddition();
      act(() => result.current.onOpen());
      act(() => result.current.onConfirm());

      rerender(createParams({ days: NEXT_WEEK, getEntry: () => null }));
      await act(async () => response.resolve(RESPONSE));

      expect(addWeekToListMock).toHaveBeenCalledWith({ fromDateKey: "2026-10-12", toDateKey: "2026-10-14" });
    });
  });

  describe("the notice", () => {
    it("only shows for the week that was added", async () => {
      const { result, rerender } = renderAddition();
      act(() => result.current.onOpen());
      await act(async () => result.current.onConfirm());
      expect(result.current.resultLines).not.toBeNull();

      rerender(createParams({ days: NEXT_WEEK, getEntry: getEntryOf([createEntry("n", "2026-10-19", MEAL_TYPE.LUNCH, "Flan")]) }));
      expect(result.current.resultLines).toBeNull();

      rerender(createParams());
      expect(result.current.resultLines).not.toBeNull();
    });

    it("goes away when the confirmation is opened again", async () => {
      const { result } = renderAddition();
      act(() => result.current.onOpen());
      await act(async () => result.current.onConfirm());

      act(() => result.current.onOpen());

      expect(result.current.resultLines).toBeNull();
      expect(result.current.isOpen).toBe(true);
    });

    it("says there were no meals when the database finds none", async () => {
      addWeekToListMock.mockResolvedValue({ ...RESPONSE, addedProductNames: [], ingredientCount: 0, mealCount: 0 });
      const { result } = renderAddition();
      act(() => result.current.onOpen());

      await act(async () => result.current.onConfirm());

      expect(result.current.resultLines).toEqual(["No había comidas planeadas esta semana."]);
    });
  });
});
