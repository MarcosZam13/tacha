import { describe, expect, it } from "vitest";
import { calendarDaysBetween } from "../calendarDaysBetween";

// Fechas locales (sin Z): cuenta días del calendario del navegador.
const TODAY_MORNING = new Date(2026, 10, 25, 8, 0);

describe("calendarDaysBetween", () => {
  it("el mismo día es 0, aunque sean horas distintas", () => {
    expect(calendarDaysBetween(new Date(2026, 10, 25, 7, 0), new Date(2026, 10, 25, 23, 0))).toBe(0);
  });

  it("de ayer a las 11 p. m. a hoy a las 8 a. m. es 1, aunque no sean 24 horas", () => {
    expect(calendarDaysBetween(new Date(2026, 10, 24, 23, 0), TODAY_MORNING)).toBe(1);
  });

  it("cuenta días hacia adelante", () => {
    expect(calendarDaysBetween(TODAY_MORNING, new Date(2026, 11, 2, 6, 0))).toBe(7);
  });

  it("es negativo si la segunda fecha es antes", () => {
    expect(calendarDaysBetween(TODAY_MORNING, new Date(2026, 10, 20, 12, 0))).toBe(-5);
  });
});
