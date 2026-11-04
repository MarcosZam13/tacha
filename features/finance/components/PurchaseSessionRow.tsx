import type { PurchaseSessionRowProps } from "./models/PurchaseSessionRowProps.interface";

/**
 * Una compra del Historial: fecha, supermercado y monto (CA-01). Solo
 * presentación: el ViewModel ya trae los textos. "Sin total" se ve como
 * cualquier monto, sin color de error (D8; el badge es de HU-61).
 */
export const PurchaseSessionRow = ({ amountText, dateText, storeText }: PurchaseSessionRowProps): React.JSX.Element => (
  <li className="flex items-center justify-between gap-4 px-4 py-3 font-body">
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-sm font-medium text-tacha-text">{dateText}</p>
      <p className="break-words text-sm text-tacha-textsec">{storeText}</p>
    </div>
    <p className="shrink-0 text-sm font-semibold text-tacha-text">{amountText}</p>
  </li>
);
