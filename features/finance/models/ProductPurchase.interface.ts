import type { NullableRef } from "@/types/nullable.types";

/**
 * Una compra cerrada propia que incluye el producto elegido (SCRUM-93, CA-02 y
 * regla 89), tal como la entrega el servicio.
 */
export interface ProductPurchase {
  /** Cuántas filas del producto hay en esta compra (D29): 1 como mínimo. */
  appearanceCount: number;
  /** Cuándo se cerró, en ISO (UTC), como lo guarda la base. */
  closedAt: string;
  id: string;
  /** null si el supermercado no se puede leer, o si viene en blanco (regla 29). */
  storeName: NullableRef<string>;
  /** El total de la compra entera, no del producto (regla 85). null = "Sin total". */
  totalAmount: NullableRef<number>;
  /** Las presentaciones que se pueden leer, en orden alfabético. Puede estar vacía. */
  variantNames: string[];
}
