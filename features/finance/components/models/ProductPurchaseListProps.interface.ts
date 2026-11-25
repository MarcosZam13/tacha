import type { ProductListStatusType, ProductMoreStatusType } from "../../constants/finance.constants";
import type { ProductPurchaseRowProps } from "./ProductPurchaseRowProps.interface";

/** La lista de productos con "Cargar más" (CA-01, D35). */
export interface ProductPurchaseListProps {
  hasMore: boolean;
  moreStatus: ProductMoreStatusType;
  onLoadMore: () => void;
  /** Reintenta el primer bloque. */
  onRetry: () => void;
  /** Reintenta "Cargar más" sin perder lo cargado. */
  onRetryMore: () => void;
  rows: ProductPurchaseRowProps[];
  status: ProductListStatusType;
}
