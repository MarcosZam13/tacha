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
