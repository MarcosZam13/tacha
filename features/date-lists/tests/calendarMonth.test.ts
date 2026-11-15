import { describe, expect, it } from "vitest";
import { DATE_LIST_STATUS } from "../constants/date-lists.constants";
import type { DateList } from "../models/DateList.interface";
import {
  buildCalendarDays,
  formatCalendarMonth,
  getListsOfMonth,
  shiftCalendarMonth,
  toCalendarMonth,
} from "../utils/calendarMonth";

const NOVEMBER_2026 = { monthIndex: 10, year: 2026 };
const FEBRUARY_2027 = { monthIndex: 1, year: 2027 };
const TODAY = "2026-11-15";

const makeList = (eventDate: string, id = eventDate): DateList => ({
  eventDate,
  id,
  name: `Sublista ${id}`,
  status: DATE_LIST_STATUS.ACTIVE,
});

describe("buildCalendarDays", () => {
  it("starts on Monday, with the days of the previous month", () => {
    // El 1 de noviembre de 2026 es domingo: la semana empieza el lunes 26 de octubre.
    const days = buildCalendarDays(NOVEMBER_2026, [], TODAY);

    expect(days[0]?.isoDate).toBe("2026-10-26");
    expect(days[0]?.isCurrentMonth).toBe(false);
    expect(days[6]?.isoDate).toBe("2026-11-01");
    expect(days[6]?.isCurrentMonth).toBe(true);
  });

  it("always has complete weeks", () => {
    const days = buildCalendarDays(NOVEMBER_2026, [], TODAY);

    expect(days.length % 7).toBe(0);
    expect(days.at(-1)?.isoDate).toBe("2026-12-06");
  });

  it("does not add an extra week when the month ends on Sunday", () => {
    // Febrero de 2027 empieza en lunes y termina en domingo: 4 semanas exactas.
    const days = buildCalendarDays(FEBRUARY_2027, [], TODAY);

    expect(days).toHaveLength(28);
    expect(days[0]?.isoDate).toBe("2027-02-01");
  });

  it("marks today and the past days", () => {
    const days = buildCalendarDays(NOVEMBER_2026, [], TODAY);
    const findDay = (isoDate: string) => days.find((day) => day.isoDate === isoDate);

    expect(findDay("2026-11-14")?.isPast).toBe(true);
    expect(findDay("2026-11-15")?.isToday).toBe(true);
    expect(findDay("2026-11-15")?.isPast).toBe(false);
    expect(findDay("2026-11-16")?.isPast).toBe(false);
  });

  it("puts each sublist on its own date, without the UTC shift (SPEC §5, rule 4)", () => {
    const days = buildCalendarDays(NOVEMBER_2026, [makeList("2026-11-20", "a"), makeList("2026-11-20", "b")], TODAY);

    expect(days.find((day) => day.isoDate === "2026-11-20")?.lists.map((list) => list.id)).toEqual(["a", "b"]);
    expect(days.find((day) => day.isoDate === "2026-11-19")?.lists).toEqual([]);
  });
});

describe("shiftCalendarMonth", () => {
  it("crosses the year in both directions", () => {
    expect(shiftCalendarMonth({ monthIndex: 11, year: 2026 }, 1)).toEqual({ monthIndex: 0, year: 2027 });
    expect(shiftCalendarMonth({ monthIndex: 0, year: 2027 }, -1)).toEqual({ monthIndex: 11, year: 2026 });
  });
});

describe("toCalendarMonth", () => {
  it("reads the month of the text, without the UTC shift", () => {
    expect(toCalendarMonth("2026-12-01")).toEqual({ monthIndex: 11, year: 2026 });
  });

  it("rejects a text that is not a date", () => {
    expect(() => toCalendarMonth("mañana")).toThrow();
  });
});

describe("getListsOfMonth", () => {
  it("keeps only that month, of that year", () => {
    const lists = [makeList("2026-11-30"), makeList("2026-12-01"), makeList("2027-11-30")];

    expect(getListsOfMonth(lists, NOVEMBER_2026).map((list) => list.eventDate)).toEqual(["2026-11-30"]);
  });
});

describe("formatCalendarMonth", () => {
  it("names the month and the year", () => {
    const label = formatCalendarMonth(NOVEMBER_2026);

    expect(label).toContain("noviembre");
    expect(label).toContain("2026");
  });
});
