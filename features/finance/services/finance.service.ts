import { SESSION_STATUS } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import { getSessionStatus } from "@/utils/getSessionStatus";
import { BUDGET_AMOUNT, FINANCE_DB, SPENDING_PERIOD } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";
import type { PeriodBounds } from "../models/PeriodBounds.interface";
import type { PeriodPurchase } from "../models/PeriodPurchase.interface";
import type { PeriodSpending } from "../models/PeriodSpending.interface";
import type { SpendingBudgets } from "../models/SpendingBudgets.type";
import { summarizeSpending } from "../utils/summarizeSpending";

const SPENDING_PERIODS: readonly string[] = Object.values(SPENDING_PERIOD);

// period es text en la base; el check de la 027 garantiza uno de los tres,
// pero un valor fuera del contrato es un error, no se ignora.
const isSpendingPeriod = (period: string): period is SpendingPeriodType => SPENDING_PERIODS.includes(period);

// Mismas reglas que el check de spending_budgets.amount (027). La pantalla ya
// valida con parseBudgetAmount; esto evita mandar a la base algo que va a rechazar.
const isValidBudgetAmount = (amount: number): boolean =>
  Number.isInteger(amount) && amount >= 0 && amount <= BUDGET_AMOUNT.MAX;

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
 * El gasto del periodo: las compras cerradas propias con `closed_at` dentro de
 * los límites (inicio incluido, fin excluido; SPEC regla 8). La RLS de
 * purchase_sessions solo deja las propias (D4) y el filtro deja fuera las
 * abiertas, que tienen `closed_at` nulo (D3).
 */
export const getPeriodSpending = async ({ end, start }: PeriodBounds): Promise<PeriodSpending> => {
  assertPeriodMovesForward({ end, start });

  const { data: purchaseRows, error } = await getSupabaseClient()
    .from(FINANCE_DB.TABLE.PURCHASE_SESSIONS)
    .select(FINANCE_DB.SELECT.SPENDING)
    .gte(FINANCE_DB.COLUMN.CLOSED_AT, start.toISOString())
    .lt(FINANCE_DB.COLUMN.CLOSED_AT, end.toISOString());
  if (error) throw error;

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
  if (!isValidBudgetAmount(amount)) {
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
