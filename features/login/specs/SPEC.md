# Feature: Login

Cubre SCRUM-45 (HU-22), SCRUM-46 (HU-23) y SCRUM-47 (HU-24). Las historias SCRUM-48 y 49 agregan su sección a este spec cuando se empiecen.

## 1. Objetivo

Un visitante con cuenta verificada inicia sesión con correo y contraseña, y antes de que el sistema procese el intento debe superar un reCAPTCHA, para proteger la cuenta contra ataques automatizados. Mientras escribe la contraseña puede mostrarla u ocultarla para comprobar que la ingresó bien. Cuando el intento falla, recibe un mensaje claro que le explica qué pasó: uno genérico si las credenciales son incorrectas (sin revelar cuál campo falló) y uno propio si la cuenta no está verificada o está bloqueada, para poder reintentar o saber a quién acudir.

## 2. Alcance

Incluye:
- Pantalla `/login` con correo, contraseña y el widget reCAPTCHA (v2, casilla "No soy un robot").
- Verificación del token de reCAPTCHA en el servidor (Edge Function) antes de intentar la autenticación.
- Inicio de sesión con Supabase Auth y redirección a la app al tener éxito.
- Mensaje de error cuando el reCAPTCHA no se completa o falla.
- Botón con ícono de ojo en el campo de contraseña para alternar entre texto oculto (puntos) y visible (texto plano). Oculto por defecto.
- Mensaje genérico para credenciales incorrectas y mensajes específicos para cuenta no verificada, cuenta bloqueada y demasiados intentos. Los mensajes son visibles y no bloquean el formulario: el usuario puede corregir y reintentar.

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- email: string
- password: string
- captchaToken: string (lo entrega el widget de Google al completarse; vence a los ~2 minutos)
- Clic o activación por teclado (Enter o espacio) del botón de visibilidad de la contraseña

## 4. Salidas

- Éxito: la sesión queda guardada en el navegador y se redirige a la ruta principal.
- Error de reCAPTCHA: mensaje propio, sin intentar autenticar.
- Error de credenciales: un único mensaje genérico, igual para correo inexistente y contraseña incorrecta.
- Error con causa conocida: un mensaje propio para "correo sin verificar", "cuenta bloqueada" y "demasiados intentos".
- Cualquier otro fallo: el mensaje de error inesperado.
- El formulario queda editable para reintentar; el widget se reinicia tras cada intento fallido.
- El campo de contraseña cambia su tipo entre `password` y `text`, y el ícono entre ojo y ojo tachado. El valor escrito no se pierde al alternar.

## 5. Reglas de negocio

- Correo y contraseña son obligatorios; el correo debe tener formato válido (se reusa el patrón del registro).
- No se envía nada al servidor si falta el reCAPTCHA; el botón queda deshabilitado hasta completarlo.
- El servidor rechaza el intento si Google no valida el token, aunque el cliente lo haya enviado: la validación del cliente es solo comodidad.
- Un token de reCAPTCHA sirve para un solo intento; tras un intento (exitoso o no) se pide uno nuevo.
- El correo se normaliza (trim + minúsculas) antes de enviarlo.
- La contraseña está oculta por defecto y cada vez que se monta la pantalla.
- Alternar la visibilidad es solo de presentación: no cambia el valor, no valida ni envía nada, y no persiste entre visitas.
- El botón de visibilidad nunca envía el formulario.
- El mensaje para credenciales incorrectas no distingue entre correo inexistente y contraseña incorrecta, para no revelar qué correos tienen cuenta.
- Los mensajes específicos (correo sin verificar, cuenta bloqueada) solo salen cuando el servidor los informa con su código. Un código desconocido se muestra como error inesperado, nunca como credenciales incorrectas.
- Un mensaje de error no bloquea el formulario: los campos siguen editables, el botón vuelve a habilitarse al completar el reCAPTCHA, y el mensaje anterior se borra al iniciar el siguiente intento.

## 6. Estados

Unión derivada de constantes: `idle | submitting | error | success`. El estado del widget (`token` presente o no) es aparte: se deriva de `captchaToken`, no es un booleano más.

La visibilidad de la contraseña es un estado local del campo (oculta o visible). El tipo del input (`password` o `text`) se deriva de él, no se guarda aparte.

## 7. Errores

