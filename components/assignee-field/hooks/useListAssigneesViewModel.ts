import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  ASSIGNEE_LIST_SOURCE,
  ASSIGNEE_TEXT,
  SET_ITEM_ASSIGNEE_RESULT,
} from "../constants/assignee-field.constants";
import type { SetItemAssigneeResultType } from "../constants/assignee-field.constants";
import type { ListAssigneeData } from "../models/ListAssigneeData.interface";
import type { ListAssigneeSource } from "../models/ListAssigneeSource.type";
import type { ListAssigneeViewModel } from "../models/ListAssigneeViewModel.interface";
import { getListAssigneeData, setItemAssignee } from "../services/assignee.service";
import { toAssigneeName } from "../utils/toAssigneeName";

// Hasta que llega la respuesta, y si falla, el campo no se dibuja: es opcional y no debe estorbar a la lista
// ni parpadear apagado → encendido (SPEC §5, regla 12).
const NO_ASSIGNEES: ListAssigneeData = { assignments: {}, candidates: [], isEnabled: false };

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
  const [data, setData] = useState<ListAssigneeData>(NO_ASSIGNEES);
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);
  const [openItemId, setOpenItemId] = useState<NullableRef<string>>(null);
  const [savingItemId, setSavingItemId] = useState<NullableRef<string>>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // Dependencias primitivas: el objeto `source` cambia de identidad en cada render.
  const listId = source.kind === ASSIGNEE_LIST_SOURCE.LIST ? source.listId : null;

  useEffect(() => {
    // Si la pantalla se cierra, o cambia de lista, antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;
    const currentSource: ListAssigneeSource =
      listId === null ? { kind: ASSIGNEE_LIST_SOURCE.GENERAL } : { kind: ASSIGNEE_LIST_SOURCE.LIST, listId };

    getListAssigneeData(currentSource)
      .then((loaded) => {
        if (!isCancelled) setData(loaded);
      })
      .catch(() => {
        if (!isCancelled) setData(NO_ASSIGNEES);
      });

    return () => {
      isCancelled = true;
    };
  }, [listId, reloadCount]);

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
        setData((previous) => ({ ...previous, assignments: withAssignee(previous.assignments, itemId, assigneeId) }));
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
