import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
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

/** El error de una fila: solo esa fila lo muestra. */
export interface InventoryRowError {
  variantId: string;
  message: string;
}

/** "Ya se acabó" y ajustar la fecha (SCRUM-106), por fila. */
export interface InventoryItemActions {
  /** La fila con los chips abiertos; null si ninguna. */
  adjustingVariantId: NullableRef<string>;
  /** Las filas que están guardando un chip: sus botones quedan deshabilitados. */
  savingVariantIds: readonly string[];
  rowError: NullableRef<InventoryRowError>;
  /** La fila que tiene que recibir el foco (después de un chip); null si ninguna. */
  focusVariantId: NullableRef<string>;
  /** La fila avisa que ya tomó el foco. */
  onFocused: () => void;
  onUsedUp: (variantId: string) => void;
  /** Abre o cierra los chips de esa fila. */
  onToggleAdjust: (variantId: string) => void;
  onAdjust: (variantId: string, choice: ShelfLifeChoiceType) => void;
}

export interface MyInventoryViewModel {
  status: MyInventoryStatusType;
  groups: InventoryGroupViewModel[];
  errorMessage: NullableRef<string>;
  reload: () => void;
  actions: InventoryItemActions;
  /** Aviso para el lector de pantalla después de una acción ("Leche ya no está en tu inventario."). */
  announcement: string;
  /** Sube cada vez que el título tiene que recibir el foco (después de "Ya se acabó"). */
  titleFocusRequest: number;
}
