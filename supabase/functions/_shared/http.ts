// Responsabilidad única: los detalles de transporte HTTP (CORS, parseo del
// body, armado de la respuesta). Ningún entrypoint debería repetir esto.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Devuelve el query ya validado, o la Response de error correspondiente.
export async function parseSearchRequest(req: Request): Promise<{ query: string } | Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Usa POST con { query: string }" }, 405);
  }

  let query: unknown;
  try {
    const body = await req.json();
    query = body.query;
  } catch {
    return jsonResponse({ error: "Body inválido, se espera JSON { query: string }" }, 400);
  }

  if (!query || typeof query !== "string" || query.trim().length < 2) {
    return jsonResponse({ error: "El parámetro 'query' es requerido (mínimo 2 caracteres)" }, 400);
  }

  return { query };
}
