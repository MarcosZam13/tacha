# Feature: Login

Cubre SCRUM-45 (HU-22). Las historias SCRUM-46 a 49 agregan su sección a este spec cuando se empiecen.

## 1. Objetivo

Un visitante con cuenta verificada inicia sesión con correo y contraseña, y antes de que el sistema procese el intento debe superar un reCAPTCHA, para proteger la cuenta contra ataques automatizados.

## 2. Alcance

Incluye:
- Pantalla `/login` con correo, contraseña y el widget reCAPTCHA (v2, casilla "No soy un robot").
- Verificación del token de reCAPTCHA en el servidor (Edge Function) antes de intentar la autenticación.
- Inicio de sesión con Supabase Auth y redirección a la app al tener éxito.
- Mensaje de error cuando el reCAPTCHA no se completa o falla.

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- email: string
- password: string
- captchaToken: string (lo entrega el widget de Google al completarse; vence a los ~2 minutos)

## 4. Salidas

- Éxito: la sesión queda guardada en el navegador y se redirige a la ruta principal.
- Error de reCAPTCHA: mensaje propio, sin intentar autenticar.
- Error de credenciales u otro: un mensaje genérico. Solo se distinguen "correo sin verificar" y "demasiados intentos"; el resto de los mensajes específicos son de SCRUM-47.
- El formulario queda editable para reintentar; el widget se reinicia tras cada intento fallido.

## 5. Reglas de negocio

- Correo y contraseña son obligatorios; el correo debe tener formato válido (se reusa el patrón del registro).
- No se envía nada al servidor si falta el reCAPTCHA; el botón queda deshabilitado hasta completarlo.
- El servidor rechaza el intento si Google no valida el token, aunque el cliente lo haya enviado: la validación del cliente es solo comodidad.
- Un token de reCAPTCHA sirve para un solo intento; tras un intento (exitoso o no) se pide uno nuevo.
- El correo se normaliza (trim + minúsculas) antes de enviarlo.

## 6. Estados

Unión derivada de constantes: `idle | submitting | error | success`. El estado del widget (`token` presente o no) es aparte: se deriva de `captchaToken`, no es un booleano más.

## 7. Errores

| Situación | Mensaje |
|---|---|
| Campo vacío o correo inválido | Error bajo el campo |
| reCAPTCHA sin completar | El botón está deshabilitado; si se fuerza el envío, "Confirmá que no sos un robot." |
| reCAPTCHA rechazado por Google o vencido | "No pudimos validar el reCAPTCHA. Intentá de nuevo." |
| Correo sin verificar (contraseña correcta) | "Confirmá tu correo antes de iniciar sesión." |
| Demasiados intentos (rate limit de Supabase Auth) | "Demasiados intentos. Esperá un momento e intentá de nuevo." |
| Credenciales incorrectas u otro fallo de Supabase | Mensaje genérico de credenciales (SCRUM-47 lo refina) |
| Edge Function caída o sin red | "No pudimos iniciar sesión. Intentá de nuevo en unos minutos." |
| El script de Google no carga | Mensaje que explica que el reCAPTCHA no cargó; el botón sigue deshabilitado |

## 8. UI esperada

- Título "Iniciar sesión".
- Input de correo, input de contraseña (`Input` de `@/components/ui`).
- Widget reCAPTCHA.
- Botón "Iniciar sesión" (`Button`), con texto "Ingresando..." mientras envía.
- Mensaje de error general con `role="alert"`.
- Enlace a `/registro` para quien no tiene cuenta.

## 9. Accesibilidad

- Cada input con su label asociado (ya lo hace `Input`).
- Errores en texto, no solo en color; el error general con `role="alert"`.
- El widget de Google trae su propio soporte de teclado; el botón deshabilitado no depende solo del color.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; Tailwind con tokens `tacha-*`.
- ViewModel + `constants/`; sin magic strings (constants-standards); sin `if` como en el registro (ternarios y mapas).
- Sin librería de formularios ni wrapper de reCAPTCHA: el script de Google se carga con un hook propio.
- La secret key de reCAPTCHA vive solo como secret de Supabase, nunca con prefijo `NEXT_PUBLIC_` (security-practices). La site key sí es pública.
- Skills: component-architecture, constants-standards, clean-code-practices, project-structure, security-practices.

