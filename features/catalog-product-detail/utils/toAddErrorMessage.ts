import { PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";

/**
 * Mensaje de "agregar a mi lista" fallido (plan.md §3.5d). Si ya se alcanzó
 * a sumar alguna cantidad antes de fallar (la base no la revierte), se
 * informa cuánto quedó agregado en vez de un error genérico; si falló desde
 * el principio (quantityAdded 0), el mensaje genérico de siempre.
 */
export const toAddErrorMessage = (quantityAdded: number): string =>
  quantityAdded > 0
    ? `${PRODUCT_DETAIL_TEXT.ADD_ERROR_PARTIAL_PREFIX}${quantityAdded}${PRODUCT_DETAIL_TEXT.ADD_ERROR_PARTIAL_SUFFIX}`
    : PRODUCT_DETAIL_TEXT.ADD_ERROR;
