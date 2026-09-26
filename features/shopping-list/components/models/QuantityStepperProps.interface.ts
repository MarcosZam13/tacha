export interface QuantityStepperProps {
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  quantity: number;
}
