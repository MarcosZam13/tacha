import type { NullableRef } from "@/types/nullable.types";

/**
 * El estado de tachado de una fila, tal como lo devuelve la base al tachar o
 * destachar. Fuera de modo compra la compra y lo comprado son null.
 */
export interface ItemCheck {
  /** Cuándo se tachó (ISO, hora de la base); null = pendiente. */
  checkedAt: NullableRef<string>;
  /** En qué compra se compró (SCRUM-67); null fuera de modo compra. */
  purchaseSessionId: NullableRef<string>;
  /** Cuánto se compró de verdad (SCRUM-67); null fuera de modo compra. */
  quantityBought: NullableRef<number>;
}
