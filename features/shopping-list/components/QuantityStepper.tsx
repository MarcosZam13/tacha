import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { QuantityStepperProps } from "./models/QuantityStepperProps.interface";

/**
 * "−" cantidad "+". Los dos botones son hermanos, nunca anidados dentro de
 * otro botón: en Sprint 2 la fila completa tacha, y un click acá no puede
 * disparar también el de la fila. El símbolo es decorativo (aria-hidden) y
 * el texto sr-only es lo que lee un lector de pantalla.
 */
export const QuantityStepper = ({
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  quantity,
}: QuantityStepperProps): React.JSX.Element => (
  <div className="flex shrink-0 items-center gap-2">
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canDecrease} onClick={onDecrease}>
      <span aria-hidden="true">−</span>
      <span className="sr-only">{SHOPPING_LIST_TEXT.DECREASE_QUANTITY}</span>
    </Button>
    <span aria-live="polite" className="min-w-6 text-center font-body text-sm font-semibold text-tacha-text">
      {quantity}
    </span>
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canIncrease} onClick={onIncrease}>
      <span aria-hidden="true">+</span>
      <span className="sr-only">{SHOPPING_LIST_TEXT.INCREASE_QUANTITY}</span>
    </Button>
  </div>
);
