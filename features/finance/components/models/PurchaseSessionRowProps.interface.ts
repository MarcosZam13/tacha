/** Una compra del Historial, con solo lo que dibuja (SPEC §8). */
export interface PurchaseSessionRowProps {
  /** "₡15 000", "₡0" o "Sin total" (D8). */
  amountText: string;
  /** "Domingo 18 de octubre". */
  dateText: string;
  id: string;
  /** El nombre del supermercado, o "Supermercado no disponible" (regla 29). */
  storeText: string;
}
