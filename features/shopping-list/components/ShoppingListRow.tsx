import { QuantityStepper } from "./QuantityStepper";
import type { ShoppingListRowProps } from "./models/ShoppingListRowProps.interface";

/**
 * Una fila de la lista. No usa ItemRow de components/ui porque ItemRow es un
 * <button> para tachar (Sprint 2): los controles de cantidad quedarían
 * anidados dentro de otro botón.
 */
export const ShoppingListRow = ({ onDecrease, onIncrease, row }: ShoppingListRowProps): React.JSX.Element => (
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
  </li>
);
