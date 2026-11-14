"use client";

import { PriceDisclaimer } from "@/components/price-disclaimer/PriceDisclaimer";
import { Spinner } from "@/components/ui";
import { FinanceNoAccount } from "./components/FinanceNoAccount";
import { FinanceTabs } from "./components/FinanceTabs";
import { PeriodAdjustmentRow } from "./components/PeriodAdjustmentRow";
import { PurchaseSessionRow } from "./components/PurchaseSessionRow";
import { SpendingPeriodSelector } from "./components/SpendingPeriodSelector";
import { SpendingTotal } from "./components/SpendingTotal";
import { TimeZoneConfirmation } from "./components/TimeZoneConfirmation";
import { FINANCE_ACCESS_STATUS, FINANCE_TAB, FINANCE_TEXT, HISTORY_ROW_KIND } from "./constants/finance.constants";
import { usePurchaseHistoryViewModel } from "./hooks/usePurchaseHistoryViewModel";

/**
 * Sub-tab "Historial" de Finanzas (SCRUM-90 / HU-59): las compras cerradas del
 * periodo en curso con su total, solo para cuentas registradas (SPEC D6). El
 * aviso de precios se ve en todos los estados de una cuenta registrada (§6).
 * "use client" porque usa hooks y lee la sesión del navegador.
 */
export const PurchaseHistory = (): React.JSX.Element => {
  const viewModel = usePurchaseHistoryViewModel();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{FINANCE_TEXT.TITLE}</h1>

      {/* Siempre montada, aunque esté vacía: si la región naciera junto con el
          mensaje, el lector de pantalla podría no anunciarlo (SPEC §9). */}
      <p role="status" aria-live="polite" className="sr-only">
        {viewModel.statusMessage}
      </p>

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.CHECKING ? <Spinner /> : null}

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.NO_ACCOUNT ? <FinanceNoAccount /> : null}

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.REGISTERED ? (
        <>
          <FinanceTabs activeTab={FINANCE_TAB.HISTORY} />
          <SpendingPeriodSelector options={viewModel.periodOptions} />
          <section className="rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
            <SpendingTotal {...viewModel.spending} edit={viewModel.periodEdit} editor={viewModel.periodEditor} />
            {viewModel.timeZoneConfirmation ? <TimeZoneConfirmation {...viewModel.timeZoneConfirmation} /> : null}
          </section>
          <PriceDisclaimer />
          {viewModel.listRows.length > 0 ? (
            <ul
              aria-label={FINANCE_TEXT.PURCHASES_LIST_LABEL}
              className="divide-y divide-tacha-border overflow-hidden rounded-tacha-card border border-tacha-border bg-tacha-surface"
            >
              {viewModel.listRows.map((listRow) =>
                listRow.kind === HISTORY_ROW_KIND.PURCHASE ? (
                  <PurchaseSessionRow key={listRow.row.id} {...listRow.row} />
                ) : (
                  <PeriodAdjustmentRow key={listRow.row.id} {...listRow.row} />
                ),
              )}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
