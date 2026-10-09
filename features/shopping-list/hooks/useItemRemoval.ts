import { useEffect, useEffectEvent, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { ITEM_REMOVAL } from "../constants/shopping-list.constants";

interface UseItemRemovalParams {
  /** Borra en la base. No lanza: si falla, el item vuelve a la lista con su error. */
  removeItem: (itemId: string) => Promise<void>;
}

interface UseItemRemovalReturn {
  cancelRemoval: () => void;
  /** Filas que no se muestran: la que tiene el toast y las que se están borrando en la base. */
  hiddenItemIds: string[];
  requestRemoval: (itemId: string) => void;
  /** La fila que todavía se puede recuperar con "Deshacer" (null si no hay toast). */
  undoItemId: NullableRef<string>;
}

/**
 * Eliminar con deshacer. Tocar eliminar solo oculta la fila y muestra el
 * toast; el borrado en la base sale cuando vence el plazo. Deshacer no
 * escribe nada: deja de ocultarla.
 */
export const useItemRemoval = ({ removeItem }: UseItemRemovalParams): UseItemRemovalReturn => {
  const [undoItemId, setUndoItemId] = useState<NullableRef<string>>(null);
  // Siguen ocultas mientras viaja el borrado: si se mostraran al vencer el
  // toast, la fila reaparecería un instante antes de que la base confirme.
  const [deletingItemIds, setDeletingItemIds] = useState<string[]>([]);

  const commitRemoval = (itemId: string): void => {
    setDeletingItemIds((currentIds) => [...currentIds, itemId]);
    // Si la base confirma, removeItem ya la sacó de la lista; si falla, sigue
    // en la lista y al dejar de ocultarla vuelve a verse.
    void removeItem(itemId).finally(() =>
      setDeletingItemIds((currentIds) => currentIds.filter((currentId) => currentId !== itemId)),
    );
  };

  // useEffectEvent: el temporizador y la salida usan siempre la versión
  // actual de commitRemoval, sin que el efecto se reinicie en cada render.
  const onUndoWindowEnded = useEffectEvent((itemId: string) => {
    setUndoItemId(null);
    commitRemoval(itemId);
  });

  const onScreenLeft = useEffectEvent(() => {
    if (undoItemId) commitRemoval(undoItemId);
  });

  useEffect(() => {
    if (!undoItemId) return undefined;
    const timeoutId = setTimeout(() => onUndoWindowEnded(undoItemId), ITEM_REMOVAL.UNDO_WINDOW_MS);
    // Deshacer o eliminar otra fila cambia undoItemId: este temporizador ya no corresponde.
    return () => clearTimeout(timeoutId);
  }, [undoItemId]);

  // Si se sale de la pantalla con un toast activo, el borrado se manda igual:
  // el usuario ya vio desaparecer el producto.
  useEffect(() => () => onScreenLeft(), []);

  const requestRemoval = (itemId: string): void => {
    // Un solo toast a la vez: el que estaba esperando se borra ya.
    if (undoItemId && undoItemId !== itemId) commitRemoval(undoItemId);
    setUndoItemId(itemId);
  };

  const cancelRemoval = (): void => {
    setUndoItemId(null);
  };

  return {
    cancelRemoval,
    hiddenItemIds: undoItemId ? [undoItemId, ...deletingItemIds] : deletingItemIds,
    requestRemoval,
    undoItemId,
  };
};
