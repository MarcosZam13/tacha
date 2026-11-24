import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { ProductGroupEditorStatusType } from "../constants/product-group-editor.constants";

// Interfaces del editor de grupos (SCRUM-110 / HU-73). La unión de acciones
// del reducer está en product-group-editor.types.ts.

/** Un producto del grupo en armado: una presentación (variante) y su cantidad. */
export interface ProductGroupEditorItem {
  /** Producto personal sin compartir: un grupo compartido no puede tenerlo (regla 7). */
  isPersonal: boolean;
  productName: string;
  /** Unidades de esa presentación, de PRODUCT_GROUP_LIMIT.QUANTITY_MIN a QUANTITY_MAX. */
  quantity: number;
  sizeLabel: string;
  variantId: string;
}

export interface ProductGroupEditorValues {
  /** En el orden en que se eligieron: es la posición que guarda la base. */
  items: ProductGroupEditorItem[];
  name: string;
  shareWithHousehold: boolean;
}

/** Un error por campo; undefined = sin error. */
export interface ProductGroupEditorErrors {
  items?: NullableUndefined<string>;
  name?: NullableUndefined<string>;
  share?: NullableUndefined<string>;
}

export interface ProductGroupEditorState {
  /** Lo que anuncia el role="status" (fila agregada, sumada o quitada, o tope alcanzado). */
  announcement: NullableRef<string>;
  errors: ProductGroupEditorErrors;
  /** Algo cambió desde que se abrió: lo usa el aviso de cambios sin guardar. */
  hasChanges: boolean;
  saveErrorMessage: NullableRef<string>;
  status: ProductGroupEditorStatusType;
  values: ProductGroupEditorValues;
}
