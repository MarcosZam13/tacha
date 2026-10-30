import { Button } from "@/components/ui";
import { QuantityStepper } from "@/components/quantity-stepper/QuantityStepper";
import { BUTTON_VARIANT } from "@/constants";
import { SHOPPING_LIST_TEXT, SHORTFALL_NOTES_ID_PREFIX } from "../constants/shopping-list.constants";
import type { ShoppingListRowProps } from "./models/ShoppingListRowProps.interface";
import { ShoppingListShortfallNotes } from "./ShoppingListShortfallNotes";

/**
 * Una fila de la lista. El nombre y el tamaño son un solo <button> que tacha
 * y destacha (HU-36e); ocupa todo el ancho libre, así que tocar cualquier
 * parte de la fila fuera de los controles tacha. Cantidad, detalle y eliminar
 * son botones hermanos, nunca hijos: un botón dentro de otro es HTML inválido
 * y el click de "+" también tacharía.
 *
 * No usa ItemRow de components/ui: dibuja un checkbox (HU-36e CA-01 lo
 * prohíbe) y envuelve toda la fila en un <button>, controles incluidos.
 * aria-pressed le dice al lector de pantalla si está tachada sin dibujar nada.
 *
 * Los avisos de faltante (SCRUM-114) van debajo del botón, fuera de él: son
 * solo texto, tocarlos no tacha (HU-76 CA-02). El botón los referencia con
 * aria-describedby para que el lector los lea como descripción del producto.
 */
export const ShoppingListRow = ({
  onDecrease,
  onIncrease,
  onOpenDetail,
  onRemove,
  onToggleChecked,
  row,
}: ShoppingListRowProps): React.JSX.Element => {
  // El único indicador de tachado va sobre el texto (HU-36e CA-03).
  const checkedTextClass = row.isChecked ? "text-tacha-textsec line-through" : "text-tacha-text";
  const hasShortfallNotes = row.shortfallNotes.length > 0;
  const shortfallNotesId = `${SHORTFALL_NOTES_ID_PREFIX}${row.item.id}`;

  return (
    <li className="flex items-center gap-3 pr-3">
      <div className="flex min-w-0 flex-1 flex-col self-stretch">
        <button
          type="button"
          aria-pressed={row.isChecked}
          aria-describedby={hasShortfallNotes ? shortfallNotesId : undefined}
          disabled={!row.canToggleChecked}
          onClick={onToggleChecked}
          className="flex-1 px-3 py-2 text-left transition-colors hover:bg-tacha-chipbg/40 disabled:cursor-wait"
        >
          <span className={`block font-body text-sm ${checkedTextClass}`}>{row.item.productName}</span>
          <span className={`block font-body text-xs ${checkedTextClass}`}>{row.item.sizeLabel}</span>
          {/* Modo compra (SCRUM-67): el stepper muestra lo comprado; esto recuerda lo pedido. */}
          {row.requestedNote ? (
            <span className="block font-body text-xs text-tacha-textsec">{row.requestedNote}</span>
          ) : null}
        </button>
        {hasShortfallNotes ? (
          <ShoppingListShortfallNotes
            id={shortfallNotesId}
            notes={row.shortfallNotes}
          />
        ) : null}
      </div>
      <QuantityStepper
        canDecrease={row.canDecrease}
        canIncrease={row.canIncrease}
        decreaseLabel={SHOPPING_LIST_TEXT.DECREASE_QUANTITY}
        increaseLabel={SHOPPING_LIST_TEXT.INCREASE_QUANTITY}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        quantity={row.displayedQuantity}
      />
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onOpenDetail}>
        <span aria-hidden="true">{SHOPPING_LIST_TEXT.OPEN_DETAIL_ICON}</span>
        <span className="sr-only">{SHOPPING_LIST_TEXT.OPEN_DETAIL}</span>
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!row.canRemove} onClick={onRemove}>
        <span aria-hidden="true">{SHOPPING_LIST_TEXT.REMOVE_ITEM_ICON}</span>
        <span className="sr-only">{SHOPPING_LIST_TEXT.REMOVE_ITEM}</span>
      </Button>
    </li>
  );
};
