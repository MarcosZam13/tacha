# Feature: Login

Cubre SCRUM-45 (HU-22), SCRUM-46 (HU-23), SCRUM-47 (HU-24), SCRUM-48 (HU-25) y SCRUM-50 (HU-27). El guard de sesión (SCRUM-49) tiene su propio spec en `features/session-guard/specs/`.

## 1. Objetivo

Un visitante con cuenta verificada inicia sesión con correo y contraseña, y antes de que el sistema procese el intento debe superar un reCAPTCHA, para proteger la cuenta contra ataques automatizados. Mientras escribe la contraseña puede mostrarla u ocultarla para comprobar que la ingresó bien. Cuando el intento falla, recibe un mensaje claro que le explica qué pasó: uno genérico si las credenciales son incorrectas (sin revelar cuál campo falló) y uno propio si la cuenta no está verificada o está bloqueada, para poder reintentar o saber a quién acudir. Si inicia sesión con una contraseña débil, el sistema se lo avisa y le ofrece cambiarla en ese mismo momento, sin obligarlo. Si deja la sesión abierta y se va, el sistema la cierra solo tras un periodo sin actividad, le avisa por qué en el login y lo lleva allí, para que nadie use una sesión olvidada.

## 2. Alcance

Incluye:
- Pantalla `/login` con correo, contraseña y el widget reCAPTCHA (v2, casilla "No soy un robot").
- Verificación del token de reCAPTCHA en el servidor (Edge Function) antes de intentar la autenticación.
- Inicio de sesión con Supabase Auth y redirección a la app al tener éxito.
- Mensaje de error cuando el reCAPTCHA no se completa o falla.
- Botón con ícono de ojo en el campo de contraseña para alternar entre texto oculto (puntos) y visible (texto plano). Oculto por defecto.
- Mensaje genérico para credenciales incorrectas y mensajes específicos para cuenta no verificada, cuenta bloqueada y demasiados intentos. Los mensajes son visibles y no bloquean el formulario: el usuario puede corregir y reintentar.
- Aviso de contraseña débil tras un inicio de sesión exitoso, con la opción de cambiarla desde el mismo flujo (formulario de nueva contraseña con medidor de fortaleza) o de continuar sin cambiarla.
- Cierre de sesión por inactividad (SCRUM-50): un componente montado en el layout raíz mide el tiempo desde la última acción (clics o toques, teclas, scroll, cambio de ruta) mientras haya una sesión real; al superar el límite (30 minutos por defecto, configurable por variable de entorno) cierra la sesión, navega a `/login?motivo=inactividad` y el login muestra el aviso "Tu sesión se cerró por inactividad".
- La última actividad se comparte entre pestañas (`localStorage`): estar activo en una evita el cierre en las otras.
- `signOutUser()` en `services/session.service.ts` (HU-32 lo reutilizará).

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- email: string
- password: string
- captchaToken: string (lo entrega el widget de Google al completarse; vence a los ~2 minutos)
- Clic o activación por teclado (Enter o espacio) del botón de visibilidad de la contraseña
- newPassword: string y confirmNewPassword: string (formulario de cambio de contraseña)
- Decisión del usuario ante el aviso: cambiar la contraseña o continuar ("Ahora no")
- Eventos de actividad del navegador: `pointerdown`, `keydown`, `scroll`, `visibilitychange`; el pathname (un cambio de ruta cuenta como actividad)
- La sesión de Supabase (vía `subscribeToSessionChanges`) y la marca de última actividad en `localStorage`
- `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES`: minutos permitidos de inactividad (vacío, no numérico o menor que 1 → 30)
- Parámetro `motivo` de la URL de `/login`

## 4. Salidas

