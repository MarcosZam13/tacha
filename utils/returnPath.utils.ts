import { AUTH_QUERY_PARAM, AUTH_ROUTE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

// Rutas a las que nunca se vuelve después del login: volver a /login sería un ciclo.
const AUTH_ROUTES: readonly string[] = Object.values(AUTH_ROUTE);

// Origen ficticio para resolver la ruta: solo importa saber si se sale de él, no cuál es el real.
// Así la función no depende de window y se puede probar y usar fuera del navegador.
const RESOLVE_BASE_ORIGIN = "http://tacha.invalid";

/**
 * La ruta del login con la ruta a la que volver: /login?next=%2Finvitacion%2F<token>.
 * encodeURIComponent evita que un "?" o un "&" de la ruta se lea como otro parámetro.
 */
export const toLoginRoute = (returnPath: string): string =>
  `${AUTH_ROUTE.LOGIN}?${AUTH_QUERY_PARAM.RETURN_PATH}=${encodeURIComponent(returnPath)}`;

// Forma de ruta interna: empieza con "/", pero no con "//" ni "/\" (otro dominio) y no trae esquema.
const hasInternalPathShape = (path: string): boolean =>
  path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") && !path.includes(":");

// new URL lanza si lo que queda no es una URL válida ("/\t/a b" se lee como el host "a b").
// Una ruta así no es segura, y no puede tumbar el login justo después de iniciar sesión.
const resolveUrl = (path: string): NullableUndefined<URL> => {
  try {
    return new URL(path, RESOLVE_BASE_ORIGIN);
  } catch {
    return undefined;
  }
};

/**
 * Devuelve la ruta solo si es segura para redirigir; si no, undefined (el login usa la ruta por defecto).
 * Segura = ruta interna de la app: empieza con "/", pero no con "//" ni "/\" (el navegador los lee
 * como otro dominio: //evil.example), no trae esquema (https:, javascript:) y no es una ruta del login.
 * Sin esta validación, un enlace /login?next=https://evil.example sería una redirección abierta.
 *
 * Revisar el texto no alcanza: el navegador borra tabs y saltos de línea al leer una URL, así que
 * "/\t/evil.example" pasa las reglas de arriba y termina en //evil.example. Por eso además se resuelve
 * la ruta como lo hará el navegador (new URL) y se exige que quede en el mismo origen; lo que se
 * devuelve es la ruta ya resuelta, no el texto original.
 *
 * Y la ruta resuelta vuelve a pasar las mismas reglas, porque resolver también cambia el texto:
 * "/a/..//evil.example" queda en el mismo origen, pero al quitar el ".." su pathname es
 * "//evil.example", que el router lee como otro sitio. La regla es simple: lo que se devuelve
 * tiene que ser tan seguro como lo que se exige a la entrada.
 */
export const getSafeReturnPath = (candidate: NullableUndefined<string>): NullableUndefined<string> => {
  if (!candidate || !hasInternalPathShape(candidate)) return undefined;

  const resolved = resolveUrl(candidate);
  if (!resolved || resolved.origin !== RESOLVE_BASE_ORIGIN) return undefined;

  const resolvedPath = `${resolved.pathname}${resolved.search}${resolved.hash}`;
  if (!hasInternalPathShape(resolvedPath)) return undefined;

  return AUTH_ROUTES.includes(resolved.pathname) ? undefined : resolvedPath;
};

/**
 * Lee el parámetro next de la URL actual. Se lee en el momento de navegar (no con useSearchParams)
 * porque la página de login se prerenderiza y useSearchParams exigiría un Suspense alrededor.
 */
export const readReturnPathFromUrl = (): NullableUndefined<string> =>
  new URLSearchParams(window.location.search).get(AUTH_QUERY_PARAM.RETURN_PATH) ?? undefined;