| Situación | Mensaje |
|---|---|
| Correo con formato inválido | Error bajo el campo |
| Campo vacío | El botón "Iniciar sesión" está deshabilitado; no se muestra error (los mensajes de campo obligatorio quedan como defensa en la validación) |
| reCAPTCHA sin completar | El botón está deshabilitado; si se fuerza el envío, "Confirmá que no sos un robot." |
| reCAPTCHA rechazado por Google o vencido | "No pudimos validar el reCAPTCHA. Intentá de nuevo." |
| Correo sin verificar (contraseña correcta) | "Confirmá tu correo antes de iniciar sesión." |
| Cuenta bloqueada | "Tu cuenta está bloqueada. Contactá al equipo de Tacha." |
| Demasiados intentos (rate limit de Supabase Auth) | "Demasiados intentos. Esperá un momento e intentá de nuevo." |
| Credenciales incorrectas (correo inexistente o contraseña incorrecta) | "Correo o contraseña incorrectos." (el mismo mensaje en ambos casos) |
| Edge Function caída o sin red | "No pudimos iniciar sesión. Intentá de nuevo en unos minutos." |
| El script de Google no carga | Mensaje que explica que el reCAPTCHA no cargó; el botón sigue deshabilitado |

## 8. UI esperada

- Título "Iniciar sesión".
- Input de correo (`Input` de `@/components/ui`) e input de contraseña (`PasswordInput`, local de la feature, con la misma apariencia que `Input`).
- Botón con ícono de ojo a la derecha del campo de contraseña: ojo abierto cuando está oculta, ojo tachado cuando está visible.
- Widget reCAPTCHA.
- Botón "Iniciar sesión" (`Button`), con texto "Ingresando..." mientras envía.
- Mensaje de error general con `role="alert"`.
- Enlace a `/registro` para quien no tiene cuenta.

## 9. Accesibilidad

- Cada input con su label asociado (ya lo hace `Input`).
- Errores en texto, no solo en color; el error general con `role="alert"`.
- El widget de Google trae su propio soporte de teclado; el botón deshabilitado no depende solo del color.
- El botón de visibilidad es un `<button type="button">` alcanzable con Tab, con `aria-label` que dice la acción ("Mostrar contraseña" / "Ocultar contraseña"). No depende solo del ícono.
- El label de la contraseña se asocia al input con `htmlFor`; el botón queda fuera del `<label>` (un botón dentro de un label es HTML inválido).
- El error del campo se enlaza al input con `aria-describedby` y `aria-invalid`.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; Tailwind con tokens `tacha-*`.
- ViewModel + `constants/`; sin magic strings (constants-standards); sin `if` como en el registro (ternarios y mapas).
- Sin librería de formularios ni wrapper de reCAPTCHA: el script de Google se carga con un hook propio.
- Sin librería de íconos: el ojo es un SVG en línea.
- No se modifica `Input` ni nada de `components/ui/`: `PasswordInput` es un componente local de la feature. Se promueve a `components/ui/` solo cuando una segunda feature lo necesite.
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
- 401 `{ code: "user_banned" }` si la cuenta está bloqueada (usuario baneado en Supabase Auth)
- 401 `{ code: "invalid_credentials" }` ante cualquier otro fallo de credenciales (correo inexistente o contraseña incorrecta)
- 429 `{ code: "rate_limited" }` si Supabase Auth limita los intentos
- 400 `{ code: "invalid_request" }` si falta algún campo
- 500 `{ code: "server_misconfigured" }` si falta el secret de reCAPTCHA

**Google siteverify:** `POST https://www.google.com/recaptcha/api/siteverify` con `secret` y `response`; responde `{ success: boolean }`.

**Supabase Auth:** `signInWithPassword` dentro de la función; el cliente guarda la sesión con `auth.setSession`. No hay tablas ni RLS nuevas.

## 13. Casos de aceptación

