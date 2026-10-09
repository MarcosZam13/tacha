import { describe, expect, it } from "vitest";
import { startOfLocalDay } from "../utils/startOfLocalDay";

describe("startOfLocalDay", () => {
  it("returns local midnight of the same day, whatever the hour", () => {
    const afternoon = new Date(2026, 9, 8, 15, 30);
    const lateNight = new Date(2026, 9, 8, 23, 59);

    // Se compara contra la medianoche local construida igual, así el test pasa
    // en cualquier zona horaria de la máquina que lo corra.
    const localMidnight = new Date(2026, 9, 8).toISOString();
    expect(startOfLocalDay(afternoon)).toBe(localMidnight);
    expect(startOfLocalDay(lateNight)).toBe(localMidnight);
  });

  it("does not change the date it receives", () => {
    const afternoon = new Date(2026, 9, 8, 15, 30);

    startOfLocalDay(afternoon);

    expect(afternoon.getHours()).toBe(15);
  });
});
