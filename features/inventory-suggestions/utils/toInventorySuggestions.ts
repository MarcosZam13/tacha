import type { CatalogBaseUnitType } from "@/constants";
import type { Database } from "@/types/database.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import type { InventorySuggestion } from "../models/InventorySuggestion.interface";

type InventorySuggestionRow = Database["public"]["Functions"]["get_inventory_suggestions"]["Returns"][number];

/** Filas de get_inventory_suggestions → InventorySuggestion, en el mismo orden. */
export const toInventorySuggestions = (rows: InventorySuggestionRow[]): InventorySuggestion[] =>
  rows.map((row) => ({
    lastPurchasedAt: row.last_purchased_at,
    productName: row.product_name,
    // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
    sizeLabel: formatSizeLabel(row.base_quantity, row.base_unit as CatalogBaseUnitType),
    variantId: row.product_catalog_variant_id,
  }));
