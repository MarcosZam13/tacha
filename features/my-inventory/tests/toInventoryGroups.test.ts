import { describe, expect, it } from "vitest";
import type { InventoryItem } from "../models/InventoryItem.interface";
import { toDaysLeft } from "../utils/toDaysLeft";
import { toInventoryGroup, toInventoryGroups, toRemainingText } from "../utils/toInventoryGroups";

// Fechas locales: los días se cuentan en el calendario del navegador.
const NOW = new Date(2026, 10, 25, 9, 0);

const itemOutInDays = (productName: string, days: number | null): InventoryItem => ({
  expectedOutAt: days === null ? null : new Date(2026, 10, 25 + days, 15, 0).toISOString(),
  productName,
  sizeLabel: "1000 ml",
  variantId: `variant-${productName}`,
});

describe("toInventoryGroup (CA-01, cortes de 7 y 30 días)", () => {
  it.each([
    [0, "soon"],
    [7, "soon"],
    [8, "thisMonth"],
    [30, "thisMonth"],
    [31, "later"],
    [60, "later"],
  ])("%i días → %s", (daysLeft, group) => {
    expect(toInventoryGroup(daysLeft)).toBe(group);
  });

  it("sin fecha → sin fecha estimada", () => {
    expect(toInventoryGroup(null)).toBe("noDate");
  });
});

describe("toRemainingText (CA-02)", () => {
  it.each([
    [0, "Se acaba hoy"],
    [1, "Te queda 1 día"],
    [5, "Te quedan 5 días"],
    [60, "Te quedan 60 días"],
  ])("%i → %s", (daysLeft, text) => {
    expect(toRemainingText(daysLeft)).toBe(text);
  });
});

describe("toInventoryGroups", () => {
  it("agrupa en el orden Vence pronto, Este mes, Más adelante, Sin fecha estimada", () => {
    const groups = toInventoryGroups(
      [
        itemOutInDays("Sal", null),
        itemOutInDays("Arroz", 60),
        itemOutInDays("Leche", 3),
        itemOutInDays("Café", 20),
      ],
      NOW,
    );

    expect(groups.map((group) => group.title)).toEqual(["Vence pronto", "Este mes", "Más adelante", "Sin fecha estimada"]);
    expect(groups.map((group) => group.items.map((item) => item.productName))).toEqual([
      ["Leche"],
      ["Café"],
      ["Arroz"],
      ["Sal"],
    ]);
  });

  it("cada producto lleva cuánto le queda; sin fecha, nada", () => {
    const groups = toInventoryGroups([itemOutInDays("Leche", 3), itemOutInDays("Sal", null)], NOW);

    expect(groups[0].items[0].remainingText).toBe("Te quedan 3 días");
    expect(groups[1].items[0].remainingText).toBeNull();
  });

  it("no devuelve grupos vacíos", () => {
    const groups = toInventoryGroups([itemOutInDays("Leche", 3)], NOW);

    expect(groups.map((group) => group.group)).toEqual(["soon"]);
  });

  it("dentro de un grupo respeta el orden de la base", () => {
    const groups = toInventoryGroups([itemOutInDays("Yogur", 2), itemOutInDays("Leche", 5)], NOW);

    expect(groups[0].items.map((item) => item.productName)).toEqual(["Yogur", "Leche"]);
  });

  it("sin productos, sin grupos", () => {
    expect(toInventoryGroups([], NOW)).toEqual([]);
  });
});

describe("toDaysLeft", () => {
  it("más tarde hoy es 0 (Se acaba hoy)", () => {
    expect(toDaysLeft(new Date(2026, 10, 25, 20, 0).toISOString(), NOW)).toBe(0);
  });

  it("mañana temprano es 1, aunque falten menos de 24 horas", () => {
    expect(toDaysLeft(new Date(2026, 10, 26, 6, 0).toISOString(), NOW)).toBe(1);
  });

  it("nunca es negativo: lo pospuesto que ya pasó su fecha es 0", () => {
    expect(toDaysLeft(new Date(2026, 10, 15, 12, 0).toISOString(), NOW)).toBe(0);
  });

  it("de punta a punta: un producto que se acaba hoy sale en Vence pronto con Se acaba hoy", () => {
    const groups = toInventoryGroups([itemOutInDays("Leche", 0)], NOW);

    expect(groups[0].title).toBe("Vence pronto");
    expect(groups[0].items[0].remainingText).toBe("Se acaba hoy");
  });
});
