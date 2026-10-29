import type { CatalogCardData } from "@/types/catalog.types";
import type { NullableRef } from "@/types/nullable.types";
import type { MyProductsStatusType } from "../constants/my-products.constants";

// Interfaces de la pantalla "Mis productos" (SCRUM-86 / HU-55).

/** Lo que useMyProductsViewModel le entrega a MyProducts.tsx, ya calculado. */
export interface MyProductsViewModel {
  cards: CatalogCardData[];
  errorMessage: NullableRef<string>;
  /** Vuelve a pedir el listado (HU-56): lo llama quien crea un producto nuevo. */
  reload: () => void;
  status: MyProductsStatusType;
}
