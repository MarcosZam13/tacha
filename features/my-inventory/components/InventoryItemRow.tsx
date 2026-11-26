import { useEffect, useId, useRef } from "react";
import { ShelfLifeChips } from "@/features/shopping-list/components/ShelfLifeChips";
import { MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import type { InventoryItemRowProps } from "./models/InventoryItemRowProps.interface";

// min-h-10 (40 px): en el celular los dos botones van juntos y tienen que poder tocarse sin errar.
const ACTION_BUTTON_CLASS =
  "min-h-10 rounded-tacha-badge border px-3 font-body text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-50";

// "Ya se acabó: Leche". Empieza con el texto visible, así quien usa control por voz lo nombra igual.
const toActionLabel = (action: string, productName: string): string =>
  `${action}${MY_INVENTORY_TEXT.ACTION_LABEL_SEPARATOR} ${productName}`;

/**
 * Un producto de "Mi inventario": nombre, presentación y cuánto le queda
 * (SCRUM-105), con "Ajustar fecha" y "Ya se acabó" (SCRUM-106, CA-01 y CA-02).
 * "Ajustar fecha" abre debajo los mismos chips que al tachar (HU-70b). Los
 * botones dicen la acción; el lector de pantalla lee también el producto.
 * Después de un chip, la fila (ya en su grupo nuevo) recibe el foco en
 * "Ajustar fecha", así el teclado no vuelve al principio de la página.
 */
export const InventoryItemRow = ({ actions, item }: InventoryItemRowProps): React.JSX.Element => {
  const chipsId = useId();
  const adjustButtonRef = useRef<HTMLButtonElement>(null);
  const isAdjusting = actions.adjustingVariantId === item.variantId;
  const isSaving = actions.savingVariantIds.includes(item.variantId);
  const errorMessage = actions.rowError?.variantId === item.variantId ? actions.rowError.message : null;
  const shouldFocus = actions.focusVariantId === item.variantId;
  const { onFocused } = actions;

  useEffect(() => {
    if (!shouldFocus) return;
    adjustButtonRef.current?.focus();
    onFocused();
  }, [shouldFocus, onFocused]);

  return (
    <li className="flex flex-col gap-2 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-body text-sm font-semibold text-tacha-text">{item.productName}</span>
          <span className="font-body text-xs text-tacha-textsec">{item.sizeLabel}</span>
        </div>
        {item.remainingText ? (
          <span className="shrink-0 font-body text-xs text-tacha-textsec">{item.remainingText}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          ref={adjustButtonRef}
          type="button"
          aria-label={toActionLabel(MY_INVENTORY_TEXT.ADJUST, item.productName)}
          aria-expanded={isAdjusting}
          aria-controls={chipsId}
          disabled={isSaving}
          onClick={() => actions.onToggleAdjust(item.variantId)}
          className={`${ACTION_BUTTON_CLASS} border-tacha-teal text-tacha-teal hover:bg-tacha-teal/10`}
        >
          {MY_INVENTORY_TEXT.ADJUST}
        </button>
        <button
          type="button"
          aria-label={toActionLabel(MY_INVENTORY_TEXT.USED_UP, item.productName)}
          disabled={isSaving}
          onClick={() => actions.onUsedUp(item.variantId)}
          className={`${ACTION_BUTTON_CLASS} border-tacha-border text-tacha-textsec hover:bg-tacha-chipbg/40`}
        >
          {MY_INVENTORY_TEXT.USED_UP}
        </button>
      </div>
      {/* -mx-3: ShelfLifeChips ya trae su propio margen lateral (px-3), como en la fila de la lista. */}
      <div id={chipsId} className="-mx-3">
        {isAdjusting ? (
          <ShelfLifeChips
            productName={item.productName}
            chips={{
              errorMessage,
              isSaving,
              itemId: item.variantId,
              onChoose: (choice) => actions.onAdjust(item.variantId, choice),
              // Sin chip marcado: se elige uno nuevo, desde hoy.
              selectedChoice: null,
            }}
          />
        ) : null}
      </div>
      {!isAdjusting && errorMessage ? (
        <p role="alert" className="font-body text-xs text-tacha-danger">
          {errorMessage}
        </p>
      ) : null}
    </li>
  );
};
