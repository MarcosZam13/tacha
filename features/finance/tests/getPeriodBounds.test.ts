import { describe, expect, it } from "vitest";
import { SPENDING_PERIOD } from "../constants/finance.constants";
import { getPeriodBounds } from "../utils/getPeriodBounds";

// Fechas armadas en hora local (new Date(año, mes, día, ...)): el resultado no
// depende de la zona horaria de la máquina. Los meses van de 0 a 11.
const SUNDAY_OCT_18_AFTERNOON = new Date(2026, 9, 18, 15, 0);

describe("getPeriodBounds: day", () => {
  it("goes from today at 00:00 to tomorrow at 00:00", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.DAY, SUNDAY_OCT_18_AFTERNOON)).toEqual({
      end: new Date(2026, 9, 19),
      start: new Date(2026, 9, 18),
    });
  });

  it("starts exactly at midnight and keeps 23:59 in the same day", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.DAY, new Date(2026, 9, 19, 0, 0)).start).toEqual(new Date(2026, 9, 19));
    expect(getPeriodBounds(SPENDING_PERIOD.DAY, new Date(2026, 9, 18, 23, 59, 59)).end).toEqual(new Date(2026, 9, 19));
  });

  it("ends on January 1st when today is December 31st", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.DAY, new Date(2026, 11, 31, 20, 0))).toEqual({
      end: new Date(2027, 0, 1),
      start: new Date(2026, 11, 31),
    });
  });
});

describe("getPeriodBounds: week (Monday to Monday)", () => {
  it("puts a Sunday in the week that started the Monday before", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.WEEK, SUNDAY_OCT_18_AFTERNOON)).toEqual({
      end: new Date(2026, 9, 19),
      start: new Date(2026, 9, 12),
    });
  });

  it("starts a new week on Monday at 00:00", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2026, 9, 19, 0, 0))).toEqual({
      end: new Date(2026, 9, 26),
      start: new Date(2026, 9, 19),
    });
  });

  it("keeps a week that crosses into the next month whole", () => {
    // Lunes 29 de septiembre a domingo 5 de octubre de 2025.
    const expected = { end: new Date(2025, 9, 6), start: new Date(2025, 8, 29) };

    expect(getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2025, 8, 30, 10, 0))).toEqual(expected);
    expect(getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2025, 9, 5, 22, 0))).toEqual(expected);
  });

  it("keeps a week that crosses into the next year whole", () => {
    // Lunes 28 de diciembre de 2026 a domingo 3 de enero de 2027.
    const expected = { end: new Date(2027, 0, 4), start: new Date(2026, 11, 28) };

    expect(getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2026, 11, 31, 12, 0))).toEqual(expected);
    expect(getPeriodBounds(SPENDING_PERIOD.WEEK, new Date(2027, 0, 3, 12, 0))).toEqual(expected);
  });
});

describe("getPeriodBounds: month", () => {
  it("goes from the 1st of this month to the 1st of the next one", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.MONTH, SUNDAY_OCT_18_AFTERNOON)).toEqual({
      end: new Date(2026, 10, 1),
      start: new Date(2026, 9, 1),
    });
  });

  it("ends December on January 1st of the next year", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.MONTH, new Date(2026, 11, 31, 23, 59))).toEqual({
      end: new Date(2027, 0, 1),
      start: new Date(2026, 11, 1),
    });
  });

  it("ends February on March 1st, with 28 or 29 days", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.MONTH, new Date(2027, 1, 28, 12, 0))).toEqual({
      end: new Date(2027, 2, 1),
      start: new Date(2027, 1, 1),
    });
    expect(getPeriodBounds(SPENDING_PERIOD.MONTH, new Date(2028, 1, 29, 12, 0))).toEqual({
      end: new Date(2028, 2, 1),
      start: new Date(2028, 1, 1),
    });
  });

  it("starts exactly on the 1st at 00:00", () => {
    expect(getPeriodBounds(SPENDING_PERIOD.MONTH, new Date(2026, 10, 1, 0, 0)).start).toEqual(new Date(2026, 10, 1));
  });
});
