import type { WeekListAdditionViewModel } from "../../models/week-list-addition.interfaces";

/** Lo que usa el botón: si se puede usar y qué hace al tocarlo. */
export type AddWeekToListButtonProps = Pick<WeekListAdditionViewModel, "canOpen" | "onOpen">;
