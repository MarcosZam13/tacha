import { QuantityStepper } from "@/components/quantity-stepper/QuantityStepper";
import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { PRODUCT_GROUP_EDITOR_TEXT } from "../constants/product-group-editor.constants";
import type { ProductGroupItemRowProps } from "./models/ProductGroupItemRowProps.interface";

/**
 * Una fila compacta del grupo en armado (HU-73 CA-02): presentación, cantidad
 * y "Quitar". Solo presentación: cada control avisa con el variantId de su
 * fila. "Quitar" y el stepper llevan el producto en su nombre accesible, así
 * no hay varios "Quitar" iguales para un lector de pantalla.
 */
export const ProductGroupItemRow = ({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: ProductGroupItemRowProps): React.JSX.Element => (
  <li className="flex flex-wrap items-center gap-3 px-3 py-3">
    <p className="min-w-0 flex-1 break-words font-body text-sm font-medium text-tacha-text">{item.label}</p>
    <QuantityStepper
      canDecrease={item.canDecrease}
      canIncrease={item.canIncrease}
      decreaseLabel={item.decreaseLabel}
      increaseLabel={item.increaseLabel}
      onDecrease={() => onDecrease(item.variantId)}
      onIncrease={() => onIncrease(item.variantId)}
      quantity={item.quantity}
    />
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => onRemove(item.variantId)}>
      <span aria-hidden="true">{PRODUCT_GROUP_EDITOR_TEXT.REMOVE_ITEM}</span>
      <span className="sr-only">{item.removeLabel}</span>
    </Button>
  </li>
);
