/**
 * El gasto de un periodo, a partir de las compras cerradas del usuario (SPEC D3).
 * Las compras sin total no suman ni cuentan como ₡0: van aparte.
 */
export interface PeriodSpending {
  /** Cuántas compras cerradas con total entraron en la suma ("Compras"). */
  closedCount: number;
  /** La suma de sus totales, en colones (puede traer centavos). */
  total: number;
  /** Cuántas compras cerradas no tienen total ("Sin total"). */
  withoutTotalCount: number;
}
