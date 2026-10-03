# Feature: Login

Cubre SCRUM-45 (HU-22), SCRUM-46 (HU-23) y SCRUM-48 (HU-25). Las historias SCRUM-47 y 49 agregan su sección a este spec cuando se empiecen.

## 1. Objetivo

Un visitante con cuenta verificada inicia sesión con correo y contraseña, y antes de que el sistema procese el intento debe superar un reCAPTCHA, para proteger la cuenta contra ataques automatizados. Mientras escribe la contraseña puede mostrarla u ocultarla para comprobar que la ingresó bien. Si inicia sesión con una contraseña débil, el sistema se lo avisa y le ofrece cambiarla en ese mismo momento, sin obligarlo.

## 2. Alcance

Incluye:
- Pantalla `/login` con correo, contraseña y el widget reCAPTCHA (v2, casilla "No soy un robot").
- Verificación del token de reCAPTCHA en el servidor (Edge Function) antes de intentar la autenticación.
- Inicio de sesión con Supabase Auth y redirección a la app al tener éxito.
- Mensaje de error cuando el reCAPTCHA no se completa o falla.
- Botón con ícono de ojo en el campo de contraseña para alternar entre texto oculto (puntos) y visible (texto plano). Oculto por defecto.
- Aviso de contraseña débil tras un inicio de sesión exitoso, con la opción de cambiarla desde el mismo flujo (formulario de nueva contraseña con medidor de fortaleza) o de continuar sin cambiarla.

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- email: string
- password: string
- captchaToken: string (lo entrega el widget de Google al completarse; vence a los ~2 minutos)
- Clic o activación por teclado (Enter o espacio) del botón de visibilidad de la contraseña
- newPassword: string y confirmNewPassword: string (formulario de cambio de contraseña)
- Decisión del usuario ante el aviso: cambiar la contraseña o continuar ("Ahora no")

## 4. Salidas

- Éxito: la sesión queda guardada en el navegador y se redirige a la ruta principal.
- Error de reCAPTCHA: mensaje propio, sin intentar autenticar.
- Error de credenciales u otro: un mensaje genérico. Solo se distinguen "correo sin verificar" y "demasiados intentos"; el resto de los mensajes específicos son de SCRUM-47.
- El formulario queda editable para reintentar; el widget se reinicia tras cada intento fallido.
- El campo de contraseña cambia su tipo entre `password` y `text`, y el ícono entre ojo y ojo tachado. El valor escrito no se pierde al alternar.
- Contraseña débil: en lugar de ir directo a la app, se muestra un aviso con "Cambiar contraseña" y "Ahora no".
- Cambio exitoso: la contraseña queda actualizada, se confirma con un mensaje y el usuario continúa a la app.
- "Ahora no": el usuario continúa a la app con su contraseña actual.

## 5. Reglas de negocio

- Correo y contraseña son obligatorios; el correo debe tener formato válido (se reusa el patrón del registro).
- No se envía nada al servidor si falta el reCAPTCHA; el botón queda deshabilitado hasta completarlo.
- El servidor rechaza el intento si Google no valida el token, aunque el cliente lo haya enviado: la validación del cliente es solo comodidad.
- Un token de reCAPTCHA sirve para un solo intento; tras un intento (exitoso o no) se pide uno nuevo.
- El correo se normaliza (trim + minúsculas) antes de enviarlo.
- La contraseña está oculta por defecto y cada vez que se monta la pantalla.
- Alternar la visibilidad es solo de presentación: no cambia el valor, no valida ni envía nada, y no persiste entre visitas.
- El botón de visibilidad nunca envía el formulario.
- Una contraseña es débil si su nivel de fortaleza es el más bajo (cumple 2 o menos de las 5 reglas: 8 caracteres, minúscula, mayúscula, número y carácter especial). Se usa la misma evaluación que el registro.
- La fortaleza se evalúa solo después de un inicio de sesión exitoso, con la contraseña que el usuario acaba de escribir. Un intento fallido nunca revela la fortaleza.
- La contraseña escrita se evalúa en memoria: no se guarda, no se envía a otro lugar ni se escribe en logs.
- El aviso no bloquea: "Ahora no" siempre está disponible. Reaparece en cada inicio de sesión con contraseña débil mientras no se cambie.
- La nueva contraseña es obligatoria, tiene al menos el largo mínimo, coincide con su repetición y alcanza al menos el nivel intermedio de fortaleza. El botón de guardar queda deshabilitado mientras no se cumpla.
- El cambio usa la sesión que acaba de crearse; no se pide la contraseña actual otra vez.

