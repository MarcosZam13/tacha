import { useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { SHELF_LIFE_TEXT } from "../constants/shelf-life.constants";
import type { ShelfLifeChoiceType } from "../constants/shelf-life.constants";
import type { ShelfLifeChipsViewModel } from "../models/ShelfLifeChipsViewModel.interface";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import { saveShelfLifeChoice } from "../services/shelf-life.service";

interface UseShelfLifeChipsParams {
  /** La compra activa; fuera de modo compra no hay chips (HU-70b CA-01). */
  activeSessionId: NullableRef<string>;
  items: ShoppingListItem[];
}

interface UseShelfLifeChipsReturn {
  chips: ShelfLifeChipsViewModel;
  /** Muestra los chips debajo de la fila que se acaba de tachar. */
  openFor: (itemId: string) => void;
}

/** Un error de guardado, con la fila a la que pertenece. */
interface ShelfLifeSaveError {
  itemId: string;
  message: string;
}

/**
 * Chips de "cuánto le va a durar" (SCRUM-103). Aparecen debajo de la última
 * fila tachada en modo compra; tachar otra los mueve a esa. No hay botón de
 * confirmar (CA-03): tocar un chip lo guarda y no tocar ninguno no cambia
 * nada (CA-02).
 *
 * Se esconden solos si la fila deja de estar tachada o se sale del modo
 * compra: se calcula con lo que hay en pantalla, sin un efecto que lo limpie.
 * El guardado y su error son de una fila: si una fila sigue guardando o falla
 * después de tachar otra, no bloquea ni ensucia los chips de la nueva.
 */
export const useShelfLifeChips = ({ activeSessionId, items }: UseShelfLifeChipsParams): UseShelfLifeChipsReturn => {
  const [openItemId, setOpenItemId] = useState<NullableRef<string>>(null);
  // Lo elegido por fila en esta pantalla. Al tachar otra fila, la anterior
  // conserva su chip en la base aunque ya no se vea.
  const [choicesByItemId, setChoicesByItemId] = useState<Record<string, NullableRef<ShelfLifeChoiceType>>>({});
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<NullableRef<ShelfLifeSaveError>>(null);

  const openItem = items.find((item) => item.id === openItemId);
  const visibleItemId = activeSessionId && openItem?.checkedAt ? openItem.id : null;
  const isSaving = visibleItemId !== null && savingItemIds.includes(visibleItemId);

  const openFor = (itemId: string): void => {
    setOpenItemId(itemId);
    // Una fila recién tachada llega a la base sin chip (063 lo borra al destachar):
    // si se había elegido uno antes de destacharla, ya no vale.
    setChoicesByItemId((choices) => ({ ...choices, [itemId]: null }));
    setSaveError((error) => (error?.itemId === itemId ? null : error));
  };

  const onChoose = (choice: ShelfLifeChoiceType): void => {
    if (!visibleItemId || isSaving) return;
    const itemId = visibleItemId;
    const previousChoice = choicesByItemId[itemId] ?? null;
    // Tocar el chip elegido lo quita.
    const nextChoice = previousChoice === choice ? null : choice;

    // Se marca antes de que responda la base: el gesto no espera (CA-03).
    setChoicesByItemId((choices) => ({ ...choices, [itemId]: nextChoice }));
    setSaveError((error) => (error?.itemId === itemId ? null : error));
    setSavingItemIds((ids) => [...ids, itemId]);
    saveShelfLifeChoice(itemId, nextChoice)
      .catch(() => {
        setChoicesByItemId((choices) => ({ ...choices, [itemId]: previousChoice }));
        setSaveError({ itemId, message: SHELF_LIFE_TEXT.SAVE_ERROR });
      })
      .finally(() => setSavingItemIds((ids) => ids.filter((id) => id !== itemId)));
  };

  return {
    chips: {
      errorMessage: saveError && saveError.itemId === visibleItemId ? saveError.message : null,
      isSaving,
      itemId: visibleItemId,
      onChoose,
      selectedChoice: visibleItemId ? (choicesByItemId[visibleItemId] ?? null) : null,
    },
    openFor,
  };
};
