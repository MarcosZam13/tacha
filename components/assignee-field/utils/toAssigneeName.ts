import type { NullableRef } from "@/types/nullable.types";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";
import type { AssigneeCandidate } from "../models/AssigneeCandidate.interface";

/**
 * El texto que muestra el campo: el nombre del encargado, "Sin nombre" si su cuenta no guardó uno, o
 * "Sin asignar" si no hay encargado. Un encargado que ya no tiene acceso a la lista (salió de la familia) no
 * está entre los candidatos y también se ve "Sin asignar": el dato queda guardado y no se reescribe (SPEC §5,
 * regla 8).
 */
export const toAssigneeName = (candidates: AssigneeCandidate[], assigneeId: NullableRef<string>): string => {
  if (assigneeId === null) return ASSIGNEE_TEXT.UNASSIGNED;

  const assignee = candidates.find((candidate) => candidate.userId === assigneeId);
  if (!assignee) return ASSIGNEE_TEXT.UNASSIGNED;

  return assignee.displayName ?? ASSIGNEE_TEXT.UNNAMED;
};
