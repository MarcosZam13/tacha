import type { NullableRef } from "@/types/nullable.types";
import type { InventoryGroupType, MyInventoryStatusType } from "../constants/my-inventory.constants";

/** Una fila de "Mi inventario", ya con el texto de cuánto le queda. */
export interface InventoryItemViewModel {
  variantId: string;
  productName: string;
  sizeLabel: string;
  /** "Te quedan 5 días"; null en "Sin fecha estimada" (CA-02). */
  remainingText: NullableRef<string>;
}

/** Un grupo por urgencia, solo si tiene productos. */
export interface InventoryGroupViewModel {
  group: InventoryGroupType;
  title: string;
  items: InventoryItemViewModel[];
}

export interface MyInventoryViewModel {
  status: MyInventoryStatusType;
  groups: InventoryGroupViewModel[];
  errorMessage: NullableRef<string>;
  reload: () => void;
}
