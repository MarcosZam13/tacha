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
 */
export const getSafeReturnPath = (candidate: NullableUndefined<string>): NullableUndefined<string> => {
  if (!candidate || !candidate.startsWith("/")) return undefined;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return undefined;
  if (candidate.includes(":")) return undefined;

  const resolved = new URL(candidate, RESOLVE_BASE_ORIGIN);
  if (resolved.origin !== RESOLVE_BASE_ORIGIN) return undefined;

  return AUTH_ROUTES.includes(resolved.pathname)
    ? undefined
    : `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

/**
 * Lee el parámetro next de la URL actual. Se lee en el momento de navegar (no con useSearchParams)
 * porque la página de login se prerenderiza y useSearchParams exigiría un Suspense alrededor.
 */
export const readReturnPathFromUrl = (): NullableUndefined<string> =>
  new URLSearchParams(window.location.search).get(AUTH_QUERY_PARAM.RETURN_PATH) ?? undefined;
