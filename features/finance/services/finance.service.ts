import { SESSION_STATUS } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import { getSessionStatus } from "@/utils/getSessionStatus";
import type { PostgrestError } from "@supabase/supabase-js";
import type { NullableRef } from "@/types/nullable.types";
import {
  COLONES_AMOUNT,
  FINANCE_DB,
  SPENDING_PERIOD,
  TIME_ZONE_ERROR_CODE,
  TOTAL_SAVE_ERROR,
  TOTAL_SAVE_ERROR_CODE,
} from "../constants/finance.constants";
import type { SpendingPeriodType, TotalSaveErrorType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodFinance, PeriodFinanceResponse } from "../models/PeriodFinance.type";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import type { SpendingBudgets } from "../models/SpendingBudgets.type";
import type {
  SetPeriodTotalPayload,
  SetPeriodTotalResponse,
  SetPurchaseTotalPayload,
  SetPurchaseTotalResponse,
  SetSpendingTimeZonePayload,
  SetSpendingTimeZoneResponse,
} from "../models/TotalMutations.interface";
import { TotalSaveError } from "../models/TotalMutations.interface";
import { isSpendingPeriod } from "../utils/isSpendingPeriod";
import { summarizeSpending } from "../utils/summarizeSpending";
import { toPeriodFinance } from "../utils/toPeriodFinance";

// Mismas reglas que el check de spending_budgets.amount (027) y que
// assert_valid_spending_total (040). La pantalla ya valida con parseColonesAmount;
// esto evita mandar a la base algo que va a rechazar.
const isValidColonesAmount = (amount: number): boolean =>
  Number.isInteger(amount) && amount >= 0 && amount <= COLONES_AMOUNT.MAX;

const TOTAL_SAVE_ERROR_BY_CODE: ReadonlyMap<string, TotalSaveErrorType> = new Map(
  Object.entries(TOTAL_SAVE_ERROR_CODE),
);

// Un error de la base → el motivo que decide el mensaje (SPEC §7), solo por su
// código. El error original queda como causa.
const toTotalSaveError = (error: PostgrestError): TotalSaveError =>
  new TotalSaveError(TOTAL_SAVE_ERROR_BY_CODE.get(error.code) ?? TOTAL_SAVE_ERROR.GENERAL, error);

const assertValidTotal = (total: number): void => {
  if (!isValidColonesAmount(total)) {
    throw new RangeError("El total tiene que ser un monto entero entre 0 y el tope");
  }
};

const assertPeriodMovesForward = ({ end, start }: PeriodBounds): void => {
  if (!(start.getTime() < end.getTime())) {
    throw new RangeError("El periodo tiene que empezar antes de terminar");
  }
};

/**
 * true si la sesión guardada es de una cuenta registrada (SPEC D6). Usa
 * getSession y nunca ensureSession: abrir Finanzas no crea un usuario anónimo.
 * Una sesión anónima cuenta igual que no tener sesión. Solo decide qué
 * mostrar; la base rechaza igual a quien no tenga cuenta (027).
 */
