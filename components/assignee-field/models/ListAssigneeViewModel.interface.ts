import type { NullableRef } from "@/types/nullable.types";
import type { AssigneeCandidate } from "./AssigneeCandidate.interface";

/** Lo que la pantalla de una lista le entrega a cada campo "Encargado" ya calculado. */
export interface ListAssigneeViewModel {
  candidates: AssigneeCandidate[];
  /** Mensaje de la última elección que falló o de un cambio ajeno, dentro del selector o junto a él. */
  errorMessage: NullableRef<string>;
  /** Con el ajuste apagado (o sin saberlo todavía) no se dibuja ningún campo. */
  isEnabled: boolean;
  nameOf: (itemId: string) => string;
  onClose: () => void;
  onOpen: (itemId: string) => void;
  /** `null` quita al encargado. */
  onSelect: (itemId: string, assigneeId: NullableRef<string>) => void;
  /** El producto con el selector abierto; solo uno a la vez. */
  openItemId: NullableRef<string>;
  /** El producto que se está guardando: todo el selector se deshabilita. */
  savingItemId: NullableRef<string>;
  selectedIdOf: (itemId: string) => NullableRef<string>;
}
