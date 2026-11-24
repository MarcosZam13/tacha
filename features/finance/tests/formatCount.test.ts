import { describe, expect, it } from "vitest";
import { formatProductCount, formatTimes } from "../utils/formatCount";

describe("formatTimes (rule 89: times, not purchases)", () => {
  it.each([
    [1, "1 vez"],
    [2, "2 veces"],
    [0, "0 veces"],
  ])("%s → %s", (count, text) => {
    expect(formatTimes(count)).toBe(text);
  });
});

describe("formatProductCount", () => {
  it.each([
    [1, "1 producto"],
    [12, "12 productos"],
    [0, "0 productos"],
  ])("%s → %s", (count, text) => {
    expect(formatProductCount(count)).toBe(text);
  });
});
