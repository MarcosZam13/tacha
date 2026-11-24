import { describe, expect, it } from "vitest";
import { formatServings } from "../utils/formatServings";

describe("formatServings", () => {
  it("uses the singular for one and the plural for the rest", () => {
    expect(formatServings(1)).toBe("1 porción");
    expect(formatServings(4)).toBe("4 porciones");
  });
});