- Éxito: la sesión queda guardada en el navegador y se redirige a la ruta principal.
- Error de reCAPTCHA: mensaje propio, sin intentar autenticar.
- Error de credenciales: un único mensaje genérico, igual para correo inexistente y contraseña incorrecta.
- Error con causa conocida: un mensaje propio para "correo sin verificar", "cuenta bloqueada" y "demasiados intentos".
- Cualquier otro fallo: el mensaje de error inesperado.
- El formulario queda editable para reintentar; el widget se reinicia tras cada intento fallido.
- El campo de contraseña cambia su tipo entre `password` y `text`, y el ícono entre ojo y ojo tachado. El valor escrito no se pierde al alternar.
- Contraseña débil: en lugar de ir directo a la app, se muestra un aviso con "Cambiar contraseña" y "Ahora no".
- Cambio exitoso: la contraseña queda actualizada, se confirma con un mensaje y el usuario continúa a la app.
- "Ahora no": el usuario continúa a la app con su contraseña actual.
- Sin sesión real: el componente de inactividad no hace nada (sin temporizador ni escuchas).
- Límite superado: se cierra la sesión y se navega con `replace` a `/login?motivo=inactividad`.
- `/login` con `motivo=inactividad`: aviso visible "Tu sesión se cerró por inactividad. Iniciá sesión de nuevo." encima del formulario.

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
- Una contraseña es débil si su nivel de fortaleza es el más bajo (cumple 2 o menos de las 5 reglas: 8 caracteres, minúscula, mayúscula, número y carácter especial). Se usa la misma evaluación que el registro.
- La fortaleza se evalúa solo después de un inicio de sesión exitoso, con la contraseña que el usuario acaba de escribir. Un intento fallido nunca revela la fortaleza.
- La contraseña escrita se evalúa en memoria: no se guarda, no se envía a otro lugar ni se escribe en logs.
- El aviso no bloquea: "Ahora no" siempre está disponible. Reaparece en cada inicio de sesión con contraseña débil mientras no se cambie.
- La nueva contraseña es obligatoria, tiene al menos el largo mínimo, coincide con su repetición y alcanza al menos el nivel intermedio de fortaleza. El botón de guardar queda deshabilitado mientras no se cumpla.
- El cambio usa la sesión que acaba de crearse; no se pide la contraseña actual otra vez.
- El límite de inactividad por defecto es 30 minutos. Una variable vacía, no numérica o menor que 1 usa el valor por defecto (nunca `0`: cerraría la sesión al instante).
- La inactividad se mide con la marca compartida: vence cuando `ahora - últimaActividad >= límite`, no cuando un temporizador local lo diga. Si otra pestaña tuvo actividad, la marca es más nueva y esta pestaña espera.
- Registrar actividad se limita a una escritura por segundo (`scroll` y `pointerdown` pueden dispararse decenas de veces por segundo).
- Una sesión anónima no cuenta: no se mide ni se cierra (igual que el guard, SCRUM-49). El componente actúa según la sesión, no según la ruta ni según el interruptor del guard.
- Al volver a una pestaña oculta (`visibilitychange`) se revisa la marca de inmediato: los temporizadores de pestañas en segundo plano se retrasan.
- El cierre usa `signOut` con alcance local: borra la sesión del navegador (y por compartir almacenamiento, de todas las pestañas) sin depender del servidor ni cerrar otros dispositivos. Se borra la marca de actividad.
- El motivo de la redirección es una bandera, nunca un destino: la URL no decide a dónde se navega (sin redirección abierta). Solo `motivo=inactividad` muestra el aviso.

## 6. Estados

Unión derivada de constantes: `idle | submitting | error | success`. El estado del widget (`token` presente o no) es aparte: se deriva de `captchaToken`, no es un booleano más.

La visibilidad de la contraseña es un estado local del campo (oculta o visible). El tipo del input (`password` o `text`) se deriva de él, no se guarda aparte.

Tras un inicio de sesión exitoso el login suma una fase: `weak-password` (aviso o formulario de cambio) además de `success`. El cambio de contraseña tiene su propia unión derivada de constantes: `notice | form | saving | done`. Ninguno de los dos se modela con booleanos sueltos.

La inactividad no guarda estado: el vencimiento es una función pura de `(ahora, últimaActividad, límite)` y la sesión se reduce a `SESSION_STATUS` (`checking | authenticated | unauthenticated`), que ya existe.

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
| Nueva contraseña vacía, corta o débil | El botón de guardar está deshabilitado y el medidor lista los requisitos que faltan |
| Las contraseñas nuevas no coinciden | "Las contraseñas no coinciden." bajo el campo de repetir |
| La nueva contraseña es igual a la actual | "La nueva contraseña debe ser distinta de la actual." |
| Supabase rechaza la nueva contraseña por su propia política | "La contraseña no cumple los requisitos de seguridad." |
| Fallo de red u otro error al actualizar | "No pudimos actualizar tu contraseña. Intentá de nuevo en unos minutos." y el formulario sigue editable |
| `localStorage` no disponible (bloqueado, modo privado estricto) | La actividad se guarda solo en memoria de la pestaña: el cierre funciona, sin compartir entre pestañas |
| La marca guardada no es un número | Se trata como sin marca: se toma el momento actual |
| `signOut` falla (red) | Igual se redirige a `/login` con el aviso; la sesión local se limpia por el alcance local |
| Faltan las variables de Supabase | Se trata como sin sesión: el componente de inactividad no hace nada |

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
- Aviso de inactividad: un bloque de texto sobre el título del login, visible solo con `?motivo=inactividad`. El componente que mide la inactividad no dibuja nada; no hay cuenta regresiva ni modal de "¿sigues ahí?".

