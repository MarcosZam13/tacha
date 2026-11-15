import Link from "next/link";
import { FINANCE_TABS, FINANCE_TEXT } from "../constants/finance.constants";
import type { FinanceTabsProps } from "./models/FinanceTabsProps.interface";

/**
 * Sub-tabs de Finanzas: el Dashboard y el Historial. Son links porque cambian
 * de pantalla (cada una arranca en Semana, D9). `activeTab` decide cuál se ve
 * activo y lo anuncia con aria-current="page". Vive en la feature porque solo
 * lo usa Finanzas.
 */
export const FinanceTabs = ({ activeTab }: FinanceTabsProps): React.JSX.Element => (
  <nav aria-label={FINANCE_TEXT.TABS_NAV_LABEL}>
    <ul className="flex gap-2 border-b border-tacha-border">
      {FINANCE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px block border-b-2 px-3 py-2 font-body text-sm ${
                isActive
                  ? "border-tacha-teal font-semibold text-tacha-teal"
                  : "border-transparent text-tacha-text hover:text-tacha-teal"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);
