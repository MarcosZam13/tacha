import type { NullableRef } from "@/types/nullable.types";
import type { InventorySuggestionCardViewModel } from "./InventorySuggestionCardViewModel.interface";

export interface InventorySuggestionsViewModel {
  // Solo es true cuando la carga terminó bien y queda al menos una sugerencia (CA-01).
  hasSuggestions: boolean;
  cards: InventorySuggestionCardViewModel[];
  /** Si un ✓ o una ✕ no se pudo guardar (SCRUM-104); null si no. */
  errorMessage: NullableRef<string>;
}
