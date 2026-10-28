import type { Session } from "@supabase/supabase-js";
import { SIGN_OUT_SCOPE, SIGN_OUT_TIMEOUT_MS } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Avisa de cada cambio de sesión: al suscribirse llega la sesión actual (evento INITIAL_SESSION) y
 * después cada inicio, cierre o renovación del token. Devuelve cómo cancelar la suscripción.
 * No lanza: sin cliente de Supabase (faltan las variables) no hay sesión posible, así que se avisa "sin sesión".
 */
export const subscribeToSessionChanges = (
  onChange: (session: NullableRef<Session>) => void,
): (() => void) => {
  try {
    const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) =>
      onChange(session),
    );

    return () => data.subscription.unsubscribe();
  } catch {
    onChange(null);
    return () => undefined;
  }
};

// Espera la llamada hasta SIGN_OUT_TIMEOUT_MS; pasado el tope devuelve `undefined`. Cancela el temporizador
// al terminar para no dejar uno pendiente por cada cierre de sesión.
const withSignOutTimeout = async <T>(request: Promise<T>): Promise<T | undefined> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timeoutId = setTimeout(() => resolve(undefined), SIGN_OUT_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Cierra la sesión de este navegador. Alcance local: no cierra los demás dispositivos de la persona.
 * Llama al servidor y, si la llamada falla, supabase-js borra igual la sesión de este navegador; si se
 * cuelga, se sigue pasado SIGN_OUT_TIMEOUT_MS (la sesión puede quedar hasta que la llamada termine).
 * Sin cliente (faltan las variables) no hay sesión que cerrar. No lanza ni espera para siempre; quien
 * llama redirige al login en cualquier caso.
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await withSignOutTimeout(getSupabaseClient().auth.signOut({ scope: SIGN_OUT_SCOPE.LOCAL }));
  } catch {
    // Nada que hacer: el que llama sigue con su redirección.
  }
};

/**
 * Revoca todas las demás sesiones de la cuenta (otros dispositivos y navegadores) y deja esta. Devuelve si
 * la revocación se confirmó: `false` ante un error del servidor, un fallo de red, o si no respondió en
 * SIGN_OUT_TIMEOUT_MS. Quien llama decide qué hacer con un `false`; no lanza.
 *
 * Se usa al recuperar la contraseña, ANTES de cambiarla: quien recupera una cuenta puede haberla perdido, y
 * cambiar la contraseña no cierra las sesiones que otra persona tenga abiertas. Revocar primero hace que un
 * fallo de la red deje la contraseña sin cambiar (se reintenta) en vez de cambiarla con el atacante adentro.
 */
export const revokeOtherSessions = async (): Promise<boolean> => {
  try {
    const result = await withSignOutTimeout(
      getSupabaseClient().auth.signOut({ scope: SIGN_OUT_SCOPE.OTHERS }),
    );

    return result !== undefined && result.error === null;
  } catch {
    return false;
  }
};
