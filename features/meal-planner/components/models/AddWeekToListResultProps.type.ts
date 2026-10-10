import type { WeekListAdditionViewModel } from "../../models/week-list-addition.interfaces";

/** Lo que usa el aviso final: las líneas ya armadas. */
export type AddWeekToListResultProps = Pick<WeekListAdditionViewModel, "resultLines">;
