import { PRODUCT_DETAIL_ID } from "../constants/finance.constants";
import type { ProductPurchaseRowProps } from "./models/ProductPurchaseRowProps.interface";
import { ProductPurchaseDetail } from "./ProductPurchaseDetail";

/**
 * Un producto de la lista (CA-01): un botón con su nombre completo ("Leche, 4
 * veces") y aria-expanded (SPEC §9). Tocarlo abre o cierra su detalle, que se
 * dibuja debajo, en la misma pantalla (D32). El elegido se distingue con el
 * fondo y el borde, no solo con color de texto. Al cerrarlo, el foco ya está en
 * este botón.
 */
export const ProductPurchaseRow = ({
  accessibleName,
  countText,
  detail,
  isExpanded,
  isUnavailable,
  nameText,
  onToggle,
}: ProductPurchaseRowProps): React.JSX.Element => (
  <li className="font-body">
    <button
      type="button"
      aria-label={accessibleName}
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? PRODUCT_DETAIL_ID : undefined}
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-4 border-l-4 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tacha-teal ${
        isExpanded ? "border-tacha-teal bg-tacha-teal/10" : "border-transparent hover:bg-tacha-bg"
      }`}
    >
      <span
        className={`min-w-0 break-words text-sm ${isUnavailable ? "italic text-tacha-textsec" : "font-medium text-tacha-text"}`}
      >
        {nameText}
      </span>
      <span className="shrink-0 text-sm text-tacha-textsec">{countText}</span>
    </button>
    {detail ? <ProductPurchaseDetail {...detail} /> : null}
  </li>
);
