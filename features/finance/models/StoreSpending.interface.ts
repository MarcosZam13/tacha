import type { NullableRef } from "@/types/nullable.types";

/**
 * Lo que se gastó en un supermercado durante el periodo (SCRUM-72, CA-01). Se
 * agrupa por nombre porque la lectura no trae `store_id` (SPEC regla 108).
 */
export interface StoreSpending {
  /** La suma de sus compras con total, en colones (puede traer centavos). 0 es un total real (D8). */
  amount: number;
  /** Cuántas de sus compras tienen total y entran en `amount`. 0 = solo compras sin total (D46). */
  closedCount: number;
  /** null = "Supermercado no disponible": la compra no trajo el nombre (regla 109). */
  storeName: NullableRef<string>;
  /** Cuántas de sus compras no tienen total; no suman a `amount` (D47). */
  withoutTotalCount: number;
}

/** El desglose del periodo por supermercado, con los ajustes aparte (D45). */
export interface SpendingByStoreBreakdown {
  /** Cuántos ajustes suma `adjustmentTotal`: decide "Ajuste manual" o "Ajustes manuales" (D50). */
  adjustmentCount: number;
  /** La suma con signo de los ajustes, en colones; null si el periodo no tiene (D45). */
  adjustmentTotal: NullableRef<number>;
  /** Un elemento por supermercado, ya en el orden de la regla 113. */
  stores: StoreSpending[];
}
