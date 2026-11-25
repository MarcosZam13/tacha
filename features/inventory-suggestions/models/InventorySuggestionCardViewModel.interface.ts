/** Lo que dibuja una tarjeta de la fila: ya con los textos armados. */
export interface InventorySuggestionCardViewModel {
  variantId: string;
  productName: string;
  sizeLabel: string;
  lastPurchaseText: string;
  /** El ✓: agrega el producto a la lista general con cantidad 1 (SCRUM-104). */
  onConfirm: () => void;
  /** La ✕: lo pospone 7 días (SCRUM-104). */
  onDismiss: () => void;
}
