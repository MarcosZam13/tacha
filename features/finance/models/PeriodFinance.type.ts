import type { NullableRef } from "@/types/nullable.types";
import type { PeriodAdjustment } from "./PeriodAdjustment.interface";
import type { PeriodBounds } from "./PeriodBounds.interface";
import type { PeriodPurchase } from "./PeriodPurchase.interface";
import type { PeriodSpending } from "./PeriodSpending.interface";

// La lectura get_period_finance (040, SPEC §12), en el orden en que se usa: lo
// que devuelve la base y lo que reciben los hooks. El adapter
// (utils/toPeriodFinance.ts) convierte una en la otra.

// ----------------------------------------------------------------------------
// Lo que devuelve la RPC, tal cual. Es jsonb: la base no le da tipo, lo fija el
// contrato de la función. Solo lo conoce el adapter.
// ----------------------------------------------------------------------------

export interface PeriodFinancePurchaseRow {
  closed_at: string;
  id: string;
  /** null si el supermercado no tiene nombre o viene en blanco (regla 29). */
  store_name: NullableRef<string>;
  total_amount: NullableRef<number>;
}

export interface PeriodFinanceAdjustmentRow {
  amount: number;
  effective_at: string;
  id: string;
  /** text en la base; el check de la 040 lo limita a los tres niveles. */
  scope: string;
}

/** Sin zona guardada, todo lo que depende de ella llega null o vacío (regla 59). */
export interface PeriodFinanceResponse {
  adjustment_count: number;
  adjustments: PeriodFinanceAdjustmentRow[];
  closed_count: number;
  period_end: NullableRef<string>;
  period_start: NullableRef<string>;
  purchases: PeriodFinancePurchaseRow[];
  time_zone: NullableRef<string>;
  total: NullableRef<number>;
  without_total_count: number;
}

// ----------------------------------------------------------------------------
// Lo que reciben los hooks.
// ----------------------------------------------------------------------------

/**
 * El periodo en curso según la zona guardada, en una sola lectura coherente.
 * Las compras van de la más reciente a la más antigua (regla 26) y los
 * ajustes, por fecha.
 */
export interface ZonedPeriodFinance {
  adjustments: PeriodAdjustment[];
  /** A las 00:00 de la zona guardada, no del navegador. */
  bounds: PeriodBounds;
  purchases: PeriodPurchase[];
  spending: PeriodSpending;
  timeZone: string;
}

/**
 * Sin zona confirmada no hay ajustes (regla 59): la pantalla lee como antes,
 * con el navegador. No es un error.
 */
export interface PeriodFinanceWithoutTimeZone {
  timeZone: null;
}

export type PeriodFinance = PeriodFinanceWithoutTimeZone | ZonedPeriodFinance;
