import { describe, expect, it } from "vitest";
import { toLastPurchaseText } from "../utils/toLastPurchaseText";

// Fechas locales (sin Z): el texto cuenta días del calendario del navegador.
const NOW = new Date(2026, 10, 24, 9, 0);

describe("toLastPurchaseText", () => {
  it("dice hoy si se compró hoy", () => {
    expect(toLastPurchaseText(new Date(2026, 10, 24, 7, 30).toISOString(), NOW)).toBe("Lo compraste hoy");
  });

  it("dice hace 1 día si se compró ayer, aunque no hayan pasado 24 horas", () => {
    expect(toLastPurchaseText(new Date(2026, 10, 23, 23, 0).toISOString(), NOW)).toBe("Lo compraste hace 1 día");
  });

  it("cuenta los días del calendario", () => {
    expect(toLastPurchaseText(new Date(2026, 10, 15, 18, 0).toISOString(), NOW)).toBe("Lo compraste hace 9 días");
  });

  it("no muestra días negativos si el reloj del navegador va atrasado", () => {
    expect(toLastPurchaseText(new Date(2026, 10, 25, 8, 0).toISOString(), NOW)).toBe("Lo compraste hoy");
  });
});
