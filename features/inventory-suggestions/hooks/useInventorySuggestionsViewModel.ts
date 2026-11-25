import { useEffect, useState } from "react";
import type { InventorySuggestion } from "../models/InventorySuggestion.interface";
import type { InventorySuggestionsViewModel } from "../models/InventorySuggestionsViewModel.interface";
import { getInventorySuggestions } from "../services/inventory-suggestions.service";
import { toLastPurchaseText } from "../utils/toLastPurchaseText";

/**
 * Fila de sugerencias de la vista General. Se pide una vez al montar
 * (servicio + efecto, nextjs-enterprise-patterns §3).
 *
 * Si la carga falla no se muestra nada (CA-03): las sugerencias son un extra y
 * la lista tiene que seguir funcionando igual, sin un error que la tape.
 */
export const useInventorySuggestionsViewModel = (): InventorySuggestionsViewModel => {
  const [suggestions, setSuggestions] = useState<InventorySuggestion[]>([]);

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

  const now = new Date();

  return {
    cards: suggestions.map((suggestion) => ({
      lastPurchaseText: toLastPurchaseText(suggestion.lastPurchasedAt, now),
      productName: suggestion.productName,
      sizeLabel: suggestion.sizeLabel,
      variantId: suggestion.variantId,
    })),
    hasSuggestions: suggestions.length > 0,
  };
};
