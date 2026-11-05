import { QuantityStepper } from "@/components/quantity-stepper/QuantityStepper";
import { Button, Checkbox } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { ITEM_QUANTITY } from "@/constants/list-items.constants";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateListItem } from "../models/DateList.interface";

interface DateListItemRowProps {
  isDisabled: boolean;
  item: DateListItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  onToggle: (isChecked: boolean) => void;
}

/** Un producto de la sublista. Ya tachado no se le cambia la cantidad: se destacha primero. */
export const DateListItemRow = ({
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
    <span className="min-w-0 flex-1">
      <span className={`block font-body text-sm text-tacha-text ${item.isChecked ? "line-through" : ""}`}>
        {item.productName}
      </span>
      <span className="block font-body text-xs text-tacha-textsec">{item.sizeLabel}</span>
    </span>
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
    <Button isDisabled={isDisabled} variant={BUTTON_VARIANT.SECONDARY} onClick={onRemove}>
      {DATE_LIST_TEXT.REMOVE_ITEM}
    </Button>
  </li>
);
