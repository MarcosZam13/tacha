import { useEffect, useRef } from "react";
import { Button, Chip, Spinner } from "@/components/ui";
import { BUTTON_VARIANT, CHIP_TONE } from "@/constants";
import {
  FINANCE_TEXT,
  PRODUCT_DETAIL_ID,
  PRODUCT_DETAIL_STATUS,
  PRODUCT_DETAIL_TITLE_ID,
  PRODUCT_HISTORY_TEXT,
} from "../constants/finance.constants";
import type { ProductPurchaseDetailProps } from "./models/ProductPurchaseDetailProps.interface";

/**
 * Las compras del producto elegido (SCRUM-93, CA-02), en la misma pantalla
 * (D32). Solo lectura, sin lápices (D34). El monto es el total de cada compra
 * entera, con la aclaración visible de la regla 85. Al abrirse, el foco va a su
 * título (SPEC §9); el error queda dentro del detalle y la lista sigue visible.
 */
export const ProductPurchaseDetail = ({
  countText,
  listLabel,
  onRetry,
  purchases,
  status,
  titleText,
}: ProductPurchaseDetailProps): React.JSX.Element => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Solo al abrirse: cambiar de producto monta otro detalle.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section
      id={PRODUCT_DETAIL_ID}
      aria-labelledby={PRODUCT_DETAIL_TITLE_ID}
      className="flex flex-col gap-3 border-t border-tacha-border bg-tacha-bg px-4 py-4 font-body"
    >
      <div className="flex flex-col gap-0.5">
        <h2
          id={PRODUCT_DETAIL_TITLE_ID}
          ref={titleRef}
          tabIndex={-1}
          className="font-display text-lg font-semibold text-tacha-text focus:outline-none focus-visible:ring-2 focus-visible:ring-tacha-teal"
        >
          {titleText}
        </h2>
        <p className="text-sm text-tacha-textsec">{countText}</p>
      </div>
      <p className="text-sm text-tacha-textsec">{PRODUCT_HISTORY_TEXT.AMOUNT_NOTE}</p>

      {status === PRODUCT_DETAIL_STATUS.LOADING ? <Spinner label={PRODUCT_HISTORY_TEXT.DETAIL_LOADING} /> : null}

      {status === PRODUCT_DETAIL_STATUS.FAILED ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-red-600">
            {PRODUCT_HISTORY_TEXT.DETAIL_LOAD_ERROR}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
            {FINANCE_TEXT.RETRY}
          </Button>
        </div>
      ) : null}

      {status === PRODUCT_DETAIL_STATUS.EMPTY ? (
        <p className="text-sm text-tacha-textsec">{PRODUCT_HISTORY_TEXT.DETAIL_EMPTY}</p>
      ) : null}

      {status === PRODUCT_DETAIL_STATUS.READY ? (
        <ul
          aria-label={listLabel}
          className="divide-y divide-tacha-border overflow-hidden rounded-tacha-card border border-tacha-border bg-tacha-surface"
        >
          {purchases.map((purchase) => (
            <li key={purchase.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium text-tacha-text">{purchase.dateText}</p>
                <p className="break-words text-sm text-tacha-textsec">{purchase.storeText}</p>
                <p className="break-words text-sm text-tacha-textsec">{purchase.appearanceText}</p>
              </div>
              <div className="shrink-0">
                {purchase.hasNoTotal ? (
                  <Chip tone={CHIP_TONE.TERRACOTTA_STRONG}>{purchase.amountText}</Chip>
                ) : (
                  <p className="text-sm font-semibold text-tacha-text">{purchase.amountText}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
