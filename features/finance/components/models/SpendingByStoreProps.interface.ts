import type { NullableRef } from "@/types/nullable.types";

/** Un supermercado del desglose, con solo lo que dibuja (SCRUM-72, SPEC §8). */
export interface StoreSpendingRowProps {
  /** "₡12 000", "₡0" o "Sin total" (D46). */
  amountText: string;
  /** true si solo tiene compras sin total: "Sin total" va como badge (D46, D27). Un ₡0 es false (D8). */
  hasNoTotal: boolean;
  /** La clave del `<li>`: el nombre del supermercado, o "" para "Supermercado no disponible", que es un solo grupo (un nombre nunca llega en blanco, regla 29). */
  id: string;
  /** El nombre del supermercado, o "Supermercado no disponible" (regla 109). */
  storeText: string;
  /** "1 sin total" / "3 sin total"; null si no tiene compras sin total (D47). */
  withoutTotalText: NullableRef<string>;
}

/** La línea de los ajustes manuales, fuera de la lista (D45). */
export interface StoreSpendingAdjustmentProps {
  /** "+₡500" / "−₡1 500" (`formatSignedColones`). */
  amountText: string;
  /** "Ajuste manual" o "Ajustes manuales" (D50). */
  labelText: string;
}

/** El desglose del periodo por supermercado (SCRUM-72, CA-01 y CA-02). */
export interface SpendingByStoreProps {
  /** null si el periodo no tiene ajustes. */
  adjustment: NullableRef<StoreSpendingAdjustmentProps>;
  /** Uno por supermercado, ya en el orden de la regla 113. Nunca vacío (D48). */
  rows: StoreSpendingRowProps[];
}
