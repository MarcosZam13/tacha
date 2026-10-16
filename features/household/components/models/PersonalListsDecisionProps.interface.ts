import type { NullableRef } from "@/types/nullable.types";

/** La pregunta de qué hacer con la lista personal (SCRUM-59), ya resuelta por el ViewModel. */
export interface PersonalListsDecisionProps {
  errorMessage: NullableRef<string>;
  /** Mientras guarda, las dos opciones quedan deshabilitadas. */
  isSaving: boolean;
  onKeep: () => void;
  onShare: () => void;
}
