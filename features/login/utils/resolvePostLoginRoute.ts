import { APP_ROUTE } from "@/constants";
import type { AppRouteType } from "@/constants";

/**
 * A dónde ir después de un login exitoso: adentro de la app, no a la landing.
 * Punto de extensión de SCRUM-136: va a recibir la URL de retorno y devolverla
 * si es una ruta interna válida, con prioridad sobre este default.
 */
export const resolvePostLoginRoute = (): AppRouteType => APP_ROUTE.LIST;
