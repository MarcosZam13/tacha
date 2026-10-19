import type { NullableRef } from "@/types/nullable.types";
import type { SpendingStatusType } from "../../constants/finance.constants";

/** El bloque del gasto del periodo, con solo lo que dibuja (SPEC §6 y §8). */
export interface SpendingTotalProps {
  /** Cuántas compras cerradas con total suman ("Compras"). */
  closedCount: number;
  errorMessage: NullableRef<string>;
  /** "Gastado esta semana". */
  label: string;
  onRetry: () => void;
  /** "Lunes 12 a domingo 18 de octubre"; null mientras carga o con error. */
  rangeText: NullableRef<string>;
  status: SpendingStatusType;
  /** "₡15 000"; null mientras carga o con error. */
  totalText: NullableRef<string>;
  /** Cuántas compras cerradas no tienen total ("Sin total"). */
  withoutTotalCount: number;
}