## 6. Estados

Unión derivada de constantes: `idle | submitting | error | success`. El estado del widget (`token` presente o no) es aparte: se deriva de `captchaToken`, no es un booleano más.

La visibilidad de la contraseña es un estado local del campo (oculta o visible). El tipo del input (`password` o `text`) se deriva de él, no se guarda aparte.

Tras un inicio de sesión exitoso el login suma una fase: `weak-password` (aviso o formulario de cambio) además de `success`. El cambio de contraseña tiene su propia unión derivada de constantes: `notice | form | saving | done`. Ninguno de los dos se modela con booleanos sueltos.

## 7. Errores

| Situación | Mensaje |
|---|---|
| Correo con formato inválido | Error bajo el campo |
| Campo vacío | El botón "Iniciar sesión" está deshabilitado; no se muestra error (los mensajes de campo obligatorio quedan como defensa en la validación) |
| reCAPTCHA sin completar | El botón está deshabilitado; si se fuerza el envío, "Confirmá que no sos un robot." |
| reCAPTCHA rechazado por Google o vencido | "No pudimos validar el reCAPTCHA. Intentá de nuevo." |
| Correo sin verificar (contraseña correcta) | "Confirmá tu correo antes de iniciar sesión." |
| Demasiados intentos (rate limit de Supabase Auth) | "Demasiados intentos. Esperá un momento e intentá de nuevo." |
| Credenciales incorrectas u otro fallo de Supabase | Mensaje genérico de credenciales (SCRUM-47 lo refina) |
| Edge Function caída o sin red | "No pudimos iniciar sesión. Intentá de nuevo en unos minutos." |
| El script de Google no carga | Mensaje que explica que el reCAPTCHA no cargó; el botón sigue deshabilitado |
| Nueva contraseña vacía, corta o débil | El botón de guardar está deshabilitado y el medidor lista los requisitos que faltan |
| Las contraseñas nuevas no coinciden | "Las contraseñas no coinciden." bajo el campo de repetir |
| La nueva contraseña es igual a la actual | "La nueva contraseña debe ser distinta de la actual." |
| Supabase rechaza la nueva contraseña por su propia política | "La contraseña no cumple los requisitos de seguridad." |
| Fallo de red u otro error al actualizar | "No pudimos actualizar tu contraseña. Intentá de nuevo en unos minutos." y el formulario sigue editable |

## 8. UI esperada

- Título "Iniciar sesión".
- Input de correo (`Input` de `@/components/ui`) e input de contraseña (`PasswordInput`, local de la feature, con la misma apariencia que `Input`).
- Botón con ícono de ojo a la derecha del campo de contraseña: ojo abierto cuando está oculta, ojo tachado cuando está visible.
- Widget reCAPTCHA.
- Botón "Iniciar sesión" (`Button`), con texto "Ingresando..." mientras envía.
- Mensaje de error general con `role="alert"`.
- Enlace a `/registro` para quien no tiene cuenta.
- Aviso de contraseña débil: título, explicación, botón "Cambiar contraseña" y botón "Ahora no".
- Formulario de cambio: dos campos de contraseña con el botón de ojo (los mismos de la HU-23), el medidor de fortaleza bajo la nueva contraseña, botón "Guardar contraseña" ("Guardando..." mientras envía), un mensaje de error general y una forma de volver al aviso.
- Confirmación de éxito con un botón "Continuar".

