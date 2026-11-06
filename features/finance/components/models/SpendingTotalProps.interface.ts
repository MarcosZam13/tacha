import type { NullableRef } from "@/types/nullable.types";
import type { SpendingStatusType } from "../../constants/finance.constants";
import type { EditTotalButtonProps } from "./EditTotalButtonProps.interface";
import type { InlineTotalEditorProps } from "./InlineTotalEditorProps.interface";

/** El bloque del gasto del periodo, con solo lo que dibuja (SPEC §6 y §8). */
export interface SpendingTotalProps {
  /** Cuántas compras cerradas con total suman ("Compras"). */
  closedCount: number;
  /** El lápiz del total del periodo (SCRUM-91). Solo el Historial lo pasa: el Dashboard no edita (D11). */
  edit?: NullableRef<EditTotalButtonProps>;
  /** El campo del total del periodo, si es el abierto (D21). */
  editor?: NullableRef<InlineTotalEditorProps>;
  errorMessage: NullableRef<string>;
  /** "Gastado esta semana". */
  label: string;
  /** "Incluye ajustes manuales", debajo del monto; solo el Dashboard y solo con ajustes (SPEC §8). */
  noteText?: NullableRef<string>;
  onRetry: () => void;
  /** "Lunes 12 a domingo 18 de octubre"; null mientras carga o con error. */
  rangeText: NullableRef<string>;
  status: SpendingStatusType;
  /** "₡15 000"; null mientras carga o con error. */
  totalText: NullableRef<string>;
  /** Cuántas compras cerradas no tienen total ("Sin total"). */
  withoutTotalCount: number;
}
