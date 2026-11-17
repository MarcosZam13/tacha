import { useEffect, useRef } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import {
  FINANCE_TEXT,
  PRODUCT_HISTORY_TEXT,
  PRODUCT_LIST_STATUS,
  PRODUCT_MORE_STATUS,
} from "../constants/finance.constants";
import type { ProductPurchaseListProps } from "./models/ProductPurchaseListProps.interface";
import { ProductPurchaseRow } from "./ProductPurchaseRow";

/**
 * La lista de productos comprados (CA-01) con "Cargar más" (D35). Cada estado
 * de SPEC §6 tiene su lugar: carga, vacío, sin resultados, error con
 * "Reintentar" y, si falla "Cargar más", el error junto al botón sin perder lo
 * cargado (§7).
 *
 * Foco de "Cargar más" (SPEC §9): queda en el botón; si el botón desaparece
 * porque ya no falta nada, pasa al primer producto nuevo.
 */
export const ProductPurchaseList = ({
  hasMore,
  moreStatus,
  onLoadMore,
  onRetry,
  onRetryMore,
  rows,
  status,
}: ProductPurchaseListProps): React.JSX.Element | null => {
  const listRef = useRef<HTMLUListElement>(null);
  // Cuántos productos había al tocar "Cargar más": el siguiente es el primero nuevo.
  const firstNewIndexRef = useRef<NullableRef<number>>(null);

  useEffect(() => {
    const firstNewIndex = firstNewIndexRef.current;
    if (firstNewIndex === null || moreStatus === PRODUCT_MORE_STATUS.LOADING_MORE) return;
    firstNewIndexRef.current = null;
    if (hasMore || rows.length <= firstNewIndex) return;
    listRef.current?.querySelectorAll<HTMLButtonElement>(":scope > li > button").item(firstNewIndex)?.focus();
  }, [hasMore, moreStatus, rows.length]);

  const handleLoadMore = (): void => {
    firstNewIndexRef.current = rows.length;
    onLoadMore();
  };
  const handleRetryMore = (): void => {
    firstNewIndexRef.current = rows.length;
    onRetryMore();
  };

  if (status === PRODUCT_LIST_STATUS.LOADING) return <Spinner label={PRODUCT_HISTORY_TEXT.LOADING} />;

  if (status === PRODUCT_LIST_STATUS.FAILED) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="font-body text-sm text-red-600">
          {PRODUCT_HISTORY_TEXT.LOAD_ERROR}
        </p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
          {FINANCE_TEXT.RETRY}
        </Button>
      </div>
    );
  }

  if (status === PRODUCT_LIST_STATUS.EMPTY || status === PRODUCT_LIST_STATUS.NO_MATCHES) {
    return (
      <p className="rounded-tacha-card border border-dashed border-tacha-border px-4 py-8 font-body text-sm text-tacha-textsec">
        {status === PRODUCT_LIST_STATUS.EMPTY ? PRODUCT_HISTORY_TEXT.EMPTY : PRODUCT_HISTORY_TEXT.NO_MATCHES}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <ul
        ref={listRef}
        aria-label={PRODUCT_HISTORY_TEXT.LIST_LABEL}
        className="w-full divide-y divide-tacha-border overflow-hidden rounded-tacha-card border border-tacha-border bg-tacha-surface"
      >
        {rows.map((row) => (
          <ProductPurchaseRow key={row.id} {...row} />
        ))}
      </ul>
      {moreStatus === PRODUCT_MORE_STATUS.MORE_FAILED ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="font-body text-sm text-red-600">
            {PRODUCT_HISTORY_TEXT.MORE_ERROR}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleRetryMore}>
            {FINANCE_TEXT.RETRY}
          </Button>
        </div>
      ) : null}
      {hasMore && moreStatus !== PRODUCT_MORE_STATUS.MORE_FAILED ? (
        // Sin deshabilitar mientras carga: un botón deshabilitado pierde el foco
        // (SPEC §9). El hook ya ignora el toque si hay un bloque en camino.
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleLoadMore}>
          {moreStatus === PRODUCT_MORE_STATUS.LOADING_MORE ? PRODUCT_HISTORY_TEXT.LOADING_MORE : PRODUCT_HISTORY_TEXT.LOAD_MORE}
        </Button>
      ) : null}
    </div>
  );
};