## 9. Accesibilidad

- Cada input con su label asociado (ya lo hace `Input`).
- Errores en texto, no solo en color; el error general con `role="alert"`.
- El widget de Google trae su propio soporte de teclado; el botón deshabilitado no depende solo del color.
- El botón de visibilidad es un `<button type="button">` alcanzable con Tab, con `aria-label` que dice la acción ("Mostrar contraseña" / "Ocultar contraseña"). No depende solo del ícono.
- El label de la contraseña se asocia al input con `htmlFor`; el botón queda fuera del `<label>` (un botón dentro de un label es HTML inválido).
- El error del campo se enlaza al input con `aria-describedby` y `aria-invalid`.
- Al aparecer el aviso, el foco se mueve a su título para que lectores de pantalla y teclado lo encuentren; el mensaje del aviso y el de la confirmación se marcan como estado (`role="status"`) y los errores del cambio con `role="alert"`. Los campos de contraseña declaran `autocomplete` (`current-password` en el login, `new-password` en el cambio) para los gestores de contraseñas.
- El medidor ya trae su `role="progressbar"` y escribe el nivel con palabras, no solo con color.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; Tailwind con tokens `tacha-*`.
- ViewModel + `constants/`; sin magic strings (constants-standards); sin `if` como en el registro (ternarios y mapas).
- Sin librería de formularios ni wrapper de reCAPTCHA: el script de Google se carga con un hook propio.
- Sin librería de íconos: el ojo es un SVG en línea.
- No se modifica `Input` ni nada de `components/ui/`: `PasswordInput` es un componente local de la feature. Se promueve a `components/ui/` solo cuando una segunda feature lo necesite.
- El código de fortaleza de contraseña (reglas, constantes, evaluación y medidor) se promueve a la raíz porque login es el segundo consumidor: `constants/`, `types/`, `utils/` y `components/`. `registro-manual` pasa a importarlo de ahí sin cambiar su comportamiento.
- Sin librerías nuevas y sin Edge Function nueva: el cambio usa `supabase.auth.updateUser`.
- La secret key de reCAPTCHA vive solo como secret de Supabase, nunca con prefijo `NEXT_PUBLIC_` (security-practices). La site key sí es pública.
- Skills: component-architecture, constants-standards, clean-code-practices, project-structure, security-practices.

## 11. Dependencias

- `services/supabase.client.ts` (`getSupabaseClient`).
- `@/components/ui` (`Input`, `Button`).
- `constants/email.constants.ts` (`EMAIL_PATTERN`) y `utils/email.utils.ts` (`normalizeEmail`): compartidos con `features/registro-manual/` (promovidos desde ahí al tener un segundo consumidor).
- `supabase/functions/login-with-recaptcha/` (nueva).
- Código compartido promovido desde `features/registro-manual/`: `constants/password.constants.ts`, `types/password.types.ts`, `utils/password.utils.ts` (`evaluatePasswordStrength`) y `components/password-strength-meter/`.
- `PasswordInput` y el servicio de Supabase de la HU-22 y HU-23.
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

**Cambio de contraseña (SCRUM-48):** `supabase.auth.updateUser({ password })` desde el cliente, con la sesión recién creada. Errores relevantes de Supabase Auth: `same_password` (igual a la actual) y `weak_password` (incumple la política configurada en el proyecto). No hay tablas ni RLS nuevas.

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
- Caso 22: con una contraseña de nivel débil (por ejemplo `12345678`), un inicio de sesión exitoso muestra el aviso de contraseña débil en lugar de ir directo a la app.
- Caso 23: con una contraseña de nivel intermedio o fuerte, el inicio de sesión va directo a la app, sin aviso.
- Caso 24: un intento fallido (credenciales incorrectas) nunca muestra el aviso ni revela la fortaleza.
- Caso 25: "Ahora no" lleva a la app sin cambiar la contraseña; en el siguiente inicio de sesión con la misma contraseña el aviso vuelve a aparecer.
- Caso 26: "Cambiar contraseña" abre el formulario; mientras la nueva contraseña no cumpla (vacía, corta, débil o distinta de su repetición) el botón de guardar está deshabilitado y el medidor lista lo que falta.
- Caso 27: con una nueva contraseña válida, se actualiza, se muestra la confirmación y "Continuar" lleva a la app; en el siguiente inicio de sesión con la contraseña nueva ya no aparece el aviso.
- Caso 28: una nueva contraseña igual a la actual muestra el mensaje de que debe ser distinta y el formulario sigue editable.
- Caso 29: si el servicio falla (sin red), se muestra el mensaje de error y se puede reintentar.
- Caso 30: se puede volver del formulario al aviso sin perder la sesión.

