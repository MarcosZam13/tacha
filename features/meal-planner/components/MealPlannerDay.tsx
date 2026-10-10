import { MealSlot } from "./MealSlot";
import type { MealPlannerDayProps } from "./models/MealPlannerDayProps.interface";

/**
 * Un día de la semana: su etiqueta con la fecha y sus 3 espacios. Solo
 * presentación: los textos ya vienen armados desde utils/buildWeek.ts.
 *
 * La etiqueta es larga en mobile ("Lunes 12") y corta en desktop ("Lun 12");
 * las dos están en el HTML y el CSS muestra una, así que no se mide el ancho
 * en JS. Hoy se dice con aria-current="date", no solo con el color.
 */
export const MealPlannerDay = ({ day }: MealPlannerDayProps): React.JSX.Element => (
  <li className="flex flex-col gap-2">
    <time
      dateTime={day.dateKey}
      aria-current={day.isToday ? "date" : undefined}
      className={`border-b-2 pb-1 font-body text-xs font-bold md:text-center ${
        day.isToday ? "border-tacha-teal text-tacha-teal" : "border-tacha-border text-tacha-textsec"
      }`}
    >
      <span className="md:hidden">{day.longLabel}</span>
      <span className="hidden md:inline">{day.shortLabel}</span>
    </time>
    <ul className="flex flex-col gap-2">
      {day.slots.map((slot) => (
        <MealSlot key={slot.mealType} slot={slot} />
      ))}
    </ul>
  </li>
);
