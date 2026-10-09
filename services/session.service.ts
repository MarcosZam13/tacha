import type { Session } from "@supabase/supabase-js";
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
