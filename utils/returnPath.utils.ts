import { AUTH_QUERY_PARAM, AUTH_ROUTE } from "@/constants";
import type { NullableUndefined } from "@/types/nullable.types";

// Rutas a las que nunca se vuelve después del login: volver a /login sería un ciclo.
const AUTH_ROUTES: readonly string[] = Object.values(AUTH_ROUTE);

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
 */
export const getSafeReturnPath = (candidate: NullableUndefined<string>): NullableUndefined<string> => {
  if (!candidate || !candidate.startsWith("/")) return undefined;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return undefined;
  if (candidate.includes(":")) return undefined;

  const pathname = candidate.split(/[?#]/)[0];
  return AUTH_ROUTES.includes(pathname) ? undefined : candidate;
};

/**
 * Lee el parámetro next de la URL actual. Se lee en el momento de navegar (no con useSearchParams)
 * porque la página de login se prerenderiza y useSearchParams exigiría un Suspense alrededor.
 */
export const readReturnPathFromUrl = (): NullableUndefined<string> =>
  new URLSearchParams(window.location.search).get(AUTH_QUERY_PARAM.RETURN_PATH) ?? undefined;
