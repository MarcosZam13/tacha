import type { NullableRef } from "@/types/nullable.types";
import type { ShelfLifeChoiceType } from "../constants/shelf-life.constants";

/** Los chips de "cuánto le va a durar" de la fila recién tachada (SCRUM-103). */
export interface ShelfLifeChipsViewModel {
  /** La fila que muestra los chips; null si ninguna. */
  itemId: NullableRef<string>;
  /** El chip elegido en esa fila; null si ninguno. */
  selectedChoice: NullableRef<ShelfLifeChoiceType>;
  isSaving: boolean;
  errorMessage: NullableRef<string>;
  /** Tocar el chip elegido lo quita; tocar otro lo cambia. */
  onChoose: (choice: ShelfLifeChoiceType) => void;
}
