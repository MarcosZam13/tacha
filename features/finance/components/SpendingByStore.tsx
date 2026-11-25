import { Chip } from "@/components/ui";
import { CHIP_TONE } from "@/constants";
import { FINANCE_TEXT, STORE_SPENDING_TITLE_ID } from "../constants/finance.constants";
import type { SpendingByStoreProps } from "./models/SpendingByStoreProps.interface";

/**
 * "Gasto por supermercado" del Dashboard (SCRUM-72, CA-01 y CA-02): un `<li>` por
 * supermercado, en el orden que ya trae, y los ajustes manuales en una línea
 * aparte, fuera de la lista (D45). Solo presentación y solo lectura: sin lápices
 * ni enlaces (D11, regla 117). Un supermercado solo con compras sin total
 * muestra "Sin total" como badge terracota, como el Historial (D46, D27).
 */
export const SpendingByStore = ({ adjustment, rows }: SpendingByStoreProps): React.JSX.Element => (
  <section
    aria-labelledby={STORE_SPENDING_TITLE_ID}
    className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6 font-body"
  >
    <h2 id={STORE_SPENDING_TITLE_ID} className="font-display text-xl font-semibold text-tacha-text">
      {FINANCE_TEXT.STORE_SPENDING_TITLE}
    </h2>
    <ul aria-labelledby={STORE_SPENDING_TITLE_ID} className="flex flex-col divide-y divide-tacha-border">
      {rows.map(({ amountText, hasNoTotal, id, storeText, withoutTotalText }) => (
        <li key={id} className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="break-words text-sm font-medium text-tacha-text">{storeText}</p>
            {withoutTotalText ? <p className="text-xs text-tacha-textsec">{withoutTotalText}</p> : null}
          </div>
          {hasNoTotal ? (
            <Chip tone={CHIP_TONE.TERRACOTTA_STRONG}>{amountText}</Chip>
          ) : (
            <p className="shrink-0 text-sm font-semibold text-tacha-text">{amountText}</p>
          )}
        </li>
      ))}
    </ul>
    {adjustment ? (
      <div className="flex items-center justify-between gap-4 border-t border-tacha-border pt-3">
        <p className="text-sm text-tacha-textsec">{adjustment.labelText}</p>
        <p className="shrink-0 text-sm font-semibold text-tacha-text">{adjustment.amountText}</p>
      </div>
    ) : null}
  </section>
);
