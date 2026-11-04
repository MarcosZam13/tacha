import { describe, expect, it } from "vitest";
import { DATE_LIST_STATUS } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import { insertByDate, mergeLoadedLists } from "../utils/mergeDateLists";

const buildList = (id: string, eventDate: string): DateList => ({ eventDate, id, name: id, status: DATE_LIST_STATUS.ACTIVE });

const JANUARY = buildList("enero", "2027-01-10");
const MARCH = buildList("marzo", "2027-03-10");
const CREATED = buildList("creada", "2027-02-10");

const ids = (lists: DateList[]): string[] => lists.map((list) => list.id);

describe("insertByDate", () => {
  it("places the new list by date", () => {
    expect(ids(insertByDate([JANUARY, MARCH], CREATED))).toEqual(["enero", "creada", "marzo"]);
  });

  it("leaves the new list last on the same date", () => {
    const sameDate = buildList("misma-fecha", JANUARY.eventDate);

    expect(ids(insertByDate([JANUARY, MARCH], sameDate))).toEqual(["enero", "misma-fecha", "marzo"]);
  });
});

describe("mergeLoadedLists", () => {
  it("keeps a list created while the load was in flight", () => {
    expect(ids(mergeLoadedLists([JANUARY, MARCH], [CREATED]))).toEqual(["enero", "creada", "marzo"]);
  });

  it("does not duplicate a list the load already brought", () => {
    expect(ids(mergeLoadedLists([JANUARY, CREATED], [CREATED]))).toEqual(["enero", "creada"]);
  });

  it("returns the load as is when nothing was created", () => {
    expect(ids(mergeLoadedLists([JANUARY, MARCH], []))).toEqual(["enero", "marzo"]);
  });
});
