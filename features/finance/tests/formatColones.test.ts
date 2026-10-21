import { describe, expect, it } from "vitest";
import { formatColones } from "../utils/formatColones";

// Intl separa los miles con un espacio que no es el espacio común (depende de
// la versión de ICU): se normaliza para comparar el texto que se ve.
const toPlainSpaces = (text: string): string => text.replace(/\s/gu, " ");

describe("formatColones", () => {
  it("shows colones without decimals", () => {
    expect(toPlainSpaces(formatColones(12500))).toBe("₡12 500");
    expect(toPlainSpaces(formatColones(0))).toBe("₡0");
  });

  it("rounds cents only when showing the amount", () => {
    expect(toPlainSpaces(formatColones(12500.5))).toBe("₡12 501");
    expect(toPlainSpaces(formatColones(12500.4))).toBe("₡12 500");
  });

  it("shows the largest budget the database accepts", () => {
    expect(toPlainSpaces(formatColones(9_999_999_999))).toBe("₡9 999 999 999");
  });
});
