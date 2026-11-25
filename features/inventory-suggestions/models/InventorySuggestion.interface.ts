/** Un producto que probablemente ya se acabó (SCRUM-102, CA-02). */
export interface InventorySuggestion {
  variantId: string;
  productName: string;
  // "1000 ml", "275 g": la presentación, como en la lista.
  sizeLabel: string;
  // ISO 8601. Cuándo se tachó por última vez en la lista general.
  lastPurchasedAt: string;
}
