import type { NullableRef } from "@/types/nullable.types";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";
import type { AssigneeCandidate } from "../models/AssigneeCandidate.interface";

export interface AssigneeOption {
  /** `null` es "Sin asignar". */
  assigneeId: NullableRef<string>;
  label: string;
}

/**
 * Las opciones del selector: "Sin asignar" primero y después una por cada persona con acceso a la lista. A
 * quien llama se le agrega "(tú)"; una cuenta sin nombre en el registro se ve "Sin nombre".
 */
export const toAssigneeOptions = (candidates: AssigneeCandidate[]): AssigneeOption[] => [
  { assigneeId: null, label: ASSIGNEE_TEXT.UNASSIGNED },
  ...candidates.map((candidate) => {
    const name = candidate.displayName ?? ASSIGNEE_TEXT.UNNAMED;

    return {
      assigneeId: candidate.userId,
      label: candidate.isCurrentUser ? `${name} ${ASSIGNEE_TEXT.CURRENT_USER_SUFFIX}` : name,
    };
  }),
];
