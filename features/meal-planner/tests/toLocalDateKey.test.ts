import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toLocalDateKey } from "../utils/toLocalDateKey";

describe("toLocalDateKey", () => {
  it("writes the local date as year, month and day", () => {
    expect(toLocalDateKey(new Date(2026, 9, 12))).toBe("2026-10-12");
  });

  it("pads one-digit months and days with a zero", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("keeps the same day from the first to the last minute", () => {
    expect(toLocalDateKey(new Date(2026, 9, 12, 0, 0, 0))).toBe("2026-10-12");
    expect(toLocalDateKey(new Date(2026, 9, 12, 23, 59, 59))).toBe("2026-10-12");
  });

  it("writes the leap day of a leap year", () => {
    expect(toLocalDateKey(new Date(2028, 1, 29))).toBe("2028-02-29");
  });

  describe("in Costa Rica (UTC-6)", () => {
    const originalTimeZone = process.env.TZ;

    // La zona se fija antes de crear cada fecha: Node la toma de process.env.TZ.
    beforeAll(() => {
      process.env.TZ = "America/Costa_Rica";
    });

    afterAll(() => {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    });

    it("still says today after 6 p.m., when UTC is already tomorrow", () => {
      // 02:00 UTC del 13 son las 8 p. m. del 12 en Costa Rica.
      const eveningInCostaRica = new Date("2026-10-13T02:00:00Z");

      expect(toLocalDateKey(eveningInCostaRica)).toBe("2026-10-12");
    });
  });
});
