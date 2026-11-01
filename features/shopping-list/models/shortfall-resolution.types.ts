import type { CatalogBaseUnitType } from "@/constants";
import type { Database } from "@/types/database.types";
import type { NullableRef } from "@/types/nullable.types";
import type {
  SHORTFALL_PANEL_ACTION,
  SHORTFALL_PANEL_STATUS,
  ShortfallResolutionType,
  UNDO_UNCHECK_STATUS,
} from "../constants/shortfall-resolution.constants";

// Tipos de "¿Qué hiciste?" (SCRUM-115), agrupados por dominio.

/** Una fila de get_general_list_shortfall_snapshots (037), tal como llega de la base. */
export type ShortfallSnapshotRow =
  Database["public"]["Functions"]["get_general_list_shortfall_snapshots"]["Returns"][number];

/** A qué vuelve una fila resuelta al destachar con deshacer (regla 46). */
export interface ShortfallSnapshot {
  previousQuantity: number;
  previousSizeLabel: string;
}

/** Una presentación del producto madre con sus precios, tal como se lee del catálogo. */
export interface PresentationRow {
  baseQuantity: number;
  baseUnit: CatalogBaseUnitType;
  prices: number[];
  variantId: string;
}

/** Lo que dibuja cada botón de la vista de presentaciones, ya ordenado (regla 37). */
export interface PresentationOption {
  /** Tamaño y precio para el lector de pantalla: "3780 ml, ₡2 300 – ₡2 500". */
  accessibleLabel: string;
  priceLabel: string;
  sizeLabel: string;
  variantId: string;
}

export interface ResolveShortfallPayload {
  itemId: string;
  resolution: ShortfallResolutionType;
  /** Solo con "Cambié a otra presentación". */
  variantId?: string;
}

/**
 * Estado del panel. Fuera de `closed` siempre lleva la fila; la fila en sí se
 * busca en la lista, así el panel muestra sus avisos actuales (regla 39).
 */
export type ShortfallPanelState =
  | { status: typeof SHORTFALL_PANEL_STATUS.CLOSED }
  | { status: typeof SHORTFALL_PANEL_STATUS.CHOOSING; isStillShort: boolean; itemId: string }
  | { status: typeof SHORTFALL_PANEL_STATUS.RESOLVING; itemId: string }
  | { status: typeof SHORTFALL_PANEL_STATUS.FAILED; errorMessage: string; itemId: string }
  | { status: typeof SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS; itemId: string }
  | {
      status: typeof SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION;
      itemId: string;
      presentations: PresentationOption[];
    }
  | { status: typeof SHORTFALL_PANEL_STATUS.PRESENTATIONS_FAILED; errorMessage: string; itemId: string };

export type ShortfallPanelAction =
  | { type: typeof SHORTFALL_PANEL_ACTION.BACK_TO_CHOICES }
  | { type: typeof SHORTFALL_PANEL_ACTION.CLOSED }
  | { type: typeof SHORTFALL_PANEL_ACTION.OPENED; itemId: string }
  | { type: typeof SHORTFALL_PANEL_ACTION.PRESENTATIONS_FAILED; errorMessage: string }
  | { type: typeof SHORTFALL_PANEL_ACTION.PRESENTATIONS_LOADED; presentations: PresentationOption[] }
  | { type: typeof SHORTFALL_PANEL_ACTION.PRESENTATIONS_REQUESTED }
  | { type: typeof SHORTFALL_PANEL_ACTION.RESOLVE_FAILED; errorMessage: string }
  | { type: typeof SHORTFALL_PANEL_ACTION.RESOLVE_STARTED }
  | { type: typeof SHORTFALL_PANEL_ACTION.STILL_SHORT };

/** Estado del diálogo de destachar con deshacer (regla 45). */
export type UndoUncheckState =
  | { status: typeof UNDO_UNCHECK_STATUS.CLOSED }
  | { status: typeof UNDO_UNCHECK_STATUS.CONFIRMING; itemId: string }
  | { status: typeof UNDO_UNCHECK_STATUS.REVERTING; itemId: string }
  | { status: typeof UNDO_UNCHECK_STATUS.FAILED; errorMessage: string; itemId: string };

/** Lo que dibuja ShortfallResolutionPanel, ya calculado por el ViewModel. */
export interface ShortfallPanelViewModel {
  errorMessage: NullableRef<string>;
  hasNoOtherPresentations: boolean;
  isBusy: boolean;
  isLoadingPresentations: boolean;
  isOpen: boolean;
  /** Después de elegir, la fila todavía tiene avisos: "Todavía falta:" (regla 39). */
  isStillShort: boolean;
  isViewingPresentations: boolean;
  notes: string[];
  onBack: () => void;
  onClose: () => void;
  onHadEnough: () => void;
  onOtherPresentation: () => void;
  onPickPresentation: (variantId: string) => void;
  onRetryPresentations: () => void;
  onSameAgain: () => void;
  presentations: PresentationOption[];
  presentationsErrorMessage: NullableRef<string>;
  productLabel: string;
}

/** Lo que dibuja UndoResolutionDialog, ya calculado por el ViewModel. */
export interface UndoUncheckViewModel {
  errorMessage: NullableRef<string>;
  isOpen: boolean;
  isReverting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  returnsToText: string;
}
