import { describe, expect, it } from "vitest";
import { toInitials } from "../toInitials";

describe("toInitials", () => {
  it("takes the first letter of the first two words, in uppercase", () => {
    expect(toInitials("ana maría pérez")).toBe("AM");
  });

  it("uses a single letter for a single word", () => {
    expect(toInitials("Beto")).toBe("B");
  });

  it("ignores extra spaces around and between words", () => {
    expect(toInitials("  Carla    Rojas ")).toBe("CR");
  });

  it("keeps accented letters", () => {
    expect(toInitials("Ángela Úrsula")).toBe("ÁÚ");
  });

  it("returns null without a name, so the screen shows the generic icon", () => {
    expect(toInitials(null)).toBeNull();
    expect(toInitials("   ")).toBeNull();
  });
});
