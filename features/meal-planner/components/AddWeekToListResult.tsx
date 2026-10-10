import Link from "next/link";
import { WEEK_LIST_ROUTE, WEEK_LIST_TEXT } from "../constants/meal-planner.constants";
import type { AddWeekToListResultProps } from "./models/AddWeekToListResultProps.type";

/**
 * Aviso de que la semana se agregó a la lista, con el enlace "Ver lista". No
 * dibuja nada si no hay resumen para la semana a la vista. role="status": aparece
 * sin que cambie la página, así que el lector de pantalla lo anuncia solo.
 * Solo presentación: las líneas ya vienen armadas desde utils/toWeekAdditionSummary.ts.
 */
export const AddWeekToListResult = ({ resultLines }: AddWeekToListResultProps): React.JSX.Element | null => {
  if (!resultLines) return null;

  return (
    <div role="status" className="flex flex-col gap-1 font-body text-sm text-tacha-textsec">
      {resultLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <Link href={WEEK_LIST_ROUTE.LIST} className="self-start font-semibold text-tacha-teal hover:underline">
        {WEEK_LIST_TEXT.VIEW_LIST}
      </Link>
    </div>
  );
};
