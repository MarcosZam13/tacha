import { describe, expect, it } from "vitest";
import { toLocalDateKey } from "../utils/toLocalDateKey";
import { getWeekStart } from "../utils/getWeekStart";

// El 12 de octubre de 2026 es lunes y el 18 es domingo.
const weekStartKeyOf = (date: Date): string => toLocalDateKey(getWeekStart(date));

describe("getWeekStart", () => {
  it("goes back to the Monday from the middle of the week", () => {
    expect(weekStartKeyOf(new Date(2026, 9, 14))).toBe("2026-10-12");
  });

  it("keeps a Monday as it is", () => {
    expect(weekStartKeyOf(new Date(2026, 9, 12))).toBe("2026-10-12");
  });

  it("puts a Sunday in the week that started the Monday before", () => {
    expect(weekStartKeyOf(new Date(2026, 9, 18))).toBe("2026-10-12");
  });

  it("starts the next week the day after Sunday", () => {
    expect(weekStartKeyOf(new Date(2026, 9, 19))).toBe("2026-10-19");
  });

  it("drops the time of day and returns local midnight", () => {
    const weekStart = getWeekStart(new Date(2026, 9, 18, 23, 59, 59));

    expect([weekStart.getHours(), weekStart.getMinutes(), weekStart.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("crosses back over a month change", () => {
    // Jueves 1 de octubre: su lunes es el 28 de septiembre.
    expect(weekStartKeyOf(new Date(2026, 9, 1))).toBe("2026-09-28");
  });

  it("crosses back over a year change", () => {
    // Jueves 1 de enero de 2026: su lunes es el 29 de diciembre de 2025.
    expect(weekStartKeyOf(new Date(2026, 0, 1))).toBe("2025-12-29");
  });

  it("crosses back over the leap day", () => {
    // Miércoles 1 de marzo de 2028: su lunes es el 28 de febrero.
    expect(weekStartKeyOf(new Date(2028, 2, 1))).toBe("2028-02-28");
  });

  it("does not change the date it receives", () => {
    const date = new Date(2026, 9, 14);

    getWeekStart(date);

    expect(toLocalDateKey(date)).toBe("2026-10-14");
  });
});
