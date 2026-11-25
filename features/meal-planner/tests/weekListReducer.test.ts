import { describe, expect, it } from "vitest";
import { WEEK_LIST_ACTION, WEEK_LIST_DESTINATION, WEEK_LIST_STATUS } from "../constants/meal-planner.constants";
import type { WeekRange } from "../models/week-list-addition.interfaces";
import type { WeekListAction, WeekListDestination, WeekListState } from "../models/week-list-addition.types";
import { CLOSED_WEEK_LIST_STATE, GENERAL_DESTINATION, weekListReducer } from "../utils/week-list-addition.reducer";

const RANGE: WeekRange = { fromDateKey: "2026-10-12", toDateKey: "2026-10-18" };
const OTHER_RANGE: WeekRange = { fromDateKey: "2026-10-19", toDateKey: "2026-10-25" };

const BEACH: WeekListDestination = { id: "list-beach", kind: WEEK_LIST_DESTINATION.DATE_LIST, name: "Paseo a la playa" };

const CONFIRMING: WeekListState = { status: WEEK_LIST_STATUS.CONFIRMING, range: RANGE, mealCount: 5, destination: GENERAL_DESTINATION };
const ADDING: WeekListState = { status: WEEK_LIST_STATUS.ADDING, range: RANGE, mealCount: 5, destination: GENERAL_DESTINATION };
const ERROR_MESSAGE = "No se pudo agregar la semana a tu lista. Intenta de nuevo.";
const FAILED: WeekListState = {
  status: WEEK_LIST_STATUS.FAILED,
  range: RANGE,
  mealCount: 5,
  destination: GENERAL_DESTINATION,
  errorMessage: ERROR_MESSAGE,
};
const DONE: WeekListState = {
  status: WEEK_LIST_STATUS.DONE,
  range: RANGE,
  destination: GENERAL_DESTINATION,
  summaryLines: ["Agregaste 3 ingredientes."],
};

const OPEN_OTHER_WEEK: WeekListAction = { type: WEEK_LIST_ACTION.OPENED, range: OTHER_RANGE, mealCount: 2 };

