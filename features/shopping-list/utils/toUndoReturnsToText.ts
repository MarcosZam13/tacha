import { UNDO_UNCHECK_TEXT } from "../constants/shortfall-resolution.constants";
import type { ShortfallSnapshot } from "../models/shortfall-resolution.types";

/** "La fila vuelve a 1 × Leche Dos Pinos (1000 ml)." para el diálogo de deshacer (regla 45). */
export const toUndoReturnsToText = (productName: string, snapshot: ShortfallSnapshot): string =>
  `${UNDO_UNCHECK_TEXT.RETURNS_TO} ${snapshot.previousQuantity}${UNDO_UNCHECK_TEXT.QUANTITY_SEPARATOR}${productName} (${snapshot.previousSizeLabel}).`;
