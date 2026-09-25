import type { CatalogBaseUnitType } from "../constants/shopping-list.constants";

/**
 * Forma de cada elemento de `variants` (jsonb) que devuelve la RPC
 * search_catalog. Solo los campos que usa esta feature; se ignoran brands
 * y price_ranges.
 */
export interface CatalogSearchVariant {
  base_quantity: number;
  base_unit: CatalogBaseUnitType;
  variant_id: string;
}
