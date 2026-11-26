import type { NullableRef } from "@/types/nullable.types";

/** Un producto que la app cree que hay en casa (SCRUM-105). */
export interface InventoryItem {
  variantId: string;
  productName: string;
  // "1000 ml", "275 g": la presentación de la última compra.
  sizeLabel: string;
  // ISO 8601. Cuándo se estima que se acaba; null si no hay fecha ("No vence" con una compra).
  expectedOutAt: NullableRef<string>;
}
