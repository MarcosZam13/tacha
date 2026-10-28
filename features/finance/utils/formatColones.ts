import { PRICE_FORMAT } from "@/constants";

// Se crea una vez: armar un Intl.NumberFormat en cada llamada es lo caro.
const colonesFormatter = new Intl.NumberFormat(PRICE_FORMAT.LOCALE, {
  currency: PRICE_FORMAT.CURRENCY,
  maximumFractionDigits: PRICE_FORMAT.MAX_FRACTION_DIGITS,
  style: "currency",
});

/**
 * 12500 → "₡12 500": colones sin decimales, como los precios del catálogo. Los
 * centavos de una suma se redondean solo acá, al mostrar (SPEC regla 11).
 */
export const formatColones = (amount: number): string => colonesFormatter.format(amount);
