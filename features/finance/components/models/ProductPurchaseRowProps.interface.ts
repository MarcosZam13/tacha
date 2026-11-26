import type { NullableRef } from "@/types/nullable.types";
import type { ProductPurchaseDetailProps } from "./ProductPurchaseDetailProps.interface";

/** Un producto de la lista, con solo lo que dibuja (SPEC §8 y §9). */
export interface ProductPurchaseRowProps {
  /** "Leche, 4 veces": el nombre completo del botón (SPEC §9). */
  accessibleName: string;
  /** "1 vez" / "4 veces". */
  countText: string;
  /** El detalle abierto, si es este producto; null si no (D32). */
  detail: NullableRef<ProductPurchaseDetailProps>;
  id: string;
  isExpanded: boolean;
  /** true = "Producto no disponible" (regla 96): se escribe en otro tono. */
  isUnavailable: boolean;
  nameText: string;
  onToggle: () => void;
}
