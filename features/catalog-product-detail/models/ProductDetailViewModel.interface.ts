import type { CatalogBrand } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import type { ProductDetailStatusType } from "../constants/catalog-product-detail.constants";

/** Una tienda del detalle con su precio ya formateado ("₡2 300 – ₡2 500"). */
export interface ProductDetailStorePriceRow {
  priceLabel: string;
  storeName: string;
  storeSlug: NullableRef<string>;
}

/** Lo que dibuja ProductDetail, ya calculado por useProductDetailViewModel. */
export interface ProductDetailViewModel {
  /** Mensaje de "agregar a mi lista" fallido; la cantidad elegida se conserva (SPEC.md §7). */
  addErrorMessage: NullableRef<string>;
  brands: CatalogBrand[];
  canDecreaseQuantity: boolean;
  /** Error de carga o "producto no encontrado"; solo relevante en status ERROR. */
  errorMessage: NullableRef<string>;
  imageUrl: NullableRef<string>;
  /** Decide si se ofrece "Reintentar" (SPEC.md §7): no tiene sentido para un id inexistente. */
  isNotFound: boolean;
  onAddToList: () => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onRetry: () => void;
  /** Letra para el marcador cuando la variante no tiene foto (SPEC.md §5.5). */
  placeholderInitial: string;
  productName: string;
  quantity: number;
  sizeLabel: string;
  status: ProductDetailStatusType;
  storePriceRows: ProductDetailStorePriceRow[];
  /** Confirmación visual tras un "agregar" exitoso (plan.md §3.5c). */
  wasJustAdded: boolean;
}
