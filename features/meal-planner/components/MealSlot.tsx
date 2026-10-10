import { MEAL_PLANNER_TEXT } from "../constants/meal-planner.constants";
import type { MealSlotProps } from "./models/MealSlotProps.interface";

const SLOT_BASE_CLASS_NAME =
  "w-full rounded-tacha-badge border px-2 py-3 font-body text-xs transition-colors hover:border-tacha-teal disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-tacha-border";
const EMPTY_SLOT_CLASS_NAME = `${SLOT_BASE_CLASS_NAME} border-dashed border-tacha-border text-center font-semibold text-tacha-textsec`;
const ASSIGNED_SLOT_CLASS_NAME = `${SLOT_BASE_CLASS_NAME} flex flex-col gap-1 border-solid border-tacha-border bg-tacha-surface text-left text-tacha-text`;

/**
 * Un espacio del día. Es un botón: vacío ("+ Almuerzo", borde punteado) abre el
 * diálogo para asignar, y asignado (receta, cocinero y ×N) lo abre para cambiar
 * o quitar. Solo presentación: los textos ya vienen armados.
 *
 * Botón nativo y no el `Button` compartido: el espacio es una tarjeta que
 * contiene varias líneas y no una acción con texto de una línea (el compartido
 * es un pill). Su nombre accesible completo ("Almuerzo del lunes 12, vacío,
 * asignar") reemplaza al contenido para el lector de pantalla; el "+" es decorativo.
 */
export const MealSlot = ({ entry, isDisabled, label, onOpen, slot }: MealSlotProps): React.JSX.Element => (
  <li>
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onOpen}
      className={entry ? ASSIGNED_SLOT_CLASS_NAME : EMPTY_SLOT_CLASS_NAME}
    >
      {entry ? (
        <>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-tacha-teal">{slot.label}</span>
          <span className="block truncate text-xs font-semibold">{entry.recipeName}</span>
          {entry.cookLabel ? <span className="block text-[11px] text-tacha-textsec">{entry.cookLabel}</span> : null}
          {entry.multiplierLabel ? (
            <span className="inline-block self-start rounded-tacha-chip bg-tacha-chipbg px-2 py-0.5 text-[11px] font-medium">
              {entry.multiplierLabel}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <span aria-hidden="true">{MEAL_PLANNER_TEXT.EMPTY_SLOT_MARK} </span>
          {slot.label}
        </>
      )}
    </button>
  </li>
);
