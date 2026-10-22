import { APP_ROUTE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";
import { getSafeReturnPath } from "@/utils/returnPath.utils";

/**
 * A dónde ir después de un login exitoso (SCRUM-136): a la ruta de la que venía el usuario
 * (parámetro next) si es una ruta interna segura; si no, adentro de la app, a la lista
 * general (SCRUM-135), nunca a la landing.
 */
export const resolvePostLoginRoute = (returnPath?: NullableUndefined<string>): string =>
  getSafeReturnPath(returnPath) ?? APP_ROUTE.LIST;
