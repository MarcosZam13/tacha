import { MealPlannerDay } from "./MealPlannerDay";
import type { WeekGridProps } from "./models/WeekGridProps.type";

/**
 * Los 7 días de la semana. Un solo HTML: apilados en mobile y en 7 columnas
 * desde `md`, igual que el shell (sin medir el ancho en JS ni duplicar los 21
 * espacios en el DOM).
 */
export const WeekGrid = ({ days }: WeekGridProps): React.JSX.Element => (
  <ul className="flex flex-col gap-4 md:grid md:grid-cols-7 md:gap-2">
    {days.map((day) => (
      <MealPlannerDay key={day.dateKey} day={day} />
    ))}
  </ul>
);
