import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import { QuantityStepper } from "./QuantityStepper";
import type { ShoppingListRowProps } from "./models/ShoppingListRowProps.interface";

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
 */
export const ShoppingListRow = ({
  onDecrease,
  onIncrease,
  onOpenDetail,
  onRemove,
  onToggleChecked,
  row,
}: ShoppingListRowProps): React.JSX.Element => (
  <li className="flex items-center gap-3 pr-3">
    <button
      type="button"
      aria-pressed={row.isChecked}
      disabled={!row.canToggleChecked}
      onClick={onToggleChecked}
      className="min-w-0 flex-1 self-stretch px-3 py-2 text-left transition-colors hover:bg-tacha-chipbg/40 disabled:cursor-wait"
    >
      <span
        className={`block font-body text-sm ${row.isChecked ? "text-tacha-textsec line-through" : "text-tacha-text"}`}
      >
        {row.item.productName}
      </span>
      <span className={`block font-body text-xs text-tacha-textsec ${row.isChecked ? "line-through" : ""}`}>
        {row.item.sizeLabel}
      </span>
    </button>
    <QuantityStepper
      canDecrease={row.canDecrease}
      canIncrease={row.canIncrease}
      onDecrease={onDecrease}
      onIncrease={onIncrease}
      quantity={row.item.quantity}
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
