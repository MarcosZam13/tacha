import type { WeekListAdditionViewModel } from "../../models/week-list-addition.interfaces";

/** Lo que usa la confirmación: la frase, el selector de lista, los errores y las acciones. */
export type AddWeekToListDialogProps = Pick<
  WeekListAdditionViewModel,
  | "confirmMessage"
  | "dateListOptions"
  | "destination"
  | "errorMessage"
  | "hasOptionsError"
  | "isAdding"
  | "isLoadingOptions"
  | "isOpen"
  | "onClose"
  | "onConfirm"
  | "onDestinationChange"
  | "onOptionsRetry"
>;
