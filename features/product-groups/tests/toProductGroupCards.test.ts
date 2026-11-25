import { describe, expect, it } from "vitest";
import { toProductGroupCards } from "../utils/toProductGroupCards";

describe("toProductGroupCards", () => {
  it("uses the singular for one product and the plural otherwise", () => {
    const cards = toProductGroupCards([
      { id: "group-0", isShared: false, name: "Vacío", productCount: 0 },
      { id: "group-1", isShared: false, name: "Uno", productCount: 1 },
      { id: "group-2", isShared: false, name: "Varios", productCount: 8 },
    ]);

    expect(cards.map((card) => card.countLabel)).toEqual(["0 productos", "1 producto", "8 productos"]);
  });

  it("keeps the id, name and shared flag of each group, in the same order", () => {
    const cards = toProductGroupCards([
      { id: "group-1", isShared: true, name: "Desayunos", productCount: 2 },
      { id: "group-2", isShared: false, name: "Mercado", productCount: 3 },
    ]);

    expect(cards).toEqual([
      { countLabel: "2 productos", id: "group-1", isShared: true, name: "Desayunos" },
      { countLabel: "3 productos", id: "group-2", isShared: false, name: "Mercado" },
    ]);
  });
});
