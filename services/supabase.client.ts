import { createClient } from "@supabase/supabase-js";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { NullableRef } from "@/types/nullable.types";

let supabaseClient: NullableRef<SupabaseClient<Database>> = null;
let pendingSession: NullableRef<Promise<Session>> = null;

/**
 * Un solo cliente para toda la app: guarda la sesión y manda el token en cada
 * petición. Se crea en la primera llamada (siempre desde el navegador) y no al
 * importar el módulo, para que `next build` no necesite las variables de entorno.
 * Si faltan, falla con un mensaje claro en vez de apuntar a un proyecto por defecto.
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseClient) return supabaseClient;

  // La anon key es pública por diseño (security-practices §5): lo que protege
  // los datos son las políticas RLS, no esconder esta key.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

const loadOrCreateSession = async (): Promise<Session> => {
  const auth = getSupabaseClient().auth;
  const { data: sessionData, error: sessionError } = await auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;

  // Provisional hasta que exista el registro: una sesión anónima da un
  // auth.uid() real para que RLS funcione igual que con un usuario registrado.
  const { data: signInData, error: signInError } = await auth.signInAnonymously();
  if (signInError) throw signInError;
  if (!signInData.session) throw new Error("Supabase no devolvió una sesión anónima");
  return signInData.session;
};

/**
 * Devuelve la sesión actual o crea una anónima. Se reusa la misma promesa:
 * si dos llamadas llegan a la vez (ej. el doble efecto de StrictMode) no se
 * crean dos usuarios anónimos. Si falla, se limpia para poder reintentar.
 */
export const ensureSession = (): Promise<Session> => {
  if (!pendingSession) {
    pendingSession = loadOrCreateSession().catch((error: unknown) => {
      pendingSession = null;
      throw error;
    });
  }
  return pendingSession;
};
