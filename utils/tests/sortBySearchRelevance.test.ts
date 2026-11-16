import { describe, expect, it } from "vitest";
import { sortBySearchRelevance } from "../sortBySearchRelevance";

const byName = (name: string): string => name;

describe("sortBySearchRelevance", () => {
  it("puts the exact name first, even when it comes last alphabetically", () => {
    const names = ["Crema de leche", "Dulces", "Leche", "Leche condensada"];

    expect(sortBySearchRelevance(names, "leche", byName)).toEqual([
      "Leche",
      "Leche condensada",
      "Crema de leche",
      "Dulces",
    ]);
  });

  it("puts names that start with the term before names with a later word that starts with it", () => {
    expect(sortBySearchRelevance(["Crema de leche", "Leche evaporada"], "lec", byName)).toEqual([
      "Leche evaporada",
      "Crema de leche",
    ]);
  });

  it("puts a word that starts with the term before a match in the middle of a word", () => {
    expect(sortBySearchRelevance(["Compostura", "Mezcla para postre"], "pos", byName)).toEqual([
      "Mezcla para postre",
      "Compostura",
    ]);
  });

  it("ignores case and accents", () => {
    expect(sortBySearchRelevance(["Barra de jabón", "Jabón"], "JABON", byName)).toEqual(["Jabón", "Barra de jabón"]);
  });

  it("keeps the incoming order inside each group", () => {
    const names = ["Leche condensada", "Leche de coco", "Leche evaporada"];

    expect(sortBySearchRelevance(names, "leche", byName)).toEqual(names);
  });

  it("returns a new array and leaves the input untouched", () => {
    const names = ["Crema de leche", "Leche"];
    const sorted = sortBySearchRelevance(names, "leche", byName);

    expect(sorted).not.toBe(names);
    expect(names).toEqual(["Crema de leche", "Leche"]);
  });

  it("keeps the order when the term is empty", () => {
    expect(sortBySearchRelevance(["B", "A"], "  ", byName)).toEqual(["B", "A"]);
  });
});
