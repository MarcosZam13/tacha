import type { ShelfLifeChipsViewModel } from "../../models/ShelfLifeChipsViewModel.interface";

export interface ShelfLifeChipsProps {
  chips: ShelfLifeChipsViewModel;
  /** El producto de la fila, para el nombre accesible del grupo. */
  productName: string;
}
