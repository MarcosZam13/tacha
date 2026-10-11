import type { WeekListAdditionViewModel } from "../../models/week-list-addition.interfaces";

/** Lo que usa la confirmación: la frase, el error y las tres acciones. */
export type AddWeekToListDialogProps = Pick<
  WeekListAdditionViewModel,
  "confirmMessage" | "errorMessage" | "isAdding" | "isOpen" | "onClose" | "onConfirm"
>;
