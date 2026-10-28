import type { NullableUndefined } from "@/types/nullable.types";
import { INACTIVITY } from "../constants/login.constants";

/**
 * Minutos de inactividad permitidos, a partir del texto crudo de la variable de entorno.
 * Cualquier valor ausente, vacío, no numérico o fuera de [mínimo, máximo] usa el valor por defecto:
 * `Number("")` es 0 y cerraría la sesión al instante, y uno enorme desbordaría el temporizador.
 */
export const parseInactivityLimit = (raw: NullableUndefined<string>): number => {
  const minutes = Number(raw);

  return Number.isFinite(minutes) &&
    minutes >= INACTIVITY.MIN_MINUTES &&
    minutes <= INACTIVITY.MAX_MINUTES
    ? minutes
    : INACTIVITY.DEFAULT_MINUTES;
};
