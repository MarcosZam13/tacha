// Verificación de reCAPTCHA v2 con la clave secreta, para funciones que reciben formularios
// públicos. Hoy la usa submit-contact-message; login-with-recaptcha conserva su propia copia
// hasta unificarlas en otro ticket. Regla: si Google no confirma, no pasa.

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_TIMEOUT_MS = 5000;

export const verifyCaptcha = async (token: string, secret: string): Promise<boolean> => {
  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    signal: AbortSignal.timeout(RECAPTCHA_TIMEOUT_MS),
    body: new URLSearchParams({ secret, response: token }),
  });
  const result = await response.json();
  return result.success === true;
};
