"use client";

import { Spinner } from "@/components/ui";
import { FinanceNoAccount } from "./components/FinanceNoAccount";
import { SpendingBudget } from "./components/SpendingBudget";
import { SpendingPeriodSelector } from "./components/SpendingPeriodSelector";
import { SpendingTotal } from "./components/SpendingTotal";
import { FINANCE_ACCESS_STATUS, FINANCE_TEXT } from "./constants/finance.constants";
import { useFinanceDashboardViewModel } from "./hooks/useFinanceDashboardViewModel";

/**
 * Pantalla "Finanzas" (SCRUM-69 / HU-37): el gasto del periodo en curso y su
 * presupuesto, solo para cuentas registradas (SPEC D6). Hoy es solo el
 * Dashboard, sin sub-tabs hasta que exista "Historial" (D5). "use client"
 * porque usa hooks y lee la sesión del navegador.
 */
export const FinanceDashboard = (): React.JSX.Element => {
  const viewModel = useFinanceDashboardViewModel();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{FINANCE_TEXT.TITLE}</h1>

      {/* Siempre montada, aunque esté vacía: si la región naciera junto con el
          mensaje, el lector de pantalla podría no anunciarlo. Anuncia el total
          al cambiar de periodo y "Presupuesto guardado" (SPEC §9). El total ya
          se ve en pantalla, así que solo la oye el lector de pantalla. */}
      <p role="status" aria-live="polite" className="sr-only">
        {viewModel.statusMessage}
      </p>

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.CHECKING ? <Spinner /> : null}

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.NO_ACCOUNT ? <FinanceNoAccount /> : null}

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.REGISTERED ? (
        <>
          <SpendingPeriodSelector options={viewModel.periodOptions} />
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
              <SpendingTotal {...viewModel.spending} />
            </section>
            <section className="rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
              <SpendingBudget {...viewModel.budget} />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
};
