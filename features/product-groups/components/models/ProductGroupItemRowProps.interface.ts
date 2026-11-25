import type { ProductGroupEditorItemRow } from "../../models/product-group-editor.interfaces";

export interface ProductGroupItemRowProps {
  item: ProductGroupEditorItemRow;
  onDecrease: (variantId: string) => void;
  onIncrease: (variantId: string) => void;
  onRemove: (variantId: string) => void;
}
