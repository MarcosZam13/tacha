"use client";

import { PriceDisclaimer } from "@/components/price-disclaimer/PriceDisclaimer";
import { Spinner } from "@/components/ui";
import { FinanceNoAccount } from "./components/FinanceNoAccount";
import { FinanceTabs } from "./components/FinanceTabs";
import { HistoryViewSwitch } from "./components/HistoryViewSwitch";
import { ProductPurchaseList } from "./components/ProductPurchaseList";
import { ProductSearch } from "./components/ProductSearch";
import { FINANCE_ACCESS_STATUS, FINANCE_TAB, FINANCE_TEXT, HISTORY_VIEW } from "./constants/finance.constants";
import { useProductPurchaseHistoryViewModel } from "./hooks/useProductPurchaseHistoryViewModel";

/**
 * Vista "Productos" del sub-tab Historial (SCRUM-93 / HU-62): los productos
 * comprados en todo el historial con cuántas veces aparecen (CA-01) y, al
 * elegir uno, sus compras (CA-02). Solo para cuentas registradas (D6); sin
 * cuenta no se pide nada. "use client" porque usa hooks y lee la sesión.
 */
export const ProductPurchaseHistory = (): React.JSX.Element => {
  const viewModel = useProductPurchaseHistoryViewModel();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:mx-0 md:px-10">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{FINANCE_TEXT.TITLE}</h1>

      {/* Siempre montada: si naciera junto con el mensaje, el lector de pantalla
          podría no anunciarlo (SPEC §9). */}
      <p role="status" aria-live="polite" className="sr-only">
        {viewModel.statusMessage}
      </p>

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.CHECKING ? <Spinner /> : null}

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.NO_ACCOUNT ? <FinanceNoAccount /> : null}

      {viewModel.accessStatus === FINANCE_ACCESS_STATUS.REGISTERED ? (
        <>
          <FinanceTabs activeTab={FINANCE_TAB.HISTORY} />
          <HistoryViewSwitch activeView={HISTORY_VIEW.PRODUCTS} />
          <ProductSearch {...viewModel.search} />
          <ProductPurchaseList {...viewModel.list} />
          <PriceDisclaimer />
        </>
      ) : null}
    </div>
  );
};
