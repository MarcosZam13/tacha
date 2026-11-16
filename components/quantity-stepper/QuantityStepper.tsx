import { Minus, Plus } from "lucide-react";
import { Icon } from "@/components/ui";
import { ICON_SIZE } from "@/constants";
import type { QuantityStepperProps } from "./models/QuantityStepperProps.interface";

// Cada mitad del control: 44 × 44 px en celular (área táctil mínima,
// SCRUM-148), 36 en desktop. Sin borde propio: el borde es del grupo.
const STEP_BUTTON_CLASS =
  "inline-flex h-11 w-11 items-center justify-center text-tacha-teal transition-colors hover:bg-tacha-teal/10 disabled:cursor-not-allowed disabled:text-tacha-textsec disabled:opacity-40 disabled:hover:bg-transparent md:h-9 md:w-9";

/**
 * "−" cantidad "+" como un solo control (SCRUM-147): un borde redondeado
 * agrupa los dos botones y el número, para que se lea como la acción principal
 * de la fila y no como dos botones sueltos más.
 *
 * Los dos botones son hermanos, nunca anidados dentro de otro botón (en la
 * lista general, la fila completa tacha; un click acá no puede disparar
 * también eso). El ícono es decorativo (aria-hidden) y el texto sr-only es lo
 * que lee un lector de pantalla: `decreaseLabel`/`increaseLabel` quedan como
 * props porque el texto exacto difiere entre quien lo usa (SCRUM-85: promovido
 * desde shopping-list cuando catalog-product-detail se volvió el segundo
 * consumidor).
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
  <div className="flex shrink-0 items-center overflow-hidden rounded-tacha-badge border border-tacha-border bg-tacha-surface">
    <button type="button" disabled={!canDecrease} onClick={onDecrease} className={STEP_BUTTON_CLASS}>
      <Icon icon={Minus} size={ICON_SIZE.SMALL} />
      <span className="sr-only">{decreaseLabel}</span>
    </button>
    <span aria-live="polite" className="min-w-7 text-center font-body text-sm font-semibold text-tacha-text">
      {quantity}
    </span>
    <button type="button" disabled={!canIncrease} onClick={onIncrease} className={STEP_BUTTON_CLASS}>
      <Icon icon={Plus} size={ICON_SIZE.SMALL} />
      <span className="sr-only">{increaseLabel}</span>
    </button>
  </div>
);