## 9. Accesibilidad

- Cada input con su label asociado (ya lo hace `Input`).
- Errores en texto, no solo en color; el error general con `role="alert"`.
- El widget de Google trae su propio soporte de teclado; el botón deshabilitado no depende solo del color.
- El botón de visibilidad es un `<button type="button">` alcanzable con Tab, con `aria-label` que dice la acción ("Mostrar contraseña" / "Ocultar contraseña"). No depende solo del ícono.
- El label de la contraseña se asocia al input con `htmlFor`; el botón queda fuera del `<label>` (un botón dentro de un label es HTML inválido).
- El error del campo se enlaza al input con `aria-describedby` y `aria-invalid`.
- Al aparecer el aviso, el foco se mueve a su título para que lectores de pantalla y teclado lo encuentren; el mensaje del aviso y el de la confirmación se marcan como estado (`role="status"`) y los errores del cambio con `role="alert"`. Los campos de contraseña declaran `autocomplete` (`current-password` en el login, `new-password` en el cambio) para los gestores de contraseñas.
- El medidor ya trae su `role="progressbar"` y escribe el nivel con palabras, no solo con color.
- El aviso de inactividad lleva `role="status"`: un lector de pantalla lo anuncia al llegar al login sin robar el foco, y es texto completo, no solo color.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; Tailwind con tokens `tacha-*`.
- ViewModel + `constants/`; sin magic strings (constants-standards); sin `if` como en el registro (ternarios y mapas).
- Sin librería de formularios ni wrapper de reCAPTCHA: el script de Google se carga con un hook propio.
- Sin librería de íconos: el ojo es un SVG en línea.
- No se modifica `Input` ni nada de `components/ui/`: `PasswordInput` es un componente local de la feature. Se promueve a `components/ui/` solo cuando una segunda feature lo necesite.
- El código de fortaleza de contraseña (reglas, constantes, evaluación y medidor) se promueve a la raíz porque login es el segundo consumidor: `constants/`, `types/`, `utils/` y `components/`. `registro-manual` pasa a importarlo de ahí sin cambiar su comportamiento.
- Sin librerías nuevas y sin Edge Function nueva: el cambio usa `supabase.auth.updateUser`.
- La secret key de reCAPTCHA vive solo como secret de Supabase, nunca con prefijo `NEXT_PUBLIC_` (security-practices). La site key sí es pública.
- Inactividad: sin librerías nuevas (nada de `react-idle-timer`): son cuatro listeners y una función pura. Un solo efecto sincroniza con lo externo (listeners y temporizador); lo derivado se calcula, no se guarda. Minutos, eventos, claves de `localStorage`, parámetro, textos y rutas van en `constants/`.
- El componente de inactividad vive en `features/login/` (así está en Jira) pero se monta en `app/layout.tsx`, porque debe medir en todas las pantallas privadas. Fuera de la feature solo cambian `app/layout.tsx` (una línea), `services/session.service.ts` (`signOutUser`) y `.env.example`.
- Skills: component-architecture, constants-standards, clean-code-practices, project-structure, security-practices.

## 11. Dependencias

- `services/supabase.client.ts` (`getSupabaseClient`).
- `@/components/ui` (`Input`, `Button`).
- `constants/email.constants.ts` (`EMAIL_PATTERN`) y `utils/email.utils.ts` (`normalizeEmail`): compartidos con `features/registro-manual/` (promovidos desde ahí al tener un segundo consumidor).
- `supabase/functions/login-with-recaptcha/` (nueva).
- Código compartido promovido desde `features/registro-manual/`: `constants/password.constants.ts`, `types/password.types.ts`, `utils/password.utils.ts` (`evaluatePasswordStrength`) y `components/password-strength-meter/`.
- `PasswordInput` y el servicio de Supabase de la HU-22 y HU-23.
- Variables: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (cliente) y secret `RECAPTCHA_SECRET_KEY` (Edge Function).
- Inactividad (SCRUM-50): `services/session.service.ts` (`subscribeToSessionChanges`) y `utils/getSessionStatus.ts` (de SCRUM-49/135), `next/navigation` (`usePathname`, `useRouter`, `useSearchParams`) y la variable opcional `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES`.

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

