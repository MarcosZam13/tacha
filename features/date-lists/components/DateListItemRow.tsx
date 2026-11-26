import { QuantityStepper } from "@/components/quantity-stepper/QuantityStepper";
import { Checkbox, IconButton } from "@/components/ui";
import { ICON_BUTTON_TONE } from "@/constants";
import { ITEM_QUANTITY } from "@/constants/list-items.constants";
import { DATE_LIST_ITEM_ICON, DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateListItem } from "../models/DateList.interface";

interface DateListItemRowProps {
  /** El campo "Encargado" (SCRUM-108), que arma la pantalla; la fila solo le da su lugar. */
  assigneeSlot?: React.ReactNode;
  isDisabled: boolean;
  item: DateListItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  onToggle: (isChecked: boolean) => void;
}

/**
 * Un producto de la sublista. Ya tachado no se le cambia la cantidad: se destacha primero.
 * Como la fila de la lista general (SCRUM-158): nombre en máximo dos líneas (completo en `title`)
 * y eliminar como ícono rojo sin borde, con "Eliminar" como nombre accesible.
 */
export const DateListItemRow = ({
  assigneeSlot,
  isDisabled,
  item,
  onDecrease,
  onIncrease,
  onRemove,
  onToggle,
}: DateListItemRowProps): React.JSX.Element => (
  <li className="flex items-center gap-3 px-3 py-2">
    <Checkbox
      ariaLabel={`${DATE_LIST_TEXT.CHECK_ITEM} ${item.productName}`}
      isChecked={item.isChecked}
      isDisabled={isDisabled}
      onChange={onToggle}
    />
    <div className="flex min-w-0 flex-1 flex-col">
      <span
        title={item.productName}
        className={`line-clamp-2 font-body text-sm text-tacha-text ${item.isChecked ? "line-through" : ""}`}
      >
        {item.productName}
      </span>
      <span className="block font-body text-xs text-tacha-textsec">{item.sizeLabel}</span>
      {assigneeSlot}
    </div>
    {item.isChecked ? null : (
      <QuantityStepper
        canDecrease={!isDisabled && item.quantity > ITEM_QUANTITY.MIN}
        canIncrease={!isDisabled}
        decreaseLabel={DATE_LIST_TEXT.DECREASE_QUANTITY}
        increaseLabel={DATE_LIST_TEXT.INCREASE_QUANTITY}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        quantity={item.quantity}
      />
    )}
    <IconButton
      icon={DATE_LIST_ITEM_ICON.REMOVE_ITEM}
      label={DATE_LIST_TEXT.REMOVE_ITEM}
      tone={ICON_BUTTON_TONE.DANGER}
      isDisabled={isDisabled}
      onClick={onRemove}
    />
  </li>
);