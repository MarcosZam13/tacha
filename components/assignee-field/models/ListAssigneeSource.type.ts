import type { ASSIGNEE_LIST_SOURCE } from "../constants/assignee-field.constants";

/** La lista general que le toca a quien llama, o una lista concreta (por ejemplo una sublista por fecha). */
export type ListAssigneeSource =
  | { kind: typeof ASSIGNEE_LIST_SOURCE.GENERAL }
  | { kind: typeof ASSIGNEE_LIST_SOURCE.LIST; listId: string };
