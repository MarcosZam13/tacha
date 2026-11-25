import { INVENTORY_SUGGESTIONS_TEXT } from "../constants/inventory-suggestions.constants";
import type { InventorySuggestionCardProps } from "./models/InventorySuggestionCardProps.interface";

const ACTION_BUTTON_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-full border font-body text-base font-semibold transition-colors";

/**
 * Una sugerencia de la fila, con el ✓ (agregar a la lista) y la ✕ (posponer)
 * de SCRUM-104 (HU-71 CA-01). Los íconos se ven; el lector de pantalla lee el
 * nombre completo ("Agregar Leche a la lista", "Descartar Leche"). Ancho fijo
 * para que se vea que la fila sigue y se puede deslizar.
 */
export const InventorySuggestionCard = ({ card }: InventorySuggestionCardProps): React.JSX.Element => (
  // relative: los nombres ocultos (sr-only, posición absoluta) quedan dentro de la tarjeta y del scroll de
  // la fila. Sin él se ubicaban respecto a la página y las tarjetas de la derecha la hacían más ancha.
  <li className="relative flex w-44 shrink-0 snap-start flex-col gap-2 rounded-tacha-card border border-tacha-border bg-tacha-surface p-3">
    <div className="flex flex-col gap-1">
      <span className="font-body text-sm font-semibold text-tacha-text">{card.productName}</span>
      <span className="font-body text-xs text-tacha-textsec">{card.sizeLabel}</span>
      <span className="font-body text-xs text-tacha-textsec">{card.lastPurchaseText}</span>
    </div>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={card.onConfirm}
        className={`${ACTION_BUTTON_CLASS} border-tacha-teal bg-tacha-teal text-white hover:bg-tacha-teal/90`}
      >
        <span aria-hidden="true">{INVENTORY_SUGGESTIONS_TEXT.CONFIRM_ICON}</span>
        <span className="sr-only">
          {`${INVENTORY_SUGGESTIONS_TEXT.CONFIRM_LABEL_PREFIX} ${card.productName} ${INVENTORY_SUGGESTIONS_TEXT.CONFIRM_LABEL_SUFFIX}`}
        </span>
      </button>
      <button
        type="button"
        onClick={card.onDismiss}
        className={`${ACTION_BUTTON_CLASS} border-tacha-border text-tacha-textsec hover:bg-tacha-chipbg/40`}
      >
        <span aria-hidden="true">{INVENTORY_SUGGESTIONS_TEXT.DISMISS_ICON}</span>
        <span className="sr-only">{`${INVENTORY_SUGGESTIONS_TEXT.DISMISS_LABEL_PREFIX} ${card.productName}`}</span>
      </button>
    </div>
  </li>
);
