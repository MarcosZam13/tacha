import type { NullableRef } from "@/types/nullable.types";
import {
  SHORTFALL_PANEL_STATUS,
  SHORTFALL_RESOLUTION,
  UNDO_UNCHECK_STATUS,
} from "../constants/shortfall-resolution.constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShortfallPanelViewModel, UndoUncheckViewModel } from "../models/shortfall-resolution.types";
import { toShortfallNote } from "../utils/toShortfallNote";
import { toUndoReturnsToText } from "../utils/toUndoReturnsToText";
import { useShortfallResolution } from "./useShortfallResolution";
import { useUncheckWithUndo } from "./useUncheckWithUndo";

interface UseShortfallFlowViewModelParams {
  items: ShoppingListItem[];
  reload: () => Promise<NullableRef<ShoppingListItem[]>>;
}

interface UseShortfallFlowViewModelReturn {
  /** Tachar una fila con avisos, ya confirmado por la base: abre "¿Qué hiciste?". */
  openPanelFor: (itemId: string) => void;
  /** Tocar una fila tachada que el panel cambió: pide confirmar el deshacer. */
  requestUndo: (itemId: string) => void;
  shortfallPanel: ShortfallPanelViewModel;
  undoUncheck: UndoUncheckViewModel;
}

const findItem = (items: ShoppingListItem[], itemId: NullableRef<string>): NullableRef<ShoppingListItem> =>
  items.find((item) => item.id === itemId) ?? null;

/**
 * Facade del flujo de faltantes al tachar (SCRUM-115): une el panel "¿Qué
 * hiciste?" y el diálogo de destachar con deshacer, y le entrega a la
 * pantalla lo que dibuja, ya calculado. La fila se busca siempre en la lista,
 * así el panel muestra sus avisos actuales después de recargar.
 */
export const useShortfallFlowViewModel = ({
  items,
  reload,
}: UseShortfallFlowViewModelParams): UseShortfallFlowViewModelReturn => {
  const resolution = useShortfallResolution({ items, reload });
  const undo = useUncheckWithUndo({ reload });

  const panelState = resolution.state;
  const panelItemId = panelState.status === SHORTFALL_PANEL_STATUS.CLOSED ? null : panelState.itemId;
  const panelItem = findItem(items, panelItemId);
  // Si otro cambio dejó la fila sin tachar o fuera de la lista, el panel no se dibuja.
  const isPanelOpen = panelItem !== null && panelItem.checkedAt !== null;

  const undoState = undo.state;
  const undoItemId = undoState.status === UNDO_UNCHECK_STATUS.CLOSED ? null : undoState.itemId;
  const undoItem = findItem(items, undoItemId);
  const undoSnapshot = undoItem?.shortfallSnapshot ?? null;

  return {
    openPanelFor: resolution.openFor,
    requestUndo: undo.request,
    shortfallPanel: {
      errorMessage: panelState.status === SHORTFALL_PANEL_STATUS.FAILED ? panelState.errorMessage : null,
      hasNoOtherPresentations:
        panelState.status === SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION && panelState.presentations.length === 0,
      isBusy: panelState.status === SHORTFALL_PANEL_STATUS.RESOLVING,
      isLoadingPresentations: panelState.status === SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS,
      isOpen: isPanelOpen,
      isStillShort: panelState.status === SHORTFALL_PANEL_STATUS.CHOOSING && panelState.isStillShort,
      isViewingPresentations:
        panelState.status === SHORTFALL_PANEL_STATUS.LOADING_PRESENTATIONS ||
        panelState.status === SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION ||
        panelState.status === SHORTFALL_PANEL_STATUS.PRESENTATIONS_FAILED,
      notes: panelItem?.recipeShortfalls.map(toShortfallNote) ?? [],
      onBack: resolution.back,
      onClose: resolution.close,
      onHadEnough: () => void resolution.choose(SHORTFALL_RESOLUTION.HAD_ENOUGH),
      onOtherPresentation: () => void resolution.requestPresentations(),
      onPickPresentation: (variantId: string) => void resolution.pickPresentation(variantId),
      onRetryPresentations: () => void resolution.requestPresentations(),
      onSameAgain: () => void resolution.choose(SHORTFALL_RESOLUTION.SAME_AGAIN),
      presentations: panelState.status === SHORTFALL_PANEL_STATUS.CHOOSING_PRESENTATION ? panelState.presentations : [],
      presentationsErrorMessage:
        panelState.status === SHORTFALL_PANEL_STATUS.PRESENTATIONS_FAILED ? panelState.errorMessage : null,
      productLabel: panelItem ? `${panelItem.productName} (${panelItem.sizeLabel})` : "",
    },
    undoUncheck: {
      errorMessage: undoState.status === UNDO_UNCHECK_STATUS.FAILED ? undoState.errorMessage : null,
      isOpen: undoItem !== null,
      isReverting: undoState.status === UNDO_UNCHECK_STATUS.REVERTING,
      onCancel: undo.cancel,
      onConfirm: () => void undo.confirm(),
      returnsToText: undoItem && undoSnapshot ? toUndoReturnsToText(undoItem.productName, undoSnapshot) : "",
    },
  };
};
