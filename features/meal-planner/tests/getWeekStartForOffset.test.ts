import { describe, expect, it } from "vitest";
import { WEEK_OFFSET } from "../constants/meal-planner.constants";
import { getWeekStartForOffset } from "../utils/getWeekStartForOffset";
import { toLocalDateKey } from "../utils/toLocalDateKey";

// El 14 de octubre de 2026 es miércoles; su lunes es el 12.
const WEDNESDAY = new Date(2026, 9, 14);

describe("getWeekStartForOffset", () => {
  it("returns the Monday of the current week for the current offset", () => {
    expect(toLocalDateKey(getWeekStartForOffset(WEDNESDAY, WEEK_OFFSET.CURRENT))).toBe("2026-10-12");
  });

  it("returns the Monday after for the next offset", () => {
    expect(toLocalDateKey(getWeekStartForOffset(WEDNESDAY, WEEK_OFFSET.NEXT))).toBe("2026-10-19");
  });

  it("crosses a month change when going to the next week", () => {
    // Miércoles 30 de septiembre: la próxima semana empieza el lunes 5 de octubre.
    expect(toLocalDateKey(getWeekStartForOffset(new Date(2026, 8, 30), WEEK_OFFSET.NEXT))).toBe("2026-10-05");
  });

  it("crosses a year change when going to the next week", () => {
    // Miércoles 31 de diciembre de 2025: la próxima semana empieza el lunes 5 de enero.
    expect(toLocalDateKey(getWeekStartForOffset(new Date(2025, 11, 31), WEEK_OFFSET.NEXT))).toBe("2026-01-05");
  });

  it("uses the week that ends today when today is a Sunday", () => {
    // Domingo 18 de octubre: su semana empezó el 12, y la próxima empieza el 19.
    const sunday = new Date(2026, 9, 18);

    expect(toLocalDateKey(getWeekStartForOffset(sunday, WEEK_OFFSET.CURRENT))).toBe("2026-10-12");
    expect(toLocalDateKey(getWeekStartForOffset(sunday, WEEK_OFFSET.NEXT))).toBe("2026-10-19");
  });
});
