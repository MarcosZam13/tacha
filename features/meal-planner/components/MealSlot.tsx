import { MEAL_PLANNER_TEXT } from "../constants/meal-planner.constants";
import type { MealSlotProps } from "./models/MealSlotProps.interface";

/**
 * Un espacio vacío del día: "+ Almuerzo", con borde punteado. Es texto y no un
 * botón a propósito: todavía no hace nada (asignar una receta es SCRUM-100) y
 * 21 botones deshabilitados se anunciarían como "no disponible" 21 veces.
 * El "+" es decorativo; el lector de pantalla lee "Almuerzo, vacío".
 */
export const MealSlot = ({ slot }: MealSlotProps): React.JSX.Element => (
  <li className="rounded-tacha-badge border border-dashed border-tacha-border px-2 py-3 text-center font-body text-xs font-semibold text-tacha-textsec">
    <span aria-hidden="true">{MEAL_PLANNER_TEXT.EMPTY_SLOT_MARK} </span>
    {slot.label}
    <span className="sr-only">{MEAL_PLANNER_TEXT.EMPTY_SLOT_SCREEN_READER}</span>
  </li>
);
