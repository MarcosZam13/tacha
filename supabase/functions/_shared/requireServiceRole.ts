// Responsabilidad única: verificar que el caller de una Edge Function de
// ingesta trae la service role key. Nada en la app de producción llama a
// ingest-*; el único consumidor legítimo es un script de servidor
// (SCRUM-132), que ya tiene esa key disponible.

import { jsonResponse } from "./http.ts";

/**
 * Devuelve una Response 403 si el caller no trae la service role key en el
 * header Authorization, o null si está autorizado (seguir con la request).
 */
export function requireServiceRole(req: Request): Response | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceKey || token !== serviceKey) {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  return null;
}
