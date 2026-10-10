import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MEAL_TYPE, MEAL_TYPE_LABEL } from "../constants/meal-planner.constants";
import { buildWeek } from "../utils/buildWeek";

// El 12 de octubre de 2026 es lunes.
const MONDAY = new Date(2026, 9, 12);
const WEDNESDAY = new Date(2026, 9, 14);

describe("buildWeek", () => {
  it("builds seven days from Monday to Sunday", () => {
    const week = buildWeek(MONDAY, WEDNESDAY);

    expect(week.map((day) => day.dateKey)).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("names each day with its short and long label and its number", () => {
    const week = buildWeek(MONDAY, WEDNESDAY);

    expect(week.map((day) => day.shortLabel)).toEqual([
      "Lun 12",
      "Mar 13",
      "Mié 14",
      "Jue 15",
      "Vie 16",
      "Sáb 17",
      "Dom 18",
    ]);
    expect(week[0].longLabel).toBe("Lunes 12");
    expect(week[6].longLabel).toBe("Domingo 18");
  });

  it("gives every day three empty slots: breakfast, lunch and dinner, in that order", () => {
    const week = buildWeek(MONDAY, WEDNESDAY);

    week.forEach((day) => {
      expect(day.slots).toEqual([
        { label: MEAL_TYPE_LABEL[MEAL_TYPE.BREAKFAST], mealType: MEAL_TYPE.BREAKFAST },
        { label: MEAL_TYPE_LABEL[MEAL_TYPE.LUNCH], mealType: MEAL_TYPE.LUNCH },
        { label: MEAL_TYPE_LABEL[MEAL_TYPE.DINNER], mealType: MEAL_TYPE.DINNER },
      ]);
    });
  });

  it("marks only today", () => {
    const week = buildWeek(MONDAY, WEDNESDAY);

    expect(week.filter((day) => day.isToday).map((day) => day.dateKey)).toEqual(["2026-10-14"]);
  });

  it("marks today whatever the time of day is", () => {
    const lateWednesday = new Date(2026, 9, 14, 23, 59, 59);

    const week = buildWeek(MONDAY, lateWednesday);

    expect(week[2].isToday).toBe(true);
  });

  it("marks nobody when today is outside the week", () => {
    const nextWeek = new Date(2026, 9, 19);

    const week = buildWeek(MONDAY, nextWeek);

    expect(week.some((day) => day.isToday)).toBe(false);
  });

  it("crosses a month change", () => {
    const week = buildWeek(new Date(2026, 8, 28), WEDNESDAY);

    expect(week.map((day) => day.dateKey)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("crosses a year change", () => {
    const week = buildWeek(new Date(2025, 11, 29), WEDNESDAY);

    expect([week[0].dateKey, week[3].dateKey, week[6].dateKey]).toEqual(["2025-12-29", "2026-01-01", "2026-01-04"]);
    expect(week[3].shortLabel).toBe("Jue 1");
  });

  it("includes the leap day", () => {
    const week = buildWeek(new Date(2028, 1, 28), WEDNESDAY);

    expect(week.map((day) => day.dateKey)).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
      "2028-03-02",
      "2028-03-03",
      "2028-03-04",
      "2028-03-05",
    ]);
  });

  it("names the days from their own date, not from their position", () => {
    // Un miércoles como inicio: el primer día se llama miércoles, no lunes.
    const week = buildWeek(WEDNESDAY, WEDNESDAY);

    expect(week[0].shortLabel).toBe("Mié 14");
    expect(week[5].shortLabel).toBe("Lun 19");
  });

  describe("across a daylight saving change", () => {
    const originalTimeZone = process.env.TZ;

    // Nueva York retrasa el reloj el domingo 1 de noviembre de 2026: ese día
    // tiene 25 horas. Costa Rica no usa hora de verano, pero la función no
    // tiene que depender de eso.
    beforeAll(() => {
      process.env.TZ = "America/New_York";
    });

    afterAll(() => {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    });

    it("keeps seven consecutive days", () => {
      const week = buildWeek(new Date(2026, 9, 26), new Date(2026, 9, 28));

      expect(week.map((day) => day.dateKey)).toEqual([
        "2026-10-26",
        "2026-10-27",
        "2026-10-28",
        "2026-10-29",
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
      ]);
    });
  });
});