export const hasRegisteredSession = async (): Promise<boolean> => {
  const { data: sessionData, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;

  return getSessionStatus(sessionData.session) === SESSION_STATUS.AUTHENTICATED;
};

/**
 * El periodo en curso según la zona guardada, en una sola lectura coherente
 * (get_period_finance, SPEC §12): límites, compras, ajustes y gasto. El dueño y
 * la zona los pone la base; el cliente manda solo el nivel.
 *
 * Sin zona confirmada responde `{ timeZone: null }`: no es un error y quien
 * llama lee como antes (regla 59). Devuelve null con TZ002, si PostgreSQL ya no
 * reconoce la zona guardada: no hay totales hasta confirmar otra, y nunca se
 * cae a otra zona (regla 60).
 */
export const getPeriodFinance = async (period: SpendingPeriodType): Promise<NullableRef<PeriodFinance>> => {
  const { data: periodFinance, error } = await getSupabaseClient().rpc(FINANCE_DB.RPC.GET_PERIOD_FINANCE, {
    target_scope: period,
  });
  if (error?.code === TIME_ZONE_ERROR_CODE.UNRECOGNIZED) return null;
  if (error) throw error;

  // La RPC devuelve jsonb: la base no le da tipo, lo fija el contrato de la 040
  // y lo comprueba el adapter.
  return toPeriodFinance(periodFinance as unknown as PeriodFinanceResponse);
};

/**
 * El gasto del periodo sin zona guardada: las compras cerradas propias con
 * `closed_at` dentro de los límites del navegador (inicio incluido, fin
 * excluido; SPEC regla 8). Sin zona no hay ajustes (regla 59). La RLS de
 * purchase_sessions solo deja las propias (D4) y el filtro deja fuera las
 * abiertas, que tienen `closed_at` nulo (D3).
 *
 * Como getPeriodPurchases, si el conteo exacto es nulo o no coincide con las
 * filas recibidas, falla en vez de dar un total falso (D19, regla 30).
 */
export const getPeriodSpending = async ({ end, start }: PeriodBounds): Promise<PeriodSpending> => {
  assertPeriodMovesForward({ end, start });

  const {
    count,
    data: purchaseRows,
    error,
  } = await getSupabaseClient()
    .from(FINANCE_DB.TABLE.PURCHASE_SESSIONS)
    .select(FINANCE_DB.SELECT.SPENDING, { count: "exact" })
    .gte(FINANCE_DB.COLUMN.CLOSED_AT, start.toISOString())
    .lt(FINANCE_DB.COLUMN.CLOSED_AT, end.toISOString());
  if (error) throw error;
  if (count !== purchaseRows.length) {
    throw new Error(`${FINANCE_DB.TABLE.PURCHASE_SESSIONS} devolvió un resultado incompleto`);
  }

  return summarizeSpending(purchaseRows.map((purchaseRow) => purchaseRow.total_amount));
};

/**
 * Las compras cerradas propias del periodo para el Historial (SCRUM-90), de la
 * más reciente a la más antigua (SPEC regla 26). Mismos límites y misma RLS que
 * getPeriodSpending.
 *
 * El servidor puede cortar la respuesta sin avisar: si el conteo exacto es nulo
 * o no coincide con las filas recibidas, falla en vez de dar un total falso
 * (regla 30). Un nombre de supermercado nulo o en blanco no es un error: se
 * entrega como null y la fila se conserva (regla 29).
 */
export const getPeriodPurchases = async ({ end, start }: PeriodBounds): Promise<PeriodPurchase[]> => {
  assertPeriodMovesForward({ end, start });

  const {
    count,
    data: purchaseRows,
    error,
  } = await getSupabaseClient()
    .from(FINANCE_DB.TABLE.PURCHASE_SESSIONS)
    .select(FINANCE_DB.SELECT.PURCHASES, { count: "exact" })
    .gte(FINANCE_DB.COLUMN.CLOSED_AT, start.toISOString())
    .lt(FINANCE_DB.COLUMN.CLOSED_AT, end.toISOString())
    .order(FINANCE_DB.COLUMN.CLOSED_AT, { ascending: false })
    .order(FINANCE_DB.COLUMN.ID);
  if (error) throw error;
  if (count !== purchaseRows.length) {
    throw new Error(`${FINANCE_DB.TABLE.PURCHASE_SESSIONS} devolvió un resultado incompleto`);
  }

  return purchaseRows.map((purchaseRow) => {
    // closed_at es nullable en la tabla; el filtro deja solo las cerradas.
    if (purchaseRow.closed_at === null) {
      throw new Error(`${FINANCE_DB.TABLE.PURCHASE_SESSIONS} devolvió una compra sin cierre`);
    }

    return {
      closedAt: purchaseRow.closed_at,
      id: purchaseRow.id,
      storeName: purchaseRow.stores?.display_name?.trim() || null,
      totalAmount: purchaseRow.total_amount,
    };
  });
};

/**
 * Los tres presupuestos del usuario (D1), con null en los que no definió. La
 * RLS de la 027 solo deja leer los propios, y nada a una sesión anónima.
 */
export const getSpendingBudgets = async (): Promise<SpendingBudgets> => {
  const { data: budgetRows, error } = await getSupabaseClient()
    .from(FINANCE_DB.TABLE.SPENDING_BUDGETS)
    .select(FINANCE_DB.SELECT.BUDGETS);
  if (error) throw error;

  const budgets: SpendingBudgets = {
    [SPENDING_PERIOD.DAY]: null,
    [SPENDING_PERIOD.MONTH]: null,
    [SPENDING_PERIOD.WEEK]: null,
  };
  for (const budgetRow of budgetRows) {
    if (!isSpendingPeriod(budgetRow.period)) {
      throw new Error(`${FINANCE_DB.TABLE.SPENDING_BUDGETS} devolvió un periodo desconocido`);
    }
    budgets[budgetRow.period] = budgetRow.amount;
  }

  return budgets;
};

/**
 * Crea o reemplaza el presupuesto de un tipo de periodo (SPEC regla 14) y
 * devuelve el monto guardado. El dueño lo pone la base (auth.uid()): el
 * cliente manda solo el periodo y el monto.
 */
export const setSpendingBudget = async (period: SpendingPeriodType, amount: number): Promise<number> => {
  if (!isValidColonesAmount(amount)) {
    throw new RangeError("El presupuesto tiene que ser un monto entero entre 0 y el tope");
  }

  const { data: savedBudget, error } = await getSupabaseClient().rpc(FINANCE_DB.RPC.SET_SPENDING_BUDGET, {
    budget_amount: amount,
    budget_period: period,
  });
  if (error) throw error;
  if (savedBudget.period !== period) {
    throw new Error(`${FINANCE_DB.RPC.SET_SPENDING_BUDGET} devolvió otro periodo`);
  }

  return savedBudget.amount;
};

/**
 * Edita el total de una compra cerrada propia, de cualquier fecha (CA-01, regla
 * 48), y devuelve la compra guardada. Su fecha no cambia (regla 47). El dueño y
 * la zona los pone la base: el cliente manda solo la compra y el total.
 *
 * Un monto fuera de las reglas es un RangeError sin llamar a la base. Un error
 * de la base llega como TotalSaveError, con el motivo según su código (SPEC §7):
 * 23514, TZ001, TZ002 o P0002; cualquier otro es GENERAL.
 */
export const setPurchaseTotal = async ({
  purchaseId,
  total,
}: SetPurchaseTotalPayload): Promise<SetPurchaseTotalResponse> => {
  assertValidTotal(total);

  const { data: savedPurchase, error } = await getSupabaseClient().rpc(FINANCE_DB.RPC.SET_PURCHASE_SESSION_TOTAL, {
    new_total: total,
    target_session_id: purchaseId,
  });
  if (error) throw toTotalSaveError(error);
  // La RPC devuelve la compra que editó: cerrada y con el total escrito.
  if (savedPurchase.id !== purchaseId || savedPurchase.closed_at === null || savedPurchase.total_amount !== total) {
    throw new Error(`${FINANCE_DB.RPC.SET_PURCHASE_SESSION_TOTAL} devolvió otra compra`);
  }

  return { closedAt: savedPurchase.closed_at, id: savedPurchase.id, totalAmount: savedPurchase.total_amount };
};

/**
 * Escribe el total del periodo en curso (CA-02). La base calcula los límites
 * con su hora y la zona guardada, y crea, reemplaza o quita el ajuste (D15,
 * reglas 50 a 52): el cliente manda solo el nivel y el total deseado.
 *
 * Devuelve el ajuste guardado, o null si la diferencia dio 0 y se quitó. Los
 * errores, como en setPurchaseTotal (23514, TZ001 o TZ002).
 */
export const setPeriodTotal = async ({ period, total }: SetPeriodTotalPayload): Promise<SetPeriodTotalResponse> => {
  assertValidTotal(total);

  const { data: savedAdjustments, error } = await getSupabaseClient().rpc(FINANCE_DB.RPC.SET_PERIOD_TOTAL, {
    target_scope: period,
    target_total: total,
  });
  if (error) throw toTotalSaveError(error);
  // returns setof: ninguna fila si se quitó, una si se guardó.
  if (savedAdjustments.length > 1) {
    throw new Error(`${FINANCE_DB.RPC.SET_PERIOD_TOTAL} devolvió más de un ajuste`);
  }

  const [savedAdjustment] = savedAdjustments;
  if (!savedAdjustment) return { adjustment: null };
  if (savedAdjustment.scope !== period) {
    throw new Error(`${FINANCE_DB.RPC.SET_PERIOD_TOTAL} devolvió otro periodo`);
  }

  return {
    adjustment: {
      amount: savedAdjustment.amount,
      effectiveAt: savedAdjustment.effective_at,
      id: savedAdjustment.id,
      scope: period,
    },
  };
};

/**
 * Confirma o cambia la zona de quien llama (regla 59). La llama solo un toque
 * explícito en "Confirmar": es la salida de TZ001 y de TZ002, y nunca se asigna
 * una zona sola. La base revisa todos los periodos con ajustes en la zona nueva.
 *
 * Los errores llegan como TotalSaveError: con 23514 (NEGATIVE_PERIOD) la zona
 * nueva dejaría un periodo en negativo y sigue la anterior; una zona que la base
 * no reconoce (22023) es GENERAL.
 */
export const setSpendingTimeZone = async ({
  timeZone,
}: SetSpendingTimeZonePayload): Promise<SetSpendingTimeZoneResponse> => {
  const { data: savedTimeZone, error } = await getSupabaseClient().rpc(FINANCE_DB.RPC.SET_SPENDING_TIME_ZONE, {
    new_time_zone: timeZone,
  });
  if (error) throw toTotalSaveError(error);
  if (savedTimeZone.time_zone !== timeZone) {
    throw new Error(`${FINANCE_DB.RPC.SET_SPENDING_TIME_ZONE} devolvió otra zona`);
  }

  return { timeZone: savedTimeZone.time_zone };
};