**Cambio de contraseña (SCRUM-48):** `supabase.auth.updateUser({ password })` desde el cliente, con la sesión recién creada. Errores relevantes de Supabase Auth: `same_password` (igual a la actual) y `weak_password` (incumple la política configurada en el proyecto). No hay tablas ni RLS nuevas.

**Cierre por inactividad (SCRUM-50):** `supabase.auth.signOut({ scope: "local" })` desde el cliente: borra la sesión del navegador sin depender de que el servidor responda y sin cerrar los demás dispositivos. `onAuthStateChange` (ya usado por `subscribeToSessionChanges`) avisa del `SIGNED_OUT`. No hay tablas, RLS ni Edge Functions nuevas.

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
- Caso 22: con una contraseña de nivel débil (por ejemplo `12345678`), un inicio de sesión exitoso muestra el aviso de contraseña débil en lugar de ir directo a la app.
- Caso 23: con una contraseña de nivel intermedio o fuerte, el inicio de sesión va directo a la app, sin aviso.
- Caso 24: un intento fallido (credenciales incorrectas) nunca muestra el aviso ni revela la fortaleza.
- Caso 25: "Ahora no" lleva a la app sin cambiar la contraseña; en el siguiente inicio de sesión con la misma contraseña el aviso vuelve a aparecer.
- Caso 26: "Cambiar contraseña" abre el formulario; mientras la nueva contraseña no cumpla (vacía, corta, débil o distinta de su repetición) el botón de guardar está deshabilitado y el medidor lista lo que falta.
- Caso 27: con una nueva contraseña válida, se actualiza, se muestra la confirmación y "Continuar" lleva a la app; en el siguiente inicio de sesión con la contraseña nueva ya no aparece el aviso.
- Caso 28: una nueva contraseña igual a la actual muestra el mensaje de que debe ser distinta y el formulario sigue editable.
- Caso 29: si el servicio falla (sin red), se muestra el mensaje de error y se puede reintentar.
- Caso 30: se puede volver del formulario al aviso sin perder la sesión.

Con `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES=1` (SCRUM-50):
- Caso 31: con sesión real y sin tocar nada durante 1 minuto, la sesión se cierra y se llega a `/login?motivo=inactividad` con el aviso.
- Caso 32: hacer clic o teclear antes del minuto evita el cierre y el conteo arranca de nuevo.
- Caso 33: hacer scroll cuenta como actividad.
- Caso 34: navegar a otra pantalla privada cuenta como actividad.
- Caso 35: con dos pestañas abiertas, estar activo en una evita el cierre en la otra.
- Caso 36: dejar la pestaña en segundo plano más allá del límite y volver: la sesión se cierra al volver, sin esperar al temporizador.
- Caso 37: tras el cierre, "atrás" no devuelve a la pantalla privada.
- Caso 38: el aviso aparece solo con `?motivo=inactividad`; un `/login` normal no lo muestra, y `?motivo=otra-cosa` tampoco.
- Caso 39: sin sesión (en `/login`, `/` o `/registro`) no se mide ni se cierra nada.
- Caso 40: con una sesión anónima no se cierra nada.
- Caso 41: sin la variable, el límite es 30 minutos; con valor vacío, `0` o texto, también.
- Caso 42: con `localStorage` bloqueado, la pestaña igual se cierra por su propia inactividad.

## 14. Casos fuera de alcance

- Mostrar/ocultar contraseña en el registro, la recuperación o la actualización de contraseña: la HU-23 es solo del login.
- Recordar la preferencia de visibilidad, o volver a ocultar la contraseña tras un tiempo.
- Mensaje específico de cuenta "inactiva": Supabase Auth no tiene un estado de inactividad distinto del baneo (un usuario baneado se muestra como bloqueado). Modelarlo exigiría una tabla de perfil con un estado de cuenta, que es una decisión de producto aparte; no se implementa.
- Enlace o botón para reenviar el correo de verificación desde el login, desbloqueo de la cuenta desde la app, y un canal de soporte propio: los mensajes solo informan.
- Contraseña vencida: no existe una política de vencimiento ni dónde guardar cuándo se cambió la contraseña (Supabase Auth no lo lleva). Modelarlo exigiría una tabla de perfil con una fecha, que es una decisión de producto aparte; no se implementa.
- Forzar el cambio (el usuario siempre puede continuar con "Ahora no"), recordar que el usuario rechazó el aviso, o endurecer la política de contraseñas del registro.
- Evaluar la contraseña en el servidor o bloquear el inicio de sesión por contraseña débil.
- Pedir la contraseña actual para cambiarla: no se pide porque el usuario acaba de iniciar sesión con ella; la protección ante una sesión robada o un equipo desatendido depende del ajuste "Secure password change" del proyecto de Supabase (ver §15).
- Proteger el formulario de cambio contra un doble envío muy rápido: el botón se deshabilita al re-renderizar y Supabase aplica su propio rate limit.
- Pantalla de recuperación y de actualización de contraseña por correo (HU-28 y HU-29): este cambio es solo del flujo del login.
- Guard de rutas y expiración de sesión (SCRUM-49).
- Aviso previo con cuenta regresiva o botón "seguir conectado" antes del cierre por inactividad: no lo piden los criterios.
- Botón de cerrar sesión (HU-32, Sprint 4), duración máxima total de la sesión (ajuste del proyecto de Supabase), límite distinto por rol o usuario, y volver a la pantalla de origen tras iniciar sesión (parámetro `next`, ver SPEC del guard).
- "¿Olvidaste tu contraseña?" (HU-28), login con Google o Facebook.
- Límite de intentos propio: lo aplica Supabase (rate limit de Auth).

