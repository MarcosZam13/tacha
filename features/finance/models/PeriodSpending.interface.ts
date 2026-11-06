/**
 * El gasto de un periodo, a partir de las compras cerradas del usuario (SPEC D3)
 * y de los ajustes manuales que cuentan en él (SCRUM-91, regla 49). Las compras
 * sin total no suman ni cuentan como ₡0: van aparte.
 */
export interface PeriodSpending {
  /** Cuántos ajustes manuales entraron en la suma. No son compras (§8). */
  adjustmentCount: number;
  /** Cuántas compras cerradas con total entraron en la suma ("Compras"). */
  closedCount: number;
  /** Compras con total más ajustes, en colones (puede traer centavos). */
  total: number;
  /** Cuántas compras cerradas no tienen total ("Sin total"). */
  withoutTotalCount: number;
}
