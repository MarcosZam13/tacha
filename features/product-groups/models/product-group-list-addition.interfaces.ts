import type { NullableRef } from "@/types/nullable.types";
import type { ProductGroupListAdditionTarget } from "./product-group-list-addition.types";

// Interfaces de agregar un grupo a la lista (SCRUM-111). La unión de estados
// está en product-group-list-addition.types.ts.

/** Lo que devuelve add_group_to_general_list (057): nombres agregados y saltados. */
export interface AddGroupToListResponse {
  added: string[];
  /**
   * SCRUM-163: personales sin compartir que no entran a la lista de la
   * familia (el resto no los podría ver). [] si la lista no es de una familia.
   */
  personal: string[];
  /** Archivados o que el usuario ya no puede ver (con un nombre genérico). */
  skipped: string[];
}

/** El resumen o el error, para la tarjeta del grupo que se agregó. */
export interface ProductGroupAddToListFeedback {
  groupId: string;
  isError: boolean;
  messages: string[];
}

/** Lo que cada tarjeta necesita saber de la acción. */
export interface ProductGroupCardAddToList {
  feedback: NullableRef<ProductGroupAddToListFeedback>;
  /** Esta tarjeta se está agregando ahora. */
  isAdding: boolean;
  /** Hay otro grupo agregándose: un grupo a la vez. */
  isDisabled: boolean;
}

export interface ProductGroupListAdditionViewModel {
  getGroupAddToList: (groupId: string) => ProductGroupCardAddToList;
  /** "Este grupo ya no existe.", fuera de las tarjetas: la del grupo desaparece al recargar. */
  missingGroupNotice: NullableRef<string>;
  onAddToList: (group: ProductGroupListAdditionTarget) => void;
}
