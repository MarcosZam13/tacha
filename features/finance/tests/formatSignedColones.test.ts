import { describe, expect, it } from "vitest";
import { formatSignedColones } from "../utils/formatSignedColones";

// Intl separa los miles con un espacio especial: se normaliza para comparar.
const toPlainSpaces = (text: string): string => text.replace(/\s/gu, " ");

describe("formatSignedColones", () => {
  it("puts the sign in text before a positive or a negative amount (SPEC §8 and §9)", () => {
    expect(toPlainSpaces(formatSignedColones(5000))).toBe("+₡5 000");
    expect(toPlainSpaces(formatSignedColones(-5000))).toBe("−₡5 000");
  });

  it("uses the typographic minus, not the hyphen", () => {
    expect(formatSignedColones(-1).startsWith("−")).toBe(true);
  });

  it("groups thousands", () => {
    expect(toPlainSpaces(formatSignedColones(1250000))).toBe("+₡1 250 000");
    expect(toPlainSpaces(formatSignedColones(-1250000))).toBe("−₡1 250 000");
  });

  it("rounds the cents of an old purchase as any amount", () => {
    expect(toPlainSpaces(formatSignedColones(-234.56))).toBe("−₡235");
    expect(toPlainSpaces(formatSignedColones(2999.5))).toBe("+₡3 000");
  });

  it("shows no sign for an amount that is seen as ₡0", () => {
    expect(formatSignedColones(0.4)).toBe("₡0");
    expect(formatSignedColones(-0.4)).toBe("₡0");
  });
});
