import type { NullableRef } from "@/types/nullable.types";
import type { ProductPurchaseTarget } from "./ProductPurchaseTarget.type";

/**
 * Un producto de la vista "Productos" (SCRUM-93, CA-01), tal como lo entrega el
 * servicio.
 */
export interface PurchasedProduct {
  /** Filas de list_items en compras cerradas propias (D29): 1 como mínimo. */
  appearanceCount: number;
  /** El closed_at más reciente, en ISO (UTC), como lo guarda la base. */
  lastPurchasedAt: string;
  /** El nombre que se muestra (D43). null = "Producto no disponible" (regla 96). */
  name: NullableRef<string>;
  /** Con qué se pide su detalle. También lo identifica en la lista. */
  target: ProductPurchaseTarget;
}
