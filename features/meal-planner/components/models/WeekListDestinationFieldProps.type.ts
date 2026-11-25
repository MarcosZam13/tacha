import type { WeekListAdditionViewModel } from "../../models/week-list-addition.interfaces";

/** Lo que usa el selector de lista: las opciones, la elegida y cómo cambiarla. */
export type WeekListDestinationFieldProps = Pick<
  WeekListAdditionViewModel,
  "dateListOptions" | "destination" | "isAdding" | "onDestinationChange"
>;
