// Edge Function: login-with-recaptcha
// 1) verifica el token de reCAPTCHA con Google  2) recién ahí autentica con Supabase.
// Secret necesario: RECAPTCHA_SECRET_KEY.
// Deploy: supabase functions deploy login-with-recaptcha

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, corsHeaders } from "../_shared/http.ts";

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_SECRET_ENV = "RECAPTCHA_SECRET_KEY";
const RECAPTCHA_TIMEOUT_MS = 5000;
const HTTP_RATE_LIMITED = 429;
// Código de Supabase Auth cuando la contraseña es correcta pero el correo no se confirmó.
const SUPABASE_EMAIL_NOT_CONFIRMED = "email_not_confirmed";

// Mismos valores que LOGIN_API_CODE del cliente: Deno no puede importar de features/.
const ERROR_CODE = {
  CAPTCHA_FAILED: "captcha_failed",
  EMAIL_NOT_CONFIRMED: "email_not_confirmed",
  INVALID_CREDENTIALS: "invalid_credentials",
  INVALID_REQUEST: "invalid_request",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  RATE_LIMITED: "rate_limited",
  SERVER_MISCONFIGURED: "server_misconfigured",
} as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const verifyCaptcha = async (token: string, secret: string): Promise<boolean> => {
  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    signal: AbortSignal.timeout(RECAPTCHA_TIMEOUT_MS),
    body: new URLSearchParams({ secret, response: token }),
  });
  const result = await response.json();
  return result.success === true;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ code: ERROR_CODE.METHOD_NOT_ALLOWED }, 405);

  // Un body `null` o un arreglo es JSON válido: se normaliza a objeto vacío.
  const body = (await req.json().catch(() => null)) ?? {};
  const { email, password, captchaToken } = body;
  if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(captchaToken)) {
    return jsonResponse({ code: ERROR_CODE.INVALID_REQUEST }, 400);
  }

  // Sin secret no se puede verificar nada: es un error nuestro, no un captcha inválido.
  const recaptchaSecret = Deno.env.get(RECAPTCHA_SECRET_ENV);
  if (!recaptchaSecret) return jsonResponse({ code: ERROR_CODE.SERVER_MISCONFIGURED }, 500);

  // Si Google no responde (o tarda más del timeout), se rechaza: ante la duda no se deja pasar.
  const isHuman = await verifyCaptcha(captchaToken, recaptchaSecret).catch(() => false);
  if (!isHuman) return jsonResponse({ code: ERROR_CODE.CAPTCHA_FAILED }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.status === HTTP_RATE_LIMITED) {
    return jsonResponse({ code: ERROR_CODE.RATE_LIMITED }, HTTP_RATE_LIMITED);
  }
  if (error?.code === SUPABASE_EMAIL_NOT_CONFIRMED) {
    return jsonResponse({ code: ERROR_CODE.EMAIL_NOT_CONFIRMED }, 401);
  }
  if (error || !data.session) return jsonResponse({ code: ERROR_CODE.INVALID_CREDENTIALS }, 401);

  return jsonResponse({ session: data.session });
});