## 15. Notas de implementación

- Supabase Auth no integra Google reCAPTCHA de forma nativa (solo hCaptcha y Turnstile). Por eso la verificación va en una Edge Function. **Límite conocido:** quien llame directo al endpoint de Auth de Supabase con la anon key se salta el captcha; cerrarlo requiere el captcha nativo del proyecto.
- **Enumeración de cuentas, verificado probando contra el proyecto de Supabase (SCRUM-47):**
  - `email_not_confirmed` solo aparece con la contraseña correcta: con una incorrecta sale el mensaje genérico. No se filtra nada.
  - `user_banned` aparece **aunque la contraseña sea incorrecta**: Supabase comprueba el ban antes de la contraseña. Quien conozca un correo puede saber si esa cuenta existe y está bloqueada.
  - Limitación aceptada: lo ve igual cualquiera que llame directo al endpoint de Auth con la anon key, así que dejar de reenviarlo desde la función no cerraría la fuga y sí incumpliría el criterio de la HU-24 (mensaje de cuenta bloqueada). Afecta solo a cuentas baneadas, que un administrador marca a mano; para el resto, correo inexistente y contraseña incorrecta siguen siendo indistinguibles.
- Quien ya tiene un par correo/contraseña válido puede saber si la cuenta está sin verificar: es inherente a que la HU-24 pida ese mensaje.
- **Cambio de contraseña y configuración de Supabase:** `auth.updateUser` puede ser llamado por cualquier sesión vigente. Con "Secure password change" activo (Authentication → Providers → Email) Supabase exige un inicio de sesión reciente; con él desactivado, una sesión robada podría cambiar la contraseña. Hay que revisar ese ajuste y, si se activa, mapear el código `reauthentication_needed` en `PASSWORD_ERROR_CODE_RESULT` (hoy saldría como el mensaje de error inesperado).
- **La política de contraseñas vinculante es la del proyecto de Supabase.** El mínimo de 8 caracteres y el nivel intermedio son reglas del cliente: el servidor puede rechazar algo que el cliente acepta (caso cubierto por `weak_password`) y, al revés, el registro todavía permite contraseñas débiles. Endurecer la política solo en el cliente no protege nada.
- La evaluación de fortaleza en el cliente es ayuda al usuario, no una barrera de seguridad: quien la salte solo evita el aviso, y no obtiene ningún acceso. Por eso no se repite en el servidor.
- **Inactividad: "configurable" se resuelve con una variable de entorno,** leída al compilar (igual que el interruptor del guard): cambiar el límite exige reiniciar `npm run dev` o reconstruir. No es un ajuste que cada persona cambie en la app.
- **Los temporizadores del navegador no son exactos** en pestañas ocultas (se reducen a una vez por minuto o menos). Por eso la comprobación real compara marcas de tiempo y se repite al volver a la pestaña.
- **Inactividad no es expiración del token:** el token de acceso se renueva solo mientras la sesión viva; este cierre corta la sesión aunque el token se pueda renovar. El cierre es local: el token de renovación sigue válido en el servidor hasta que Supabase lo expire; cerrarlo con alcance global afectaría los demás dispositivos de la persona y no se hace.
- **Probar a mano:** poner `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES=1` en `.env.local`, reiniciar `npm run dev`, iniciar sesión con un usuario real y no tocar nada 1 minuto. Quitar la variable de prueba al terminar.
- Mientras el equipo no registre el reCAPTCHA real, se usan las claves de prueba que publica Google (la casilla siempre pasa); se cambian por las reales sin tocar código.
