import { useEffect, useState } from "react";
import {
  LIST_SETTINGS_STATUS,
  SET_ASSIGNEE_ENABLED_RESULT,
  SET_ASSIGNEE_ENABLED_RESULT_MESSAGE,
} from "../constants/list-settings.constants";
import type { ListSettingsStatusType } from "../constants/list-settings.constants";
import type { ListSettingsViewModel } from "../models/ListSettingsViewModel.interface";
import type { SettableList } from "../models/SettableList.interface";
import { getSettableLists, setAssigneeEnabled } from "../services/list-settings.service";

/**
 * La pantalla de Configuración (SCRUM-108): carga las listas con su ajuste y guarda el interruptor de cada una.
 * El interruptor cambia solo cuando la base confirma, así que un fallo no deja un valor falso en pantalla; el
 * error se ve junto a esa lista. Cada lista guarda por separado (SPEC §6).
 */
export const useListSettingsViewModel = (): ListSettingsViewModel => {
  const [lists, setLists] = useState<SettableList[]>([]);
  const [status, setStatus] = useState<ListSettingsStatusType>(LIST_SETTINGS_STATUS.LOADING);
  const [savingListIds, setSavingListIds] = useState<string[]>([]);
  const [errorByListId, setErrorByListId] = useState<Record<string, string>>({});
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // Si la pantalla se cierra antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;

    getSettableLists()
      .then((loadedLists) => {
        if (isCancelled) return;
        setLists(loadedLists);
        setStatus(loadedLists.length === 0 ? LIST_SETTINGS_STATUS.EMPTY : LIST_SETTINGS_STATUS.READY);
      })
      .catch(() => {
        if (!isCancelled) setStatus(LIST_SETTINGS_STATUS.ERROR);
      });

    return () => {
      isCancelled = true;
    };
  }, [reloadCount]);

  const onRetry = (): void => {
    setStatus(LIST_SETTINGS_STATUS.LOADING);
    setReloadCount((count) => count + 1);
  };

  const onToggle = (listId: string): void => {
    const list = lists.find((candidate) => candidate.id === listId);
    // Un guardado en curso de esa lista no se repite (doble toque).
    if (!list || savingListIds.includes(listId)) return;

    const nextEnabled = !list.isEnabled;
    setSavingListIds((ids) => [...ids, listId]);
    setErrorByListId((current) =>
      Object.fromEntries(Object.entries(current).filter(([errorListId]) => errorListId !== listId)),
    );

    // El servicio no lanza: devuelve el resultado y acá se decide qué mostrar.
    void setAssigneeEnabled(listId, nextEnabled).then((result) => {
      setSavingListIds((ids) => ids.filter((savingId) => savingId !== listId));

      if (result === SET_ASSIGNEE_ENABLED_RESULT.SAVED) {
        setLists((current) =>
          current.map((candidate) => (candidate.id === listId ? { ...candidate, isEnabled: nextEnabled } : candidate)),
        );
        return;
      }

      setErrorByListId((current) => ({ ...current, [listId]: SET_ASSIGNEE_ENABLED_RESULT_MESSAGE[result] }));
      // La lista ya no existe: se vuelve a leer para que desaparezca de la pantalla.
      if (result === SET_ASSIGNEE_ENABLED_RESULT.NOT_FOUND) setReloadCount((count) => count + 1);
    });
  };

  return { errorByListId, lists, onRetry, onToggle, savingListIds, status };
};
