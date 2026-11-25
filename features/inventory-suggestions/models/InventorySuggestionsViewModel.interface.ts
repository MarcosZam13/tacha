import type { InventorySuggestionCardViewModel } from "./InventorySuggestionCardViewModel.interface";

export interface InventorySuggestionsViewModel {
  // Solo es true cuando la carga terminó bien y hay al menos una sugerencia (CA-01).
  hasSuggestions: boolean;
  cards: InventorySuggestionCardViewModel[];
}
