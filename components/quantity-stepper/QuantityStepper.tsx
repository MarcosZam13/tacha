import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import type { QuantityStepperProps } from "./models/QuantityStepperProps.interface";

/**
 * "−" cantidad "+". Los dos botones son hermanos, nunca anidados dentro de
 * otro botón (en la lista general, la fila completa tacha; un click acá no
 * puede disparar también eso). El símbolo es decorativo (aria-hidden) y el
 * texto sr-only es lo que lee un lector de pantalla — `decreaseLabel`/
 * `increaseLabel` quedan como props porque el texto exacto difiere entre
 * quien lo usa (SCRUM-85: promovido desde shopping-list cuando
 * catalog-product-detail se volvió el segundo consumidor).
 */
export const QuantityStepper = ({
  canDecrease,
  canIncrease,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
  quantity,
}: QuantityStepperProps): React.JSX.Element => (
  <div className="flex shrink-0 items-center gap-2">
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canDecrease} onClick={onDecrease}>
      <span aria-hidden="true">−</span>
      <span className="sr-only">{decreaseLabel}</span>
    </Button>
    <span aria-live="polite" className="min-w-6 text-center font-body text-sm font-semibold text-tacha-text">
      {quantity}
    </span>
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={!canIncrease} onClick={onIncrease}>
      <span aria-hidden="true">+</span>
      <span className="sr-only">{increaseLabel}</span>
    </Button>
  </div>
);
