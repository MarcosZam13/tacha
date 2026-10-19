// Es pública por diseño (va al navegador). Next solo la inyecta si se lee escrita así, completa.
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export const RECAPTCHA = {
  SCRIPT_ID: "google-recaptcha-script",
  SCRIPT_URL: "https://www.google.com/recaptcha/api.js?render=explicit",
} as const;

export const RECAPTCHA_ERROR_MESSAGE = {
  LOAD_FAILED: "No pudimos cargar el reCAPTCHA. Recargá la página.",
} as const;