## 14. Casos fuera de alcance

- Mostrar/ocultar contraseña en el registro, la recuperación o la actualización de contraseña: la HU-23 es solo del login.
- Recordar la preferencia de visibilidad, o volver a ocultar la contraseña tras un tiempo.
- Mensajes específicos de cuenta bloqueada (SCRUM-47). "Inactiva" no existe en Supabase Auth y no se implementa.
- Contraseña vencida: no existe una política de vencimiento ni dónde guardar cuándo se cambió la contraseña (Supabase Auth no lo lleva). Modelarlo exigiría una tabla de perfil con una fecha, que es una decisión de producto aparte; no se implementa.
- Forzar el cambio (el usuario siempre puede continuar con "Ahora no"), recordar que el usuario rechazó el aviso, o endurecer la política de contraseñas del registro.
- Evaluar la contraseña en el servidor o bloquear el inicio de sesión por contraseña débil.
- Pedir la contraseña actual para cambiarla: no se pide porque el usuario acaba de iniciar sesión con ella; la protección ante una sesión robada o un equipo desatendido depende del ajuste "Secure password change" del proyecto de Supabase (ver §15).
- Proteger el formulario de cambio contra un doble envío muy rápido: el botón se deshabilita al re-renderizar y Supabase aplica su propio rate limit.
- Pantalla de recuperación y de actualización de contraseña por correo (HU-28 y HU-29): este cambio es solo del flujo del login.
- Guard de rutas y expiración de sesión (SCRUM-49); cierre por inactividad (HU-27).
- "¿Olvidaste tu contraseña?" (HU-28), login con Google o Facebook.
- Límite de intentos propio: lo aplica Supabase (rate limit de Auth).

## 15. Notas de implementación

- Supabase Auth no integra Google reCAPTCHA de forma nativa (solo hCaptcha y Turnstile). Por eso la verificación va en una Edge Function. **Límite conocido:** quien llame directo al endpoint de Auth de Supabase con la anon key se salta el captcha; cerrarlo requiere el captcha nativo del proyecto.
- **Cambio de contraseña y configuración de Supabase:** `auth.updateUser` puede ser llamado por cualquier sesión vigente. Con "Secure password change" activo (Authentication → Providers → Email) Supabase exige un inicio de sesión reciente; con él desactivado, una sesión robada podría cambiar la contraseña. Hay que revisar ese ajuste y, si se activa, mapear el código `reauthentication_needed` en `PASSWORD_ERROR_CODE_RESULT` (hoy saldría como el mensaje de error inesperado).
- **La política de contraseñas vinculante es la del proyecto de Supabase.** El mínimo de 8 caracteres y el nivel intermedio son reglas del cliente: el servidor puede rechazar algo que el cliente acepta (caso cubierto por `weak_password`) y, al revés, el registro todavía permite contraseñas débiles. Endurecer la política solo en el cliente no protege nada.
- La evaluación de fortaleza en el cliente es ayuda al usuario, no una barrera de seguridad: quien la salte solo evita el aviso, y no obtiene ningún acceso. Por eso no se repite en el servidor.
- Mientras el equipo no registre el reCAPTCHA real, se usan las claves de prueba que publica Google (la casilla siempre pasa); se cambian por las reales sin tocar código.
