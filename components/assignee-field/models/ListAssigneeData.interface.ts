import type { AssigneeCandidate } from "./AssigneeCandidate.interface";

/** Lo que la pantalla de una lista necesita saber para dibujar el campo "Encargado". */
export interface ListAssigneeData {
  /** Id del producto → id del encargado. Solo los productos que tienen uno. */
  assignments: Record<string, string>;
  candidates: AssigneeCandidate[];
  /** El ajuste de la lista: sin fila en `list_settings` cuenta como apagado. */
  isEnabled: boolean;
}
