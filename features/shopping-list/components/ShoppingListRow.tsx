import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import { QuantityStepper } from "./QuantityStepper";
import type { ShoppingListRowProps } from "./models/ShoppingListRowProps.interface";

/**
 * Una fila de la lista. No usa ItemRow de components/ui porque ItemRow es un
 * <button> para tachar (Sprint 2): los controles de cantidad quedarían
 * anidados dentro de otro botón. Por lo mismo, el botón de detalle es
 * hermano de los controles de cantidad, nunca hijo de la fila.
 */
export const ShoppingListRow = ({
  onDecrease,
  onIncrease,
  onOpenDetail,
  row,
}: ShoppingListRowProps): React.JSX.Element => (
  <li className="flex items-center gap-3 px-3 py-2">
    <span className="flex-1">
      <span className="block font-body text-sm text-tacha-text">{row.item.productName}</span>
      <span className="block font-body text-xs text-tacha-textsec">{row.item.sizeLabel}</span>
    </span>
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
  </li>
);
