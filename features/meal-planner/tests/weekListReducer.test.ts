import { describe, expect, it } from "vitest";
import { WEEK_LIST_ACTION, WEEK_LIST_STATUS } from "../constants/meal-planner.constants";
import type { WeekRange } from "../models/week-list-addition.interfaces";
import type { WeekListAction, WeekListState } from "../models/week-list-addition.types";
import { CLOSED_WEEK_LIST_STATE, weekListReducer } from "../utils/week-list-addition.reducer";

const RANGE: WeekRange = { fromDateKey: "2026-10-12", toDateKey: "2026-10-18" };
const OTHER_RANGE: WeekRange = { fromDateKey: "2026-10-19", toDateKey: "2026-10-25" };

const CONFIRMING: WeekListState = { status: WEEK_LIST_STATUS.CONFIRMING, range: RANGE, mealCount: 5 };
const ADDING: WeekListState = { status: WEEK_LIST_STATUS.ADDING, range: RANGE, mealCount: 5 };
const FAILED: WeekListState = {
  status: WEEK_LIST_STATUS.FAILED,
  range: RANGE,
  mealCount: 5,
  errorMessage: "No se pudo agregar la semana a tu lista. Intenta de nuevo.",
};
const DONE: WeekListState = { status: WEEK_LIST_STATUS.DONE, range: RANGE, summaryLines: ["Agregaste 3 ingredientes."] };

const OPEN_OTHER_WEEK: WeekListAction = { type: WEEK_LIST_ACTION.OPENED, range: OTHER_RANGE, mealCount: 2 };
const reduce = (state: WeekListState, action: WeekListAction): WeekListState => weekListReducer(state, action);

describe("weekListReducer", () => {
  describe("opening", () => {
    it("asks for confirmation with the week and how many meals it has", () => {
      expect(reduce(CLOSED_WEEK_LIST_STATE, { type: WEEK_LIST_ACTION.OPENED, range: RANGE, mealCount: 5 })).toEqual(
        CONFIRMING,
      );
    });

    it("replaces the notice of a previous addition", () => {
      expect(reduce(DONE, OPEN_OTHER_WEEK)).toEqual({
        status: WEEK_LIST_STATUS.CONFIRMING,
        range: OTHER_RANGE,
        mealCount: 2,
      });
    });

    it("does not open over a confirmation, an addition in progress or an error", () => {
      expect(reduce(CONFIRMING, OPEN_OTHER_WEEK)).toBe(CONFIRMING);
      expect(reduce(ADDING, OPEN_OTHER_WEEK)).toBe(ADDING);
      expect(reduce(FAILED, OPEN_OTHER_WEEK)).toBe(FAILED);
    });
  });

  describe("confirming", () => {
    it("starts adding the confirmed week", () => {
      expect(reduce(CONFIRMING, { type: WEEK_LIST_ACTION.CONFIRMED })).toEqual(ADDING);
    });

    it("tries again after an error", () => {
      expect(reduce(FAILED, { type: WEEK_LIST_ACTION.CONFIRMED })).toEqual(ADDING);
    });

    it("ignores a second confirmation while adding, and one from a closed dialog", () => {
      expect(reduce(ADDING, { type: WEEK_LIST_ACTION.CONFIRMED })).toBe(ADDING);
      expect(reduce(CLOSED_WEEK_LIST_STATE, { type: WEEK_LIST_ACTION.CONFIRMED })).toBe(CLOSED_WEEK_LIST_STATE);
    });
  });

  describe("the answer", () => {
    it("keeps the summary of the week that was added", () => {
      expect(
        reduce(ADDING, { type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: ["Agregaste 3 ingredientes."] }),
      ).toEqual(DONE);
    });

    it("keeps the week and the error when it fails", () => {
      expect(reduce(ADDING, { type: WEEK_LIST_ACTION.FAILED, errorMessage: FAILED.errorMessage })).toEqual(FAILED);
    });

    it("ignores an answer that arrives when nothing is being added", () => {
      expect(reduce(CLOSED_WEEK_LIST_STATE, { type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: [] })).toBe(
        CLOSED_WEEK_LIST_STATE,
      );
      expect(reduce(CONFIRMING, { type: WEEK_LIST_ACTION.FAILED, errorMessage: "x" })).toBe(CONFIRMING);
    });
  });

  describe("closing", () => {
    it("closes from the confirmation and from an error", () => {
      expect(reduce(CONFIRMING, { type: WEEK_LIST_ACTION.CLOSED })).toBe(CLOSED_WEEK_LIST_STATE);
      expect(reduce(FAILED, { type: WEEK_LIST_ACTION.CLOSED })).toBe(CLOSED_WEEK_LIST_STATE);
    });

    it("does not close while adding", () => {
      expect(reduce(ADDING, { type: WEEK_LIST_ACTION.CLOSED })).toBe(ADDING);
    });

    it("dismisses the notice of a finished addition", () => {
      expect(reduce(DONE, { type: WEEK_LIST_ACTION.CLOSED })).toBe(CLOSED_WEEK_LIST_STATE);
    });
  });
});
