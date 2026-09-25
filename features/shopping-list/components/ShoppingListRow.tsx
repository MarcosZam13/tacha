import { Chip } from "@/components/ui";
import type { ShoppingListRowProps } from "./models/ShoppingListRowProps.interface";

/**
 * Una fila de la lista. No usa ItemRow de components/ui porque ItemRow es un
 * <button> para tachar (Sprint 2); acá todavía no hay acción de fila, y en
 * SCRUM-63 los controles +/- no pueden ir anidados dentro de otro botón.
 */
export const ShoppingListRow = ({ item }: ShoppingListRowProps): React.JSX.Element => (
  <li className="flex items-center gap-3 px-3 py-2">
    <span className="flex-1">
      <span className="block font-body text-sm text-tacha-text">{item.productName}</span>
      <span className="block font-body text-xs text-tacha-textsec">{item.sizeLabel}</span>
    </span>
    <Chip>{item.quantity}</Chip>
  </li>
);
