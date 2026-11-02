import { useReducer, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  SHORTFALL_PANEL_ACTION,
  SHORTFALL_PANEL_STATUS,
  SHORTFALL_PANEL_TEXT,
  SHORTFALL_RESOLUTION,
} from "../constants/shortfall-resolution.constants";
import type { ShortfallResolutionType } from "../constants/shortfall-resolution.constants";
import type { ShoppingListItem } from "../models/ShoppingListItem.interface";
import type { ShortfallPanelState } from "../models/shortfall-resolution.types";
import { getProductPresentations, resolveShortfall } from "../services/shortfall-resolution.service";
import { INITIAL_SHORTFALL_PANEL_STATE, shortfallPanelReducer } from "../utils/shortfall-panel.reducer";
import { toPresentationOptions } from "../utils/toPresentationOptions";

interface UseShortfallResolutionParams {
  items: ShoppingListItem[];
  reload: () => Promise<NullableRef<ShoppingListItem[]>>;
}

interface UseShortfallResolutionReturn {
  back: () => void;
  choose: (resolution: ShortfallResolutionType) => Promise<void>;
  close: () => void;
  /** "Otro miembro ya cambió este producto…" cuando la base no aplicó lo elegido; null si no. */
  noticeMessage: NullableRef<string>;
  openFor: (itemId: string) => void;
  pickPresentation: (variantId: string) => Promise<void>;
  requestPresentations: () => Promise<void>;
  state: ShortfallPanelState;
}

/**
 * "¿Qué hiciste?" (SCRUM-115, SPEC §18): abrir al tachar, elegir, cargar las
 * presentaciones, guardar y decidir si el panel sigue abierto. Después de
 * guardar se recarga la lista entera: la presentación puede cambiar el nombre
 * y el tamaño de la fila, y los avisos de otras filas del mismo producto
 * también se mueven (regla 39).
 */
export const useShortfallResolution = ({ items, reload }: UseShortfallResolutionParams): UseShortfallResolutionReturn => {
  const [state, dispatch] = useReducer(shortfallPanelReducer, INITIAL_SHORTFALL_PANEL_STATE);
  const [noticeMessage, setNoticeMessage] = useState<NullableRef<string>>(null);
  const itemId = state.status === SHORTFALL_PANEL_STATUS.CLOSED ? null : state.itemId;
  const item = items.find((listedItem) => listedItem.id === itemId) ?? null;
  const isResolving = state.status === SHORTFALL_PANEL_STATUS.RESOLVING;

  const openFor = (targetItemId: string): void => {
    setNoticeMessage(null);
    dispatch({ itemId: targetItemId, type: SHORTFALL_PANEL_ACTION.OPENED });
  };

  // Mientras se guarda no se cierra: la respuesta tiene que llegar a un panel
  // que todavía sabe qué fila era.
  const close = (): void => {
    if (isResolving) return;
    dispatch({ type: SHORTFALL_PANEL_ACTION.CLOSED });
  };

  const back = (): void => {
    dispatch({ type: SHORTFALL_PANEL_ACTION.BACK_TO_CHOICES });
  };

  const save = async (resolution: ShortfallResolutionType, variantId?: string): Promise<void> => {
    // Doble clic: la segunda elección se ignora mientras la primera viaja.
    if (!itemId || isResolving) return;
    dispatch({ type: SHORTFALL_PANEL_ACTION.RESOLVE_STARTED });
    try {
      const { isApplied } = await resolveShortfall({ itemId, resolution, variantId });
      // Otro miembro destachó o borró la fila: no se guardó nada, se dice por qué.
      if (!isApplied) setNoticeMessage(SHORTFALL_PANEL_TEXT.ROW_CHANGED);
      const reloadedItems = await reload();
      const reloadedItem = reloadedItems?.find((listedItem) => listedItem.id === itemId);
      // Seguir abierto solo si se guardó, la fila sigue tachada y todavía le falta algo.
      const isStillShort =
        isApplied && reloadedItem !== undefined && reloadedItem.checkedAt !== null && reloadedItem.recipeShortfalls.length > 0;
      dispatch({ type: isStillShort ? SHORTFALL_PANEL_ACTION.STILL_SHORT : SHORTFALL_PANEL_ACTION.CLOSED });
    } catch {
      dispatch({ errorMessage: SHORTFALL_PANEL_TEXT.RESOLVE_ERROR, type: SHORTFALL_PANEL_ACTION.RESOLVE_FAILED });
    }
  };

  const choose = (resolution: ShortfallResolutionType): Promise<void> => save(resolution);

  const pickPresentation = (variantId: string): Promise<void> =>
    save(SHORTFALL_RESOLUTION.OTHER_PRESENTATION, variantId);

  const requestPresentations = async (): Promise<void> => {
    if (!item) return;
    dispatch({ type: SHORTFALL_PANEL_ACTION.PRESENTATIONS_REQUESTED });
    try {
      const presentationRows = await getProductPresentations(item.variantId);
      // Solo presentaciones en la unidad de los avisos de la fila (regla 37).
      const shortfallUnits = [...new Set(item.recipeShortfalls.map((shortfall) => shortfall.unit))];
      dispatch({
        presentations: toPresentationOptions(presentationRows, item.variantId, shortfallUnits),
        type: SHORTFALL_PANEL_ACTION.PRESENTATIONS_LOADED,
      });
    } catch {
      dispatch({ errorMessage: SHORTFALL_PANEL_TEXT.PRESENTATIONS_ERROR, type: SHORTFALL_PANEL_ACTION.PRESENTATIONS_FAILED });
    }
  };

  return { back, choose, close, noticeMessage, openFor, pickPresentation, requestPresentations, state };
};
