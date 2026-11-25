import { describe, expect, it } from "vitest";
import { validateRecipePhoto } from "../utils/validateRecipePhoto";

const FIVE_MEGABYTES = 5_242_880;

describe("validateRecipePhoto", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s up to 5 MB", (type) => {
    expect(validateRecipePhoto({ size: FIVE_MEGABYTES, type })).toBeUndefined();
  });

  it.each(["image/svg+xml", "image/gif", "image/heic", "application/pdf", "", "toString"])("rejects %s", (type) => {
    expect(validateRecipePhoto({ size: 10, type })).toBe("Elige una foto JPG, PNG o WebP.");
  });

  it("rejects an empty file and one over 5 MB", () => {
    expect(validateRecipePhoto({ size: 0, type: "image/png" })).toBe("Ese archivo está vacío. Elige otra foto.");
    expect(validateRecipePhoto({ size: FIVE_MEGABYTES + 1, type: "image/png" })).toBe(
      "La foto puede pesar hasta 5 MB.",
    );
  });
});
