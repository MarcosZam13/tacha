import type { NullableRef } from "@/types/nullable.types";
import type { BudgetStatusType } from "../../constants/finance.constants";

/** El bloque del presupuesto del periodo, con solo lo que dibuja (SPEC §6 y §8). */
export interface SpendingBudgetProps {
  /** "Editar presupuesto" o "Definir presupuesto". */
  actionLabel: string;
  /** "₡50 000"; null si no hay presupuesto para este periodo. */
  amountText: NullableRef<string>;
  /** "Te quedan ₡35 000" / "Te pasaste por ₡3 000"; null sin presupuesto o sin gasto cargado. */
  differenceText: NullableRef<string>;
  /** Error de carga, de validación o de guardado. */
  errorMessage: NullableRef<string>;
  /** "Presupuesto semanal (₡)". */
  inputLabel: string;
  /** "Presupuesto semanal". */
  label: string;
  /** "Sin presupuesto semanal". */
  noBudgetText: string;
  /** "No incluye 2 compras sin total"; null si no hay. */
  notIncludedText: NullableRef<string>;
  onCancel: () => void;
  onEdit: () => void;
  onRetry: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: BudgetStatusType;
  /** Lo escrito en el campo abierto. */
  text: string;
}
