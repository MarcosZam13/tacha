"use client";

import Link from "next/link";
import { useId } from "react";
import { APP_ROUTE } from "@/constants";
import { InventorySuggestionCard } from "./components/InventorySuggestionCard";
import { INVENTORY_SUGGESTIONS_TEXT } from "./constants/inventory-suggestions.constants";
import { useInventorySuggestionsViewModel } from "./hooks/useInventorySuggestionsViewModel";

/**
 * Fila de sugerencias de inventario de la vista General (SCRUM-102, HU-70).
 * Sin sugerencias, o si la carga falla, no dibuja nada (CA-01 y CA-03).
 * La fila se recorre deslizando: scroll horizontal con snap (CA-01).
 */
export const InventorySuggestions = (): React.JSX.Element | null => {
  const viewModel = useInventorySuggestionsViewModel();
  const titleId = useId();

  if (!viewModel.hasSuggestions) return null;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="font-display text-lg font-semibold text-tacha-text">
          {INVENTORY_SUGGESTIONS_TEXT.TITLE}
        </h2>
        {/* SCRUM-105 (HU-71b CA-01): la pantalla completa, como complemento de esta fila (CA-03). */}
        <Link href={APP_ROUTE.LIST_INVENTORY} className="font-body text-sm text-tacha-teal hover:underline">
          {INVENTORY_SUGGESTIONS_TEXT.VIEW_INVENTORY}
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {viewModel.cards.map((card) => (
          <InventorySuggestionCard key={card.variantId} card={card} />
        ))}
      </ul>
    </section>
  );
};
