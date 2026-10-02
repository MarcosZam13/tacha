// Edge Function: ingest-walmart
// Puerta HTTP de Walmart Costa Rica. Toda la lógica real vive en _shared/.
//
// Deploy:  supabase functions deploy ingest-walmart
// Invocar: POST /functions/v1/ingest-walmart   body: { "query": "leche" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseSearchRequest, jsonResponse } from "../_shared/http.ts";
import { getStoreBySlug } from "../_shared/catalogRepository.ts";
import { ingestProducts } from "../_shared/ingestUseCase.ts";

Deno.serve(async (req) => {
  const parsed = await parseSearchRequest(req);
  if (parsed instanceof Response) return parsed;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const store = await getStoreBySlug(supabase, "walmart");
    const result = await ingestProducts(supabase, store, parsed.query);
    return jsonResponse(result);
  } catch (err) {
    console.error("Error en ingest-walmart:", err);
    return jsonResponse({ error: "No se pudo contactar a Walmart Costa Rica y no hay cache disponible." }, 502);
  }
});
