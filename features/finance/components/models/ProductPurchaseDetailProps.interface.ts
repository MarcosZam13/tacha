import type { ProductDetailStatusType } from "../../constants/finance.constants";

/** Una compra del detalle, con solo lo que dibuja (SPEC §8). */
export interface ProductPurchaseDetailRow {
  /** "Total de la compra: ₡15 000" o "Sin total" (regla 85, D8). Nunca un precio del producto. */
  amountText: string;
  /** "1 L, 2 L · 2 veces": las presentaciones y las apariciones en esta compra (regla 89). */
  appearanceText: string;
  /** "Domingo 18 de octubre", con la zona de la regla 87. */
  dateText: string;
  /** true si la compra no tiene total: "Sin total" va como badge, como en el Historial. */
  hasNoTotal: boolean;
  id: string;
  /** El supermercado, o "Supermercado no disponible" (regla 86). */
  storeText: string;
}

export interface ProductPurchaseDetailProps {
  /** "4 veces": el conteo del producto en la lista. */
  countText: string;
  /** El nombre accesible de la lista de compras: "Compras con Leche". */
  listLabel: string;
  onRetry: () => void;
  purchases: ProductPurchaseDetailRow[];
  status: ProductDetailStatusType;
  /** El nombre del producto, o "Producto no disponible". */
  titleText: string;
}