## 11. Dependencias

- `services/supabase.client.ts` (`getSupabaseClient`).
- `@/components/ui` (`Input`, `Button`).
- `constants/email.constants.ts` (`EMAIL_PATTERN`) y `utils/email.utils.ts` (`normalizeEmail`): compartidos con `features/registro-manual/` (promovidos desde ahí al tener un segundo consumidor).
- `supabase/functions/login-with-recaptcha/` (nueva).
- Variables: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (cliente) y secret `RECAPTCHA_SECRET_KEY` (Edge Function).

## 12. Contratos externos

**Edge Function `login-with-recaptcha`**, `POST`, body `{ email, password, captchaToken }`:
- 200 `{ session: { access_token, refresh_token, ... } }`
- 400 `{ code: "captcha_failed" }` si Google no valida el token
- 401 `{ code: "email_not_confirmed" }` si la contraseña es correcta pero el correo no se verificó
- 401 `{ code: "invalid_credentials" }` ante cualquier otro fallo de credenciales (SCRUM-47 abrirá los casos restantes, como cuenta bloqueada)
- 429 `{ code: "rate_limited" }` si Supabase Auth limita los intentos
- 400 `{ code: "invalid_request" }` si falta algún campo
- 500 `{ code: "server_misconfigured" }` si falta el secret de reCAPTCHA

**Google siteverify:** `POST https://www.google.com/recaptcha/api/siteverify` con `secret` y `response`; responde `{ success: boolean }`.

**Supabase Auth:** `signInWithPassword` dentro de la función; el cliente guarda la sesión con `auth.setSession`. No hay tablas ni RLS nuevas.

## 13. Casos de aceptación

- Caso 1: con reCAPTCHA completo y credenciales correctas, se inicia sesión y se redirige.
- Caso 2: sin completar el reCAPTCHA el botón está deshabilitado y no se hace ninguna petición.
- Caso 3: con un token inválido o vencido, el servidor responde `captcha_failed`, se muestra el mensaje de reCAPTCHA y no se intenta autenticar.
- Caso 4: correo vacío o con formato inválido muestra el error bajo el campo.
- Caso 5: contraseña vacía muestra el error bajo el campo.
- Caso 6: credenciales incorrectas con reCAPTCHA válido muestra el mensaje genérico y el formulario sigue editable.
- Caso 7: tras un intento fallido el widget se reinicia y hay que completarlo de nuevo.
- Caso 8: si la Edge Function no responde, se muestra el mensaje de error inesperado.
- Caso 9: con la contraseña correcta pero el correo sin verificar, se muestra el mensaje de correo sin verificar, no el de credenciales incorrectas.
- Caso 10: si Supabase limita los intentos, se muestra el mensaje de demasiados intentos.

## 14. Casos fuera de alcance

- Mostrar/ocultar contraseña (SCRUM-46).
- Mensajes específicos de cuenta bloqueada (SCRUM-47). "Inactiva" no existe en Supabase Auth y no se implementa.
- Feedback de contraseña débil o vencida (SCRUM-48).
- Guard de rutas y expiración de sesión (SCRUM-49); cierre por inactividad (HU-27).
- "¿Olvidaste tu contraseña?" (HU-28), login con Google o Facebook.
- Límite de intentos propio: lo aplica Supabase (rate limit de Auth).

## 15. Notas de implementación

- Supabase Auth no integra Google reCAPTCHA de forma nativa (solo hCaptcha y Turnstile). Por eso la verificación va en una Edge Function. **Límite conocido:** quien llame directo al endpoint de Auth de Supabase con la anon key se salta el captcha; cerrarlo requiere el captcha nativo del proyecto.
- Mientras el equipo no registre el reCAPTCHA real, se usan las claves de prueba que publica Google (la casilla siempre pasa); se cambian por las reales sin tocar código.
