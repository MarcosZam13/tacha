import { Button, Spinner } from "@/components/ui";
import { QuantityStepper } from "@/components/quantity-stepper/QuantityStepper";
import { SPINNER_SIZE } from "@/constants";
import { PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";
import type { AddToListControlProps } from "./models/AddToListControlProps.interface";

/**
 * Selector de cantidad + botón principal "Agregar a mi lista" (SPEC.md §2,
 * §6.6-7). El selector usa el QuantityStepper compartido (promovido desde
 * shopping-list en esta misma historia, SCRUM-85): acá va junto al botón de
 * agregar en vez de junto a una fila de la lista, pero es el mismo control.
 */
export const AddToListControl = ({
  addErrorMessage,
  canDecreaseQuantity,
  isAdding,
  onAddToList,
  onDecreaseQuantity,
  onIncreaseQuantity,
  quantity,
  wasJustAdded,
}: AddToListControlProps): React.JSX.Element => (
  <div className="flex flex-col gap-3 rounded-tacha-card border border-tacha-border bg-tacha-surface p-4">
    <div className="flex items-center gap-3">
      <QuantityStepper
        canDecrease={canDecreaseQuantity && !isAdding}
        canIncrease={!isAdding}
        decreaseLabel={PRODUCT_DETAIL_TEXT.DECREASE_QUANTITY}
        increaseLabel={PRODUCT_DETAIL_TEXT.INCREASE_QUANTITY}
        onDecrease={onDecreaseQuantity}
        onIncrease={onIncreaseQuantity}
        quantity={quantity}
      />

      <Button isDisabled={isAdding} onClick={onAddToList}>
        {isAdding ? (
          <Spinner size={SPINNER_SIZE.SMALL} label={PRODUCT_DETAIL_TEXT.ADD_TO_LIST_BUTTON} />
        ) : (
          PRODUCT_DETAIL_TEXT.ADD_TO_LIST_BUTTON
        )}
      </Button>
    </div>

    {addErrorMessage ? (
      <p role="alert" className="font-body text-sm text-red-600">
        {addErrorMessage}
      </p>
    ) : null}
    {!addErrorMessage && wasJustAdded ? (
      <p className="font-body text-sm text-tacha-teal">{PRODUCT_DETAIL_TEXT.ADDED_CONFIRMATION}</p>
    ) : null}
  </div>
);
