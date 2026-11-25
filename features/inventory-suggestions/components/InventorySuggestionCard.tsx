import type { InventorySuggestionCardProps } from "./models/InventorySuggestionCardProps.interface";

/**
 * Una sugerencia de la fila. Solo lectura en SCRUM-102: confirmar (✓) y
 * descartar (✕) llegan con SCRUM-104 (HU-71). Ancho fijo para que se vea que
 * la fila sigue y se puede deslizar.
 */
export const InventorySuggestionCard = ({ card }: InventorySuggestionCardProps): React.JSX.Element => (
  <li className="flex w-44 shrink-0 snap-start flex-col gap-1 rounded-tacha-card border border-tacha-border bg-tacha-surface p-3">
    <span className="font-body text-sm font-semibold text-tacha-text">{card.productName}</span>
    <span className="font-body text-xs text-tacha-textsec">{card.sizeLabel}</span>
    <span className="font-body text-xs text-tacha-textsec">{card.lastPurchaseText}</span>
  </li>
);
