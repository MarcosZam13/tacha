import { describe, expect, it } from "vitest";
import type { DateListItem } from "../models/DateList.interface";
import { sortPendingFirst } from "../utils/sortPendingFirst";

const buildItem = (id: string, isChecked: boolean): DateListItem => ({
  id,
  isChecked,
  productName: id,
  quantity: 1,
  sizeLabel: "1 kg",
  variantId: id,
});

describe("sortPendingFirst", () => {
  it("puts the pending items before the checked ones and keeps each group's order", () => {
    const items = [buildItem("a", true), buildItem("b", false), buildItem("c", true), buildItem("d", false)];

    expect(sortPendingFirst(items).map((item) => item.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not change the original list", () => {
    const items = [buildItem("a", true), buildItem("b", false)];

    sortPendingFirst(items);

    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
