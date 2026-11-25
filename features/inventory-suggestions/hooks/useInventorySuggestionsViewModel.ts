import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { INVENTORY_SUGGESTIONS_TEXT } from "../constants/inventory-suggestions.constants";
import type { InventorySuggestion } from "../models/InventorySuggestion.interface";
import type { InventorySuggestionsProps } from "../models/InventorySuggestionsProps.interface";
import type { InventorySuggestionsViewModel } from "../models/InventorySuggestionsViewModel.interface";
import { dismissInventorySuggestion, getInventorySuggestions } from "../services/inventory-suggestions.service";
import { toLastPurchaseText } from "../utils/toLastPurchaseText";

/**
 * Fila de sugerencias de la vista General. Se pide una vez al montar
 * (servicio + efecto, nextjs-enterprise-patterns §3).
 *
 * Si la carga falla no se muestra nada (CA-03 de HU-70): las sugerencias son
 * un extra y la lista tiene que seguir funcionando igual, sin un error que la
 * tape.
 *
 * El ✓ y la ✕ (SCRUM-104) sacan la tarjeta enseguida, sin esperar a la base;
 * si falla, la tarjeta vuelve y se muestra un mensaje dentro de la fila. Nada
 * de esto bloquea el resto de la pantalla (CA-04).
 */
export const useInventorySuggestionsViewModel = ({
  onConfirm,
  pendingVariantIds,
}: InventorySuggestionsProps): InventorySuggestionsViewModel => {
  const [suggestions, setSuggestions] = useState<InventorySuggestion[]>([]);
  // Las tarjetas con un ✓ o una ✕ en curso o ya hecho, por presentación.
  const [handledVariantIds, setHandledVariantIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);

  useEffect(() => {
    let isCancelled = false;

    getInventorySuggestions()
      .then((loadedSuggestions) => {
        if (!isCancelled) setSuggestions(loadedSuggestions);
      })
      .catch(() => {
        if (!isCancelled) setSuggestions([]);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const hide = (variantId: string): void => {
    setErrorMessage(null);
    setHandledVariantIds((ids) => [...ids, variantId]);
  };

  const restore = (variantId: string): void => {
    setHandledVariantIds((ids) => ids.filter((id) => id !== variantId));
    setErrorMessage(INVENTORY_SUGGESTIONS_TEXT.ACTION_ERROR);
  };

  // ✓: la lista agrega la presentación de la última compra con cantidad 1 (CA-02).
  const confirm = (suggestion: InventorySuggestion): void => {
    hide(suggestion.variantId);
    void onConfirm({
      productName: suggestion.productName,
      sizeLabel: suggestion.sizeLabel,
      variantId: suggestion.variantId,
    }).then(
      (wasAdded) => {
        if (!wasAdded) restore(suggestion.variantId);
      },
      // addItem no rechaza (devuelve false), pero si algún día lo hiciera la tarjeta no queda oculta para siempre.
      () => restore(suggestion.variantId),
    );
  };

  // ✕: se pospone 7 días; el historial no cambia (CA-03).
  const dismiss = (suggestion: InventorySuggestion): void => {
    hide(suggestion.variantId);
    dismissInventorySuggestion(suggestion.variantId).catch(() => restore(suggestion.variantId));
  };

  const now = new Date();
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      !handledVariantIds.includes(suggestion.variantId) && !pendingVariantIds.includes(suggestion.variantId),
  );

  return {
    cards: visibleSuggestions.map((suggestion) => ({
      lastPurchaseText: toLastPurchaseText(suggestion.lastPurchasedAt, now),
      onConfirm: () => confirm(suggestion),
      onDismiss: () => dismiss(suggestion),
      productName: suggestion.productName,
      sizeLabel: suggestion.sizeLabel,
      variantId: suggestion.variantId,
    })),
    errorMessage,
    // Con un error a la vista la fila se queda, aunque ya no queden tarjetas.
    hasSuggestions: visibleSuggestions.length > 0 || errorMessage !== null,
  };
};
