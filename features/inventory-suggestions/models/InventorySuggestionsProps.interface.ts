import type { CatalogSearchResult } from "@/types/catalog.types";

export interface InventorySuggestionsProps {
  /**
   * El ✓ (SCRUM-104): la lista agrega la presentación con su propio addItem,
   * así aparece en "Pendientes" sin recargar. true si la base la agregó.
   */
  onConfirm: (suggestion: CatalogSearchResult) => Promise<boolean>;
  /**
   * Las presentaciones pendientes en la lista que se ve. Una sugerencia de una
   * de ellas no se muestra: ya se va a comprar (y el ✓ le sumaría otra).
   */
  pendingVariantIds: string[];
}
