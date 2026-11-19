import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  ASSIGNEE_LIST_SOURCE,
  ASSIGNEE_TEXT,
  NO_LIST_ASSIGNEES,
  SET_ITEM_ASSIGNEE_RESULT,
} from "../constants/assignee-field.constants";
import type { SetItemAssigneeResultType } from "../constants/assignee-field.constants";
import type { ListAssigneeData } from "../models/ListAssigneeData.interface";
import type { ListAssigneeSource } from "../models/ListAssigneeSource.type";
import type { ListAssigneeViewModel } from "../models/ListAssigneeViewModel.interface";
import { getListAssigneeData, setItemAssignee } from "../services/assignee.service";
import { toAssigneeName } from "../utils/toAssigneeName";

// Lo leído de una lista, con la clave de la lista a la que pertenece: si la pantalla pasa a otra lista (el mismo
// componente con otro `listId`), lo de la anterior no se ve ni recibe respuestas de la nueva.
interface LoadedAssignees {
  data: ListAssigneeData;
  key: string;
}

const FAILURE_MESSAGE: Partial<Record<SetItemAssigneeResultType, string>> = {
  [SET_ITEM_ASSIGNEE_RESULT.ERROR]: ASSIGNEE_TEXT.ERROR_SAVE,
  [SET_ITEM_ASSIGNEE_RESULT.NOT_ALLOWED]: ASSIGNEE_TEXT.ERROR_NOT_ALLOWED,
  [SET_ITEM_ASSIGNEE_RESULT.NOT_FOUND]: ASSIGNEE_TEXT.LIST_UPDATED,
};

const withAssignee = (
  assignments: Record<string, string>,
  itemId: string,
  assigneeId: NullableRef<string>,
): Record<string, string> => {
  const others = Object.entries(assignments).filter(([assignedItemId]) => assignedItemId !== itemId);

  return Object.fromEntries(assigneeId === null ? others : [...others, [itemId, assigneeId]]);
};

/**
 * El campo "Encargado" de una pantalla de lista (SCRUM-108): carga el ajuste de la lista y, si está encendido,
 * quién es encargado de cada producto y quiénes se pueden elegir. Los productos se leen aparte de los de la
 * pantalla, así la lista no cambia su carga ni su estado. Un solo selector abierto a la vez (regla 9) y elegir
 * guarda de inmediato.
 */
export const useListAssigneesViewModel = (source: ListAssigneeSource): ListAssigneeViewModel => {
  // Dependencias primitivas: el objeto `source` cambia de identidad en cada render.
  const listId = source.kind === ASSIGNEE_LIST_SOURCE.LIST ? source.listId : null;
  const listKey = listId ?? ASSIGNEE_LIST_SOURCE.GENERAL;

  const [loaded, setLoaded] = useState<LoadedAssignees>({ data: NO_LIST_ASSIGNEES, key: listKey });
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);
  const [openItemId, setOpenItemId] = useState<NullableRef<string>>(null);
  const [savingItemId, setSavingItemId] = useState<NullableRef<string>>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const data = loaded.key === listKey ? loaded.data : NO_LIST_ASSIGNEES;

  useEffect(() => {
    // Si la pantalla se cierra, o cambia de lista, antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;
    const currentSource: ListAssigneeSource =
      listId === null ? { kind: ASSIGNEE_LIST_SOURCE.GENERAL } : { kind: ASSIGNEE_LIST_SOURCE.LIST, listId };

    getListAssigneeData(currentSource)
      .then((loadedData) => {
        if (!isCancelled) setLoaded({ data: loadedData, key: listKey });
      })
      .catch(() => {
        if (!isCancelled) setLoaded({ data: NO_LIST_ASSIGNEES, key: listKey });
      });

    return () => {
      isCancelled = true;
    };
  }, [listId, listKey, reloadCount]);

  const isSaving = savingItemId !== null;

  const selectedIdOf = (itemId: string): NullableRef<string> => data.assignments[itemId] ?? null;

  const onOpen = (itemId: string): void => {
    if (isSaving) return;
    setErrorMessage(null);
    setOpenItemId(itemId);
  };

  const onClose = (): void => {
    if (isSaving) return;
    setErrorMessage(null);
    setOpenItemId(null);
  };

  const onSelect = (itemId: string, assigneeId: NullableRef<string>): void => {
    if (isSaving) return;
    setSavingItemId(itemId);
    setErrorMessage(null);

    // El servicio no lanza: devuelve el resultado y acá se decide qué mostrar.
    void setItemAssignee({ assigneeId, itemId }).then((result) => {
      setSavingItemId(null);

      if (result === SET_ITEM_ASSIGNEE_RESULT.SAVED) {
        // Solo si la pantalla sigue en la misma lista: una respuesta tardía no escribe en la lista nueva.
        setLoaded((previous) =>
          previous.key === listKey
            ? { ...previous, data: { ...previous.data, assignments: withAssignee(previous.data.assignments, itemId, assigneeId) } }
            : previous,
        );
        setOpenItemId(null);
        return;
      }

      // El selector sigue abierto con el motivo; si la lista cambió, se vuelven a leer los datos.
      setErrorMessage(FAILURE_MESSAGE[result] ?? ASSIGNEE_TEXT.ERROR_SAVE);
      if (result !== SET_ITEM_ASSIGNEE_RESULT.ERROR) setReloadCount((count) => count + 1);
    });
  };

  return {
    candidates: data.candidates,
    errorMessage,
    isEnabled: data.isEnabled,
    nameOf: (itemId) => toAssigneeName(data.candidates, selectedIdOf(itemId)),
    onClose,
    onOpen,
    onSelect,
    openItemId,
    savingItemId,
    selectedIdOf,
  };
};
