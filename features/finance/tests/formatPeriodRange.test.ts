import { describe, expect, it } from "vitest";
import { SPENDING_PERIOD } from "../constants/finance.constants";
import { formatDay, formatPeriodRange } from "../utils/formatPeriodRange";
import { getPeriodBounds } from "../utils/getPeriodBounds";

const SUNDAY_OCT_18 = new Date(2026, 9, 18, 15, 0);

describe("formatPeriodRange", () => {
  it("shows a day with its weekday", () => {
    const bounds = getPeriodBounds(SPENDING_PERIOD.DAY, SUNDAY_OCT_18);

    expect(formatPeriodRange(SPENDING_PERIOD.DAY, bounds)).toBe("Domingo 18 de octubre");
  });

  it("shows a week inside one month from Monday to Sunday", () => {
    const bounds = getPeriodBounds(SPENDING_PERIOD.WEEK, SUNDAY_OCT_18);

    expect(formatPeriodRange(SPENDING_PERIOD.WEEK, bounds)).toBe("Lunes 12 a domingo 18 de octubre");
  });

  it("names both months when the week crosses into the next one", () => {
    const bounds = getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2025, 9, 1, 12, 0));

    expect(formatPeriodRange(SPENDING_PERIOD.WEEK, bounds)).toBe("Lunes 29 de septiembre a domingo 5 de octubre");
  });

  it("names both years when the week crosses into the next one", () => {
    const bounds = getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2026, 11, 31, 12, 0));

    expect(formatPeriodRange(SPENDING_PERIOD.WEEK, bounds)).toBe(
      "Lunes 28 de diciembre de 2026 a domingo 3 de enero de 2027",
    );
  });

  it("shows a month with its year", () => {
    const bounds = getPeriodBounds(SPENDING_PERIOD.MONTH, SUNDAY_OCT_18);

    expect(formatPeriodRange(SPENDING_PERIOD.MONTH, bounds)).toBe("Octubre de 2026");
  });
});

describe("formatDay", () => {
  it("shows the day of a closing time with its weekday, without the time", () => {
    expect(formatDay(new Date(new Date(2026, 9, 18, 15, 0).toISOString()))).toBe("Domingo 18 de octubre");
  });

  it("uses the local day at both sides of midnight", () => {
    expect(formatDay(new Date(new Date(2026, 9, 18, 23, 59).toISOString()))).toBe("Domingo 18 de octubre");
    expect(formatDay(new Date(new Date(2026, 9, 19, 0, 0).toISOString()))).toBe("Lunes 19 de octubre");
  });
});

describe("with a saved time zone (SCRUM-91, rule 58)", () => {
  // La misma semana, en instantes: 00:00 de Costa Rica son las 06:00 UTC y las
  // 15:00 en Tokio. Con la zona guardada no importa la del navegador.
  const COSTA_RICA_WEEK = { end: new Date("2026-10-19T06:00:00Z"), start: new Date("2026-10-12T06:00:00Z") };

  it("shows the week of the saved time zone, whatever the browser zone", () => {
    expect(formatPeriodRange(SPENDING_PERIOD.WEEK, COSTA_RICA_WEEK, "America/Costa_Rica")).toBe(
      "Lunes 12 a domingo 18 de octubre",
    );
  });

  it("shows the day and the month of the saved time zone", () => {
    const day = { end: new Date("2026-10-19T06:00:00Z"), start: new Date("2026-10-18T06:00:00Z") };
    const month = { end: new Date("2026-11-01T06:00:00Z"), start: new Date("2026-10-01T06:00:00Z") };

    expect(formatPeriodRange(SPENDING_PERIOD.DAY, day, "America/Costa_Rica")).toBe("Domingo 18 de octubre");
    expect(formatPeriodRange(SPENDING_PERIOD.MONTH, month, "America/Costa_Rica")).toBe("Octubre de 2026");
  });

  it("ends the week on the right day when the week has a daylight saving change", () => {
    // Nueva York vuelve a la hora estándar el domingo 1 de noviembre de 2026.
    const week = { end: new Date("2026-11-02T05:00:00Z"), start: new Date("2026-10-26T04:00:00Z") };

    expect(formatPeriodRange(SPENDING_PERIOD.WEEK, week, "America/New_York")).toBe(
      "Lunes 26 de octubre a domingo 1 de noviembre",
    );
  });

  it("gives a closing time the day of the saved time zone", () => {
    // Domingo 18 a las 10:00 en Costa Rica; ya es lunes 19 en Tokio.
    const closedAt = new Date("2026-10-18T16:00:00Z");

    expect(formatDay(closedAt, "America/Costa_Rica")).toBe("Domingo 18 de octubre");
    expect(formatDay(closedAt, "Asia/Tokyo")).toBe("Lunes 19 de octubre");
  });
});