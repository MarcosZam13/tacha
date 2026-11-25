import { calendarDaysBetween } from "@/utils/calendarDaysBetween";

/**
 * Días del calendario local que faltan hasta que se acaba: 0 si se acaba hoy.
 * Nunca negativo: lo pospuesto con la ✕ ya pasó su fecha y se muestra como
 * "Se acaba hoy", en "Vence pronto" (SPEC §5.1).
 */
export const toDaysLeft = (expectedOutAt: string, now: Date): number =>
  Math.max(0, calendarDaysBetween(now, new Date(expectedOutAt)));
