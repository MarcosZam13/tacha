import type { Session } from "@supabase/supabase-js";
import { SIGN_OUT_TIMEOUT_MS } from "@/constants";
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

const waitForSignOutTimeout = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, SIGN_OUT_TIMEOUT_MS));

/**
 * Cierra la sesión de este navegador. Alcance local: no cierra los demás dispositivos de la persona.
 * No lanza ni espera para siempre: supabase-js llama al servidor y, si la llamada falla, borra igual
 * la sesión local; si se cuelga, se sigue pasado SIGN_OUT_TIMEOUT_MS (la sesión local puede quedar
 * hasta que la llamada termine). Sin cliente (faltan las variables) no hay sesión que cerrar.
 * Quien llama redirige al login en cualquier caso.
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await Promise.race([
      getSupabaseClient().auth.signOut({ scope: "local" }),
      waitForSignOutTimeout(),
    ]);
  } catch {
    // Nada que hacer: el que llama sigue con la redirección al login.
  }
};
