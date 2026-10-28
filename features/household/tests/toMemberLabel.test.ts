import { describe, expect, it } from "vitest";
import { HOUSEHOLD_LEAVE_TEXT } from "../constants/household.constants";
import { toMemberLabel } from "../utils/toMemberLabel";

describe("toMemberLabel", () => {
  it("uses the name without extra spaces", () => {
    expect(toMemberLabel("  Beto  ")).toBe("Beto");
  });

  it("names a member without a name, or with only spaces, as «Miembro sin nombre»", () => {
    expect(toMemberLabel(null)).toBe(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER);
    expect(toMemberLabel("")).toBe(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER);
    expect(toMemberLabel("   ")).toBe(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER);
  });
});
