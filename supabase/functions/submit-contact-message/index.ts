// Edge Function: submit-contact-message (HU-06, HU-14)
// 1) valida el body con un esquema  2) verifica el reCAPTCHA con Google
// 3) limita los envíos por correo  4) guarda el mensaje con la service role.
// La tabla contact_messages no da permisos al cliente: esta función es la única puerta.
// Secret necesario: RECAPTCHA_SECRET_KEY (el mismo del login).
// Deploy: supabase functions deploy submit-contact-message

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@4.6.5";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { verifyCaptcha } from "../_shared/recaptcha.ts";

const RECAPTCHA_SECRET_ENV = "RECAPTCHA_SECRET_KEY";
const CONTACT_TABLE = "contact_messages";

const HTTP_STATUS = {
  BAD_REQUEST: 400,
  CREATED: 201,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
} as const;

// Frena a quien reenvía en bucle aunque resuelva el reCAPTCHA cada vez.
const RATE_LIMIT = {
  MAX_MESSAGES: 5,
  WINDOW_MS: 60 * 60 * 1000,
} as const;

// Mismos valores que CONTACT_API_CODE del cliente: Deno no puede importar de features/.
const ERROR_CODE = {
  CAPTCHA_FAILED: "captcha_failed",
  INVALID_REQUEST: "invalid_request",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  RATE_LIMITED: "rate_limited",
  SERVER_ERROR: "server_error",
  SERVER_MISCONFIGURED: "server_misconfigured",
} as const;

// Mismo patrón que EMAIL_PATTERN del cliente y que el check de la migración 028.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mismos límites que contact.constants.ts y que los check de la migración 028.
// z.object descarta claves extra: el cliente no puede fijar id ni created_at.
const contactMessageSchema = z.object({
  captchaToken: z.string().min(1),
  email: z.string().trim().toLowerCase().max(254).regex(EMAIL_PATTERN),
  message: z.string().trim().min(10).max(1000),
  name: z.string().trim().min(2).max(100),
  source: z.enum(["about", "landing"]),
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return jsonResponse({ code: ERROR_CODE.METHOD_NOT_ALLOWED }, HTTP_STATUS.METHOD_NOT_ALLOWED);
  }

  const parsedBody = contactMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return jsonResponse({ code: ERROR_CODE.INVALID_REQUEST }, HTTP_STATUS.BAD_REQUEST);
  }
  const { captchaToken, email, message, name, source } = parsedBody.data;

  // Sin secret no se puede verificar nada: es un error nuestro, no un captcha inválido.
  const recaptchaSecret = Deno.env.get(RECAPTCHA_SECRET_ENV);
  if (!recaptchaSecret) {
    return jsonResponse({ code: ERROR_CODE.SERVER_MISCONFIGURED }, HTTP_STATUS.SERVER_ERROR);
  }

  // Si Google no responde (o tarda más del timeout), se rechaza: ante la duda no se deja pasar.
  const isHuman = await verifyCaptcha(captchaToken, recaptchaSecret).catch(() => false);
  if (!isHuman) return jsonResponse({ code: ERROR_CODE.CAPTCHA_FAILED }, HTTP_STATUS.BAD_REQUEST);

  // Service role: la tabla no tiene permisos para anon ni authenticated.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const windowStart = new Date(Date.now() - RATE_LIMIT.WINDOW_MS).toISOString();
  const { count, error: countError } = await supabase
    .from(CONTACT_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", windowStart);
  if (countError) return jsonResponse({ code: ERROR_CODE.SERVER_ERROR }, HTTP_STATUS.SERVER_ERROR);
  if ((count ?? 0) >= RATE_LIMIT.MAX_MESSAGES) {
    return jsonResponse({ code: ERROR_CODE.RATE_LIMITED }, HTTP_STATUS.RATE_LIMITED);
  }

  const { error: insertError } = await supabase
    .from(CONTACT_TABLE)
    .insert({ email, message, name, source });
  if (insertError) return jsonResponse({ code: ERROR_CODE.SERVER_ERROR }, HTTP_STATUS.SERVER_ERROR);

  return jsonResponse({ received: true }, HTTP_STATUS.CREATED);
});
