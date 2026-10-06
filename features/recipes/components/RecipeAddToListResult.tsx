import Link from "next/link";
import { RECIPE_ADD_TO_LIST_TEXT, RECIPE_ROUTE } from "../constants/recipes.constants";
import type { RecipeAddToListResultProps } from "./models/RecipeAddToListResultProps.interface";

/**
 * Resumen (o error) de agregar la receta a la lista, dentro de su tarjeta.
 * Solo presentación: las líneas ya vienen armadas desde utils/toAddToListSummaryText.ts.
 * role="status" / role="alert": aparece sin que cambie la página, así que el
 * lector de pantalla lo anuncia solo.
 */
export const RecipeAddToListResult = ({ feedback }: RecipeAddToListResultProps): React.JSX.Element => (
  <div
    role={feedback.isError ? "alert" : "status"}
    className={`flex flex-col gap-1 font-body text-sm ${feedback.isError ? "text-red-600" : "text-tacha-textsec"}`}
  >
    {feedback.messages.map((message) => (
      <p key={message}>{message}</p>
    ))}
    {feedback.isError ? null : (
      <Link href={RECIPE_ROUTE.SHOPPING_LIST} className="self-start font-semibold text-tacha-teal hover:underline">
        {RECIPE_ADD_TO_LIST_TEXT.VIEW_LIST}
      </Link>
    )}
  </div>
);
