/** Un ajuste manual en la lista del Historial (SCRUM-91, D16), con solo lo que dibuja. */
export interface PeriodAdjustmentRowProps {
  /** "+₡5 000" o "−₡5 000": el signo en texto (SPEC §9). */
  amountText: string;
  /** "Jueves 15 de octubre": cuándo se creó. */
  dateText: string;
  id: string;
  /** "Total de la semana": en qué nivel se escribió (regla 52). */
  scopeText: string;
}
