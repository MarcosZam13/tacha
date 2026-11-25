import type { FormEvent } from "react";
import type { ProductSearchProps } from "@/components/product-search/models/ProductSearchProps.interface";
import type { CatalogSearchResult } from "@/types/catalog.types";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type {
  ProductGroupEditorStatusType,
  ProductGroupQuantityStepType,
  ProductGroupShareVisibilityType,
} from "../constants/product-group-editor.constants";

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

/** Lo que useProductGroupEditor le da al ViewModel: el estado y una función por cambio. */
export interface UseProductGroupEditorReturn {
  addItem: (option: CatalogSearchResult) => void;
  changeName: (name: string) => void;
  changeShare: (shareWithHousehold: boolean) => void;
  removeItem: (variantId: string) => void;
  /** true si guardó; false si no pasó la validación o falló (el error queda en el estado). */
  save: () => Promise<boolean>;
  /** La casilla de compartir solo existe si el usuario tiene familia (CA-03). */
  shareVisibility: ProductGroupShareVisibilityType;
  state: ProductGroupEditorState;
  stepItemQuantity: (variantId: string, step: ProductGroupQuantityStepType) => void;
}

/** Una fila ya lista para dibujar, con sus textos accesibles armados. */
export interface ProductGroupEditorItemRow {
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  label: string;
  quantity: number;
  removeLabel: string;
  variantId: string;
}

/** Lo que useProductGroupEditorViewModel le entrega a ProductGroupEditor.tsx. */
export interface ProductGroupEditorViewModel {
  announcement: NullableRef<string>;
  isSaving: boolean;
  itemSearch: ProductSearchProps;
  items: ProductGroupEditorItemRow[];
  itemsError: NullableUndefined<string>;
  name: string;
  nameError: NullableUndefined<string>;
  onDecreaseItem: (variantId: string) => void;
  onIncreaseItem: (variantId: string) => void;
  onNameChange: (name: string) => void;
  onRemoveItem: (variantId: string) => void;
  onShareChange: (shareWithHousehold: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saveErrorMessage: NullableRef<string>;
  shareError: NullableUndefined<string>;
  shareWithHousehold: boolean;
  showShareCheckbox: boolean;
}