describe("weekListReducer", () => {
  describe("opening", () => {
    it("asks for confirmation with the week and how many meals it has", () => {
      expect(weekListReducer(CLOSED_WEEK_LIST_STATE, { type: WEEK_LIST_ACTION.OPENED, range: RANGE, mealCount: 5 })).toEqual(
        CONFIRMING,
      );
    });

    it("replaces the notice of a previous addition", () => {
      expect(weekListReducer(DONE, OPEN_OTHER_WEEK)).toEqual({
        status: WEEK_LIST_STATUS.CONFIRMING,
        range: OTHER_RANGE,
        mealCount: 2,
        destination: GENERAL_DESTINATION,
      });
    });

    it("does not open over a confirmation, an addition in progress or an error", () => {
      expect(weekListReducer(CONFIRMING, OPEN_OTHER_WEEK)).toBe(CONFIRMING);
      expect(weekListReducer(ADDING, OPEN_OTHER_WEEK)).toBe(ADDING);
      expect(weekListReducer(FAILED, OPEN_OTHER_WEEK)).toBe(FAILED);
    });
  });

  describe("the list", () => {
    const CHOOSE_BEACH: WeekListAction = { type: WEEK_LIST_ACTION.DESTINATION_CHANGED, destination: BEACH };
    const LOSE: WeekListAction = { type: WEEK_LIST_ACTION.DESTINATION_LOST, errorMessage: "Ya no está." };

    it("changes while confirming, and leaves the error behind after a failure", () => {
      expect(weekListReducer(CONFIRMING, CHOOSE_BEACH)).toEqual({ ...CONFIRMING, destination: BEACH });
      expect(weekListReducer(FAILED, CHOOSE_BEACH)).toEqual({ ...CONFIRMING, destination: BEACH });
    });

    it("does not change while adding, when closed or with the notice", () => {
      expect(weekListReducer(ADDING, CHOOSE_BEACH)).toBe(ADDING);
      expect(weekListReducer(CLOSED_WEEK_LIST_STATE, CHOOSE_BEACH)).toBe(CLOSED_WEEK_LIST_STATE);
      expect(weekListReducer(DONE, CHOOSE_BEACH)).toBe(DONE);
    });

    it("is kept from the confirmation to the notice, and after a failure", () => {
      const adding = weekListReducer({ ...CONFIRMING, destination: BEACH }, { type: WEEK_LIST_ACTION.CONFIRMED });

      expect(adding).toEqual({ ...ADDING, destination: BEACH });
      expect(
        weekListReducer(adding, { type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: ["Agregaste 3 ingredientes."] }),
      ).toEqual({ ...DONE, destination: BEACH });
      expect(weekListReducer(adding, { type: WEEK_LIST_ACTION.FAILED, errorMessage: ERROR_MESSAGE })).toEqual({
        ...FAILED,
        destination: BEACH,
      });
    });

    it("goes back to the general list when the sublist is no longer available", () => {
      expect(weekListReducer({ ...ADDING, destination: BEACH }, LOSE)).toEqual({
        ...FAILED,
        destination: GENERAL_DESTINATION,
        errorMessage: "Ya no está.",
      });
      expect(weekListReducer(CONFIRMING, LOSE)).toBe(CONFIRMING);
    });

    it("is the general one again on the next opening", () => {
      expect(weekListReducer({ ...DONE, destination: BEACH }, OPEN_OTHER_WEEK)).toMatchObject({
        destination: GENERAL_DESTINATION,
      });
    });
  });

  describe("confirming", () => {
    it("starts adding the confirmed week", () => {
      expect(weekListReducer(CONFIRMING, { type: WEEK_LIST_ACTION.CONFIRMED })).toEqual(ADDING);
    });

    it("tries again after an error", () => {
      expect(weekListReducer(FAILED, { type: WEEK_LIST_ACTION.CONFIRMED })).toEqual(ADDING);
    });

    it("ignores a second confirmation while adding, and one from a closed dialog", () => {
      expect(weekListReducer(ADDING, { type: WEEK_LIST_ACTION.CONFIRMED })).toBe(ADDING);
      expect(weekListReducer(CLOSED_WEEK_LIST_STATE, { type: WEEK_LIST_ACTION.CONFIRMED })).toBe(CLOSED_WEEK_LIST_STATE);
    });
  });

  describe("the answer", () => {
    it("keeps the summary of the week that was added", () => {
      expect(
        weekListReducer(ADDING, { type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: ["Agregaste 3 ingredientes."] }),
      ).toEqual(DONE);
    });

    it("keeps the week and the error when it fails", () => {
      expect(weekListReducer(ADDING, { type: WEEK_LIST_ACTION.FAILED, errorMessage: ERROR_MESSAGE })).toEqual(FAILED);
    });

    it("ignores an answer that arrives when nothing is being added", () => {
      expect(weekListReducer(CLOSED_WEEK_LIST_STATE, { type: WEEK_LIST_ACTION.SUCCEEDED, summaryLines: [] })).toBe(
        CLOSED_WEEK_LIST_STATE,
      );
      expect(weekListReducer(CONFIRMING, { type: WEEK_LIST_ACTION.FAILED, errorMessage: "x" })).toBe(CONFIRMING);
    });
  });

  describe("closing", () => {
    it("closes from the confirmation and from an error", () => {
      expect(weekListReducer(CONFIRMING, { type: WEEK_LIST_ACTION.CLOSED })).toBe(CLOSED_WEEK_LIST_STATE);
      expect(weekListReducer(FAILED, { type: WEEK_LIST_ACTION.CLOSED })).toBe(CLOSED_WEEK_LIST_STATE);
    });

    it("does not close while adding", () => {
      expect(weekListReducer(ADDING, { type: WEEK_LIST_ACTION.CLOSED })).toBe(ADDING);
    });

    it("dismisses the notice of a finished addition", () => {
      expect(weekListReducer(DONE, { type: WEEK_LIST_ACTION.CLOSED })).toBe(CLOSED_WEEK_LIST_STATE);
    });
  });
});
