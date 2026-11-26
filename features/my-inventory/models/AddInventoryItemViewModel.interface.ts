import type { ProductSearchOption } from "@/components/product-search/models/ProductSearchOption.interface";
import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
import type { NullableRef } from "@/types/nullable.types";

/** El producto elegido en el buscador: una presentación del catálogo. */
export interface SelectedInventoryProduct {
  variantId: string;
  productName: string;
  sizeLabel: string;
}

/** El panel "+ Agregar a mi inventario" (SCRUM-107, HU-71d CA-01). */
export interface AddInventoryItemViewModel {
  isOpen: boolean;
  open: () => void;
  cancel: () => void;
  // Buscador del catálogo (components/product-search).
  query: string;
  onQueryChange: (query: string) => void;
  options: ProductSearchOption[];
  isSearching: boolean;
  hasNoResults: boolean;
  searchErrorMessage: NullableRef<string>;
  onSelectOption: (variantId: string) => void;
  // Después de elegir: el producto, el chip opcional y agregar.
  selected: NullableRef<SelectedInventoryProduct>;
  changeProduct: () => void;
  selectedChoice: NullableRef<ShelfLifeChoiceType>;
  /** Tocar el chip elegido lo quita (como en SCRUM-103): el chip es opcional. */
  onChooseChip: (choice: ShelfLifeChoiceType) => void;
  isSaving: boolean;
  errorMessage: NullableRef<string>;
  submit: () => void;
}
