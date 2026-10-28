/**
 * Un ítem de la navegación está activo en su ruta y en sus subrutas
 * (`/recetas/nueva` activa "Recetas"). Se compara contra `href + "/"` para que
 * una ruta que solo empieza con las mismas letras (`/listas-privadas`) no
 * active a `/lista`.
 */
export const isRouteActive = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
