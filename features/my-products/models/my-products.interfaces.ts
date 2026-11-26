import type { CatalogCardData, CatalogProduct } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import type { EditablePersonalProduct } from "@/types/personal-product.types";
import type { MyProductDeletionViewModel } from "./my-product-deletion.interfaces";
import type { MyProductsStatusType } from "../constants/my-products.constants";

// Interfaces de la pantalla "Mis productos" (SCRUM-86 / HU-55).

/**
 * Un producto de "Mis productos" tal como lo devuelve listMyProducts(): lo
 * que necesita la tarjeta (CatalogProduct) más sus datos para editarlo (HU-58).
 */
export interface MyProduct extends CatalogProduct {
  editable: EditablePersonalProduct;
}

/** Una tarjeta de "Mis productos" con el producto al que apuntan sus acciones (HU-58). */
export interface MyProductCardItem {
  card: CatalogCardData;
  product: EditablePersonalProduct;
}

/** Lo que useMyProductsViewModel le entrega a MyProducts.tsx, ya calculado. */
export interface MyProductsViewModel {
  /** HU-58: el diálogo de eliminar y lo que dispara cada tarjeta. */
  deletion: MyProductDeletionViewModel;
  /** Una por variante; cada una con su producto, para editar o eliminar (HU-58). */
  items: MyProductCardItem[];
  errorMessage: NullableRef<string>;
  /** Vuelve a pedir el listado (HU-56): lo llama quien crea un producto nuevo. */
  reload: () => void;
  status: MyProductsStatusType;
}
