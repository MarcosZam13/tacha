import type { CatalogBaseUnitType } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

/** Una fila de ingrediente lista para dibujar, con su error si lo tiene. */
export interface RecipeIngredientRowViewModel {
  productId: string;
  productName: string;
  quantity: string;
  quantityError: NullableUndefined<string>;
  unit: CatalogBaseUnitType;
}
