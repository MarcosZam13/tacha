import type { WeekListAdditionViewModel } from "../../models/week-list-addition.interfaces";

/** Lo que usa el aviso final: las líneas ya armadas y a qué lista va el enlace. */
export type AddWeekToListResultProps = Pick<WeekListAdditionViewModel, "resultLines" | "resultListHref">;
