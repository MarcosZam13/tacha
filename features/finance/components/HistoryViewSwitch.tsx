import Link from "next/link";
import { HISTORY_VIEWS, PRODUCT_HISTORY_TEXT } from "../constants/finance.constants";
import type { HistoryViewSwitchProps } from "./models/HistoryViewSwitchProps.interface";

/**
 * Selector "Compras / Productos" del sub-tab Historial (SCRUM-93, D31). Son
 * links porque cada vista es su pantalla y no guarda nada de la otra (regla
 * 92). La vista activa se anuncia con aria-current="page" (SPEC §9) y usa el
 * mismo tono que los sub-tabs, no el chip TEAL, que no da AA (plan, "Riesgos").
 */
export const HistoryViewSwitch = ({ activeView }: HistoryViewSwitchProps): React.JSX.Element => (
  <nav aria-label={PRODUCT_HISTORY_TEXT.VIEW_NAV_LABEL}>
    <ul className="flex gap-2">
      {HISTORY_VIEWS.map((view) => {
        const isActive = view.id === activeView;

        return (
          <li key={view.id}>
            <Link
              href={view.href}
              aria-current={isActive ? "page" : undefined}
              className={`block rounded-tacha-badge border px-3 py-1.5 font-body text-sm ${
                isActive
                  ? "border-tacha-teal font-semibold text-tacha-teal"
                  : "border-tacha-border text-tacha-text hover:text-tacha-teal"
              }`}
            >
              {view.label}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);
