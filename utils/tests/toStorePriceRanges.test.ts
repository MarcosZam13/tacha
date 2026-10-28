import { describe, expect, it } from "vitest";
import { toStorePriceRanges } from "../toStorePriceRanges";

describe("toStorePriceRanges", () => {
  it("groups several brands in the same store into one min–max range (CA-03)", () => {
    const ranges = toStorePriceRanges([
      { price: 1200, storeName: "Walmart" },
      { price: 1500, storeName: "Walmart" },
    ]);

    expect(ranges).toEqual([{ maxPrice: 1500, minPrice: 1200, storeName: "Walmart" }]);
  });

  it("sorts stores from cheapest to priciest by their minimum price", () => {
    const ranges = toStorePriceRanges([
      { price: 2000, storeName: "MaxiPali" },
      { price: 1000, storeName: "Walmart" },
    ]);

    expect(ranges.map((range) => range.storeName)).toEqual(["Walmart", "MaxiPali"]);
  });

  it("returns one range per store, with min and max equal, when only one brand has a price there", () => {
    const ranges = toStorePriceRanges([{ price: 900, storeName: "Mas x Menos" }]);

    expect(ranges).toEqual([{ maxPrice: 900, minPrice: 900, storeName: "Mas x Menos" }]);
  });

  it("returns an empty list without a store price", () => {
    expect(toStorePriceRanges([])).toEqual([]);
  });

  it("carries the store's slug through to its range, for whoever needs its icon", () => {
    const ranges = toStorePriceRanges([
      { price: 1200, storeName: "Walmart", storeSlug: "walmart" },
      { price: 1500, storeName: "Walmart", storeSlug: "walmart" },
    ]);

    expect(ranges).toEqual([{ maxPrice: 1500, minPrice: 1200, storeName: "Walmart", storeSlug: "walmart" }]);
  });
});
