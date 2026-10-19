import { describe, expect, it } from "vitest";
import { toMemberInitials } from "../utils/toMemberInitials";

describe("toMemberInitials", () => {
  it("takes the first letter of the first two words, in uppercase", () => {
    expect(toMemberInitials("ana maría pérez")).toBe("AM");
  });

  it("uses a single letter for a single word", () => {
    expect(toMemberInitials("Beto")).toBe("B");
  });

  it("ignores extra spaces around and between words", () => {
    expect(toMemberInitials("  Carla    Rojas ")).toBe("CR");
  });

  it("keeps accented letters", () => {
    expect(toMemberInitials("Ángela Úrsula")).toBe("ÁÚ");
  });

  it("returns null without a name, so the screen shows the generic icon", () => {
    expect(toMemberInitials(null)).toBeNull();
    expect(toMemberInitials("   ")).toBeNull();
  });
});
