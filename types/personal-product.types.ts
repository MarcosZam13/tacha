import type { CatalogBaseUnitType } from "@/constants";
import type { StoreSlug } from "@/constants/stores.constants";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Lo que hace falta para abrir el formulario de producto en modo edición
 * (SCRUM-89 / HU-58): los datos actuales del producto personalizado, ya
 * adaptados. Lo arma "Mis productos" al listar y lo recibe
 * useCreateProductForm.onOpenEdit. Compartido porque lo usan una feature
 * (features/my-products) y un hook compartido (hooks/useCreateProductForm).
 */
export interface EditablePersonalProduct {
  baseQuantity: number;
  baseUnit: CatalogBaseUnitType;
  /** null si el producto no tiene marca. */
  brandName: NullableRef<string>;
  /** Vacío si la fila no tiene categoría (no debería pasar: create_personal_product la exige). */
  categoryId: string;
  name: string;
  productId: string;
  /** HU-57: precio de referencia, o null si no tiene. */
  referencePrice: NullableRef<number>;
  /** HU-57: tienda escrita a mano. Nunca junto con referenceStoreSlug. */
  referenceStoreName: NullableRef<string>;
  /** HU-57: uno de los supermercados. Nunca junto con referenceStoreName. */
  referenceStoreSlug: NullableRef<StoreSlug>;
}
