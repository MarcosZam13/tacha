import { NextResponse } from "next/server";
import { HTTP_STATUS, IS_DEV_TOOLS_ENABLED } from "@/constants";

/**
 * Corta las herramientas de desarrollo (/debug y /ui-kit) en producción antes
 * de que se renderice nada (SCRUM-125).
 *
 * Los layouts de (debug) y (demo) ya llaman a notFound(), pero eso solo da un
 * 404 real mientras la respuesta no empezó a transmitirse: un loading.tsx
 * arriba del layout la convertiría en un 200 con la pantalla de 404. El proxy
 * corre antes del render, así que el código HTTP no depende de cómo esté
 * armada la ruta. Los layouts se quedan como segunda capa.
 *
 * En desarrollo deja pasar todo: las rutas cargan igual que siempre.
 */
export function proxy(): NextResponse {
  if (IS_DEV_TOOLS_ENABLED) return NextResponse.next();

  return new NextResponse(null, { status: HTTP_STATUS.NOT_FOUND });
}

// Solo estas rutas pasan por el proxy; el resto de la app ni lo ejecuta.
// Next lee el matcher al compilar: tienen que ser literales, no constantes
// importadas. ":path*" incluye la ruta sola (/debug) y cualquier subruta.
export const config = {
  matcher: ["/debug/:path*", "/ui-kit/:path*"],
};
