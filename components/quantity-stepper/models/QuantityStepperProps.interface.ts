export interface QuantityStepperProps {
  canDecrease: boolean;
  canIncrease: boolean;
  /** Aria-label de "−" (SCRUM-85: el texto difiere según quién lo use — "Quitar uno" en la lista, "Disminuir cantidad" en el detalle de producto). */
  decreaseLabel: string;
  /** Aria-label de "+". */
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  quantity: number;
}