- Caso 1: con reCAPTCHA completo y credenciales correctas, se inicia sesión y se redirige.
- Caso 2: sin completar el reCAPTCHA el botón está deshabilitado y no se hace ninguna petición.
- Caso 3: con un token inválido o vencido, el servidor responde `captcha_failed`, se muestra el mensaje de reCAPTCHA y no se intenta autenticar.
- Caso 4: un correo con formato inválido muestra el error bajo el campo; con el correo vacío, el botón "Iniciar sesión" queda deshabilitado.
- Caso 5: con la contraseña vacía, el botón "Iniciar sesión" queda deshabilitado y no se envía nada.
- Caso 6: credenciales incorrectas con reCAPTCHA válido muestra el mensaje genérico y el formulario sigue editable.
- Caso 7: tras un intento fallido el widget se reinicia y hay que completarlo de nuevo.
- Caso 8: si la Edge Function no responde, se muestra el mensaje de error inesperado.
- Caso 9: con la contraseña correcta pero el correo sin verificar, se muestra el mensaje de correo sin verificar, no el de credenciales incorrectas.
- Caso 10: si Supabase limita los intentos, se muestra el mensaje de demasiados intentos.
- Caso 11: al abrir `/login`, la contraseña se ve como puntos y el ícono es el ojo abierto.
- Caso 12: al pulsar el ojo, el texto se ve en claro y el ícono pasa a ojo tachado; al pulsarlo otra vez vuelve a puntos.
- Caso 13: alternar la visibilidad conserva lo escrito y no envía el formulario.
- Caso 14: el botón se alcanza con Tab y se activa con Enter o espacio; su `aria-label` cambia según la acción disponible.
- Caso 15: con la contraseña vacía, el botón de enviar sigue deshabilitado y el ojo funciona igual (alterna aunque no haya texto escrito).
- Caso 16: con un correo que no existe, se muestra "Correo o contraseña incorrectos.".
- Caso 17: con un correo que existe y una contraseña incorrecta, se muestra exactamente el mismo mensaje que en el caso 16 (no se puede deducir qué falló).
- Caso 18: con una cuenta bloqueada se muestra el mensaje de cuenta bloqueada, no el de credenciales incorrectas, con cualquier contraseña (Supabase comprueba el ban antes de la contraseña; ver §15).
- Caso 19: tras cualquiera de los mensajes de error, los campos siguen editables, el widget se reinicia y, al completarlo de nuevo, se puede reintentar; el mensaje anterior desaparece al iniciar el nuevo intento.
- Caso 20: el mensaje de error se anuncia con `role="alert"` y no depende solo del color.
- Caso 21: si el servidor devuelve un código que el cliente no conoce, se muestra el mensaje de error inesperado, no el de credenciales incorrectas.

## 14. Casos fuera de alcance

- Mostrar/ocultar contraseña en el registro, la recuperación o la actualización de contraseña: la HU-23 es solo del login.
- Recordar la preferencia de visibilidad, o volver a ocultar la contraseña tras un tiempo.
- Mensaje específico de cuenta "inactiva": Supabase Auth no tiene un estado de inactividad distinto del baneo (un usuario baneado se muestra como bloqueado). Modelarlo exigiría una tabla de perfil con un estado de cuenta, que es una decisión de producto aparte; no se implementa.
- Enlace o botón para reenviar el correo de verificación desde el login, desbloqueo de la cuenta desde la app, y un canal de soporte propio: los mensajes solo informan.
- Feedback de contraseña débil o vencida (SCRUM-48).
- Guard de rutas y expiración de sesión (SCRUM-49); cierre por inactividad (HU-27).
- "¿Olvidaste tu contraseña?" (HU-28), login con Google o Facebook.
- Límite de intentos propio: lo aplica Supabase (rate limit de Auth).

## 15. Notas de implementación

- Supabase Auth no integra Google reCAPTCHA de forma nativa (solo hCaptcha y Turnstile). Por eso la verificación va en una Edge Function. **Límite conocido:** quien llame directo al endpoint de Auth de Supabase con la anon key se salta el captcha; cerrarlo requiere el captcha nativo del proyecto.
- **Enumeración de cuentas, verificado probando contra el proyecto de Supabase (SCRUM-47):**
  - `email_not_confirmed` solo aparece con la contraseña correcta: con una incorrecta sale el mensaje genérico. No se filtra nada.
  - `user_banned` aparece **aunque la contraseña sea incorrecta**: Supabase comprueba el ban antes de la contraseña. Quien conozca un correo puede saber si esa cuenta existe y está bloqueada.
  - Limitación aceptada: lo ve igual cualquiera que llame directo al endpoint de Auth con la anon key, así que dejar de reenviarlo desde la función no cerraría la fuga y sí incumpliría el criterio de la HU-24 (mensaje de cuenta bloqueada). Afecta solo a cuentas baneadas, que un administrador marca a mano; para el resto, correo inexistente y contraseña incorrecta siguen siendo indistinguibles.
- Quien ya tiene un par correo/contraseña válido puede saber si la cuenta está sin verificar: es inherente a que la HU-24 pida ese mensaje.
- Mientras el equipo no registre el reCAPTCHA real, se usan las claves de prueba que publica Google (la casilla siempre pasa); se cambian por las reales sin tocar código.
