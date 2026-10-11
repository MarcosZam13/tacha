# Feature: Recuperación de contraseña

Cubre SCRUM-51 (HU-28: recuperación de contraseña) y SCRUM-52 (HU-29: vista de actualización de contraseña). Los casos 1 a 11 son de HU-28 y del 12 en adelante, de HU-29.

## 1. Objetivo

Quien olvidó su contraseña puede pedir un enlace para restablecerla escribiendo su correo. La pantalla nunca revela si el correo tiene cuenta: responde igual exista o no, para que nadie la use para averiguar quién usa Tacha. El enlace lleva a la vista de actualización de contraseña (HU-29, SCRUM-52).

Quien llega desde el enlace del correo ve un formulario para elegir una contraseña nueva, con las mismas reglas que el registro y el cambio de contraseña del login. Si el enlace venció, ya se usó o no existe, se le dice y se le ofrece pedir otro. Al guardar, se cierran todas las sesiones de la cuenta y se lleva al login para entrar con la contraseña nueva.

## 2. Alcance

Incluye:
- Un enlace "¿Olvidaste tu contraseña?" en la pantalla de login.
- La ruta pública `/recuperar-contrasena` con un formulario de un solo campo: el correo.
- Validar el formato del correo antes de enviar.
- Pedir a Supabase Auth el correo de recuperación, con el enlace apuntando a `/actualizar-contrasena`.
- Una confirmación genérica, igual para correos con cuenta y sin ella.
- Agregar la ruta a las rutas públicas del guard de sesión.
- **HU-29:** la ruta pública `/actualizar-contrasena` y su lógica para decidir si el enlace es válido, leyendo el fragmento de la URL y esperando la confirmación de Supabase.
- **HU-29:** formulario "Nueva contraseña" y "Repetir nueva contraseña" con el ojo de mostrar u ocultar, el medidor de fortaleza y las mismas reglas del cambio de contraseña del login (HU-25).
- **HU-29:** guardar con `auth.updateUser({ password })`, cerrar todas las sesiones de la cuenta, mostrar la confirmación y redirigir al login (a los 3 segundos o antes con un botón).
- **HU-29:** enlace vencido, usado o inexistente: un mensaje y "Pedir un enlace nuevo" hacia `/recuperar-contrasena`.
- **HU-29:** agregar la ruta a las rutas públicas del guard.
- **HU-29:** promover a carpetas compartidas lo que el login y esta feature usan a la vez (campo de contraseña con ojo, validación de la nueva contraseña y su servicio), sin cambiar el comportamiento del login.

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- email: string (lo escribe la persona)
- **HU-29:** newPassword: string y confirmPassword: string (el formulario de nueva contraseña).
- **HU-29:** el fragmento de la URL al cargar `/actualizar-contrasena`: con enlace válido trae `access_token` y `type=recovery`; con enlace vencido o usado trae `error`, `error_code` (por ejemplo `otp_expired`) y `error_description`.
- **HU-29:** los eventos de sesión de Supabase `INITIAL_SESSION` y `PASSWORD_RECOVERY`.

## 4. Salidas

- Correo vacío: el botón queda deshabilitado, sin mensaje. Correo con formato inválido: mensaje de error bajo el campo. En ambos casos no se envía nada.
- Solicitud aceptada, correo sin cuenta o límite de envíos de Supabase: la misma confirmación genérica.
- Error de red u otro fallo inesperado: mensaje de reintento; el formulario queda editable.
- **HU-29:** verificando el enlace: un indicador de carga, sin formulario.
- **HU-29:** enlace válido: el formulario de nueva contraseña.
- **HU-29:** enlace vencido, usado o inexistente: el mensaje y "Pedir un enlace nuevo".
- **HU-29:** contraseña actualizada: todas las sesiones de la cuenta cerradas, la confirmación y la redirección a `/login`.
- **HU-29:** error al guardar (red, contraseña igual a la actual o rechazada): el mensaje y el formulario editable, con lo escrito.

## 5. Reglas de negocio

- La confirmación es una sola: "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam." No cambia según exista o no la cuenta.
- El correo se normaliza (recortar y minúsculas) antes de validarlo y de enviarlo, igual que en el login.
- Supabase no devuelve error cuando el correo no existe; el código no intenta distinguirlo ni lo pregunta.
- **El límite de envíos se muestra como la confirmación genérica, no como un mensaje propio.** Supabase limita cada cuenta a un correo de recuperación por minuto y también tiene un tope global de correos por hora, y ambos responden con el mismo código (`over_email_send_rate_limit`, HTTP 429). Si la pantalla mostrara "esperá un momento" solo en ese caso, pedir dos veces seguidas el mismo correo diría si tiene cuenta (con cuenta: límite; sin cuenta: confirmación). Costo: si el tope global se agota, la persona espera un correo que no llega; puede reintentar más tarde.
- **Los errores del servidor de Supabase (5xx) también se muestran como la confirmación genérica.** Supabase solo intenta mandar el correo si la cuenta existe: si el SMTP está caído o rechaza la dirección, el error solo aparece con cuentas reales, y mostrarlo delataría cuáles lo son. Costo: con Supabase o el SMTP caídos la persona ve "enviado" y espera un correo que no llega; puede reintentar más tarde.
- Solo los fallos que no dependen de la cuenta muestran el mensaje de error: la petición que no llega a Supabase (red caída o faltan las variables) y un 4xx que depende de la dirección y no de la cuenta (por ejemplo, un formato que Supabase rechaza).
- La pantalla siempre espera la respuesta de Supabase antes de confirmar: no hay un camino más rápido para correos sin cuenta.
- El enlace de redirección se arma con el origen de la propia página (`window.location.origin`) y la ruta `/actualizar-contrasena`; nunca con un valor tomado de la URL (sin redirección abierta).
- Mientras se envía, el botón queda deshabilitado (no hay doble envío).
- Tras confirmar, la persona puede volver al login o usar otro correo; el mismo correo se puede volver a pedir.
- **HU-29: el enlace es de un solo uso y vence.** El de Supabase dura una hora por defecto (Authentication → Email OTP Expiration; no se cambia). Un enlace ya usado, vencido o inventado da el mismo resultado: la pantalla no los distingue.
- **HU-29: solo el enlace de esta visita habilita el formulario.** La pantalla lo muestra únicamente si el fragmento de la URL traía un enlace de recuperación y Supabase confirmó la sesión de recuperación (evento `PASSWORD_RECOVERY`). Una sesión ya iniciada no basta: abrir `/actualizar-contrasena` a mano, sin enlace, muestra "enlace no válido" aunque haya sesión (cambiar la contraseña con sesión iniciada es HU-31). Recargar la página tras abrir el enlace también lo muestra, porque Supabase borra el fragmento de la URL al procesarlo.
- **HU-29: mismas reglas de contraseña que el cambio del login (HU-25):** obligatoria, con el largo mínimo, de nivel intermedio o fuerte, y que coincida con su repetición. El botón "Guardar contraseña" queda deshabilitado mientras no se cumplan.
- **HU-29: la nueva contraseña igual a la actual** o rechazada por la política del proyecto de Supabase muestra su propio mensaje, y el formulario sigue editable.
- **HU-29: al guardar con éxito se cierran todas las sesiones de la cuenta** (`signOut` con alcance global). Quien recupera una contraseña puede haber perdido el control de la cuenta, y cambiar la contraseña no cierra las sesiones que otra persona tenga abiertas. Si ese cierre global falla, se cierra al menos la sesión de este navegador y se sigue: la contraseña ya cambió. Costo: también se cierran las sesiones de los demás dispositivos de la persona.
- **HU-29: la redirección a `/login` se hace a los 3 segundos y también con un botón inmediato.** Una redirección solo con temporizador no deja leer a quien necesita más tiempo; el botón evita esperar.
- **HU-29:** la contraseña escrita no se guarda ni se muestra fuera de los campos, y se borra de la memoria al guardar con éxito (igual que en el login). El token del enlace nunca se escribe en logs ni en el almacenamiento propio de la app.

## 6. Estados

Unión derivada de constantes: `idle | submitting | sent | error`. El valor del formulario es `{ email }`. Lo derivado (errores de validación, si el botón está deshabilitado) se calcula en cada render; no se guarda.

**HU-29:** la vista de actualización tiene su propia unión derivada de constantes: `verifying | ready | invalid | saving | done`. Los valores son `{ newPassword, confirmPassword }`; los errores de validación, la fortaleza y si el botón está deshabilitado se calculan en cada render.

## 7. Errores

| Situación | Resultado |
|---|---|
| Correo vacío | El botón "Enviar enlace" está deshabilitado y no se muestra error (el mensaje "El correo es obligatorio." queda como defensa en la validación, como en el login) |
| Formato inválido | "Ingresá un correo válido." |
| Correo sin cuenta | La confirmación genérica |
| Límite de envíos de Supabase (429) | La confirmación genérica (ver §5) |
| Error del servidor de Supabase (5xx) | La confirmación genérica (ver §5) |
| Red caída, faltan las variables, o un 4xx que Supabase da por la dirección | "No pudimos enviar el correo. Intentá de nuevo en unos minutos." |
| Faltan las variables de Supabase | El mismo mensaje de error de red |
| **HU-29:** enlace vencido, ya usado o inexistente (fragmento con `error`, sin enlace, o Supabase no confirma la sesión) | "El enlace para restablecer tu contraseña no es válido o ya venció." y "Pedir un enlace nuevo" |
| **HU-29:** nueva contraseña vacía, corta o débil | El botón "Guardar contraseña" está deshabilitado y el medidor lista los requisitos que faltan |
| **HU-29:** las contraseñas no coinciden | "Las contraseñas no coinciden." bajo el campo de repetir |
| **HU-29:** la nueva contraseña es igual a la actual | "La nueva contraseña debe ser distinta de la actual." |
| **HU-29:** Supabase rechaza la contraseña por su política | "La contraseña no cumple los requisitos de seguridad." |
| **HU-29:** fallo de red u otro error al actualizar | "No pudimos actualizar tu contraseña. Intentá de nuevo en unos minutos." y el formulario sigue editable |
| **HU-29:** falla el cierre de todas las sesiones al guardar | No se avisa: se cierra la sesión de este navegador y se confirma, porque la contraseña ya cambió |

## 8. UI esperada

- En `/login`, bajo los campos y antes del botón, un enlace "¿Olvidaste tu contraseña?".
- En `/recuperar-contrasena`: título "Recuperar contraseña", una línea de explicación, campo "Correo electrónico", botón "Enviar enlace" ("Enviando..." mientras tanto) y enlace "Volver al inicio de sesión". Mismo ancho y fondo que el login.
- Confirmado: el formulario se reemplaza por el mensaje genérico, con "Volver al inicio de sesión" y "Usar otro correo".
- Reutiliza `Input` y `Button` de `@/components/ui`.
- **HU-29, `/actualizar-contrasena`:** mismo ancho y fondo que el login.
  - Verificando: un `Spinner` centrado con la etiqueta "Verificando el enlace".
  - Enlace válido: título "Nueva contraseña", los campos "Nueva contraseña" y "Repetir nueva contraseña" (con el botón de ojo), el medidor de fortaleza bajo la nueva, un mensaje de error general y el botón "Guardar contraseña" ("Guardando..." mientras envía).
  - Enlace no válido: título "El enlace no es válido", el mensaje y un botón-enlace "Pedir un enlace nuevo".
  - Actualizada: título "Contraseña actualizada", el mensaje "Tu contraseña se actualizó. Te llevamos al inicio de sesión para que entres con la nueva." y un botón "Iniciar sesión".

## 9. Accesibilidad

- El campo tiene su etiqueta visible; el error se anuncia con `role="alert"` (como el login).
- Al aparecer la confirmación el foco pasa a su título (`tabIndex={-1}`): el botón de enviar, que lo tenía, desaparece y el foco caería en el body. El mensaje es `role="status"` para que un lector de pantalla lo anuncie.
- El botón deshabilitado mientras envía no depende solo del color.
- Los enlaces son `<Link>` (cambian de página).
- **HU-29:** el campo de contraseña declara `autocomplete="new-password"` para los gestores de contraseñas, y el botón de ojo se alcanza con Tab y dice su acción (HU-23).
- **HU-29:** al pasar de "verificando" al formulario, al enlace no válido o a la confirmación, el foco va al título de la nueva pantalla; el mensaje de la confirmación es `role="status"` y los errores del guardado, `role="alert"`. El indicador de carga trae `role="status"` y su etiqueta.
- **HU-29:** la redirección automática no es la única salida: el botón "Iniciar sesión" permite continuar sin esperar.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; ViewModel (`hooks/useForgotPasswordViewModel.ts`) con la lógica y `.tsx` solo de presentación.
- Sin librerías nuevas, sin Edge Function y sin reCAPTCHA: `resetPasswordForEmail` lo llama el cliente.
- Sin magic strings (constants-standards): textos, estados y códigos en `constants/`; las rutas, en `constants/routes.constants.ts`, porque las usan login, guard y esta feature.
- Fuera de la feature solo cambian `app/recuperar-contrasena/page.tsx` (nuevo), el enlace en `features/login/components/LoginForm.tsx`, `constants/routes.constants.ts` y `PUBLIC_ROUTES` del guard.
- **HU-29:** sin librerías nuevas ni Edge Function: el cambio usa `supabase.auth.updateUser` y el cierre `supabase.auth.signOut({ scope: "global" })`.
- **HU-29: lo compartido con el login se promueve, no se importa de otra feature** (`project-structure`): el campo de contraseña con ojo, la validación de la nueva contraseña y el servicio de cambio de contraseña pasan a `components/`, `utils/`, `services/` y `constants/` compartidos, y el login importa de ahí. Es un movimiento sin cambio de comportamiento, en una tarea aparte y con las pruebas del login como red de seguridad (como en SCRUM-48).
- Skills: component-architecture, constants-standards, clean-code-practices, project-structure, security-practices.

## 11. Dependencias

- `services/supabase.client.ts` (`getSupabaseClient`).
- `utils/email.utils.ts` (`normalizeEmail`) y `constants/email.constants.ts` (`EMAIL_PATTERN`).
- `@/components/ui` (`Input`, `Button`).
- `features/login/` (el enlace) y `features/session-guard/` (ruta pública).
- La ruta `/actualizar-contrasena` de SCRUM-52: es el destino del enlace del correo (se crea en esta misma feature).
- **HU-29:** de `features/login/` sale, hacia carpetas compartidas, el campo `PasswordInput` (con `EyeIcon` y su ViewModel), `validateChangePasswordForm`, `updateUserPassword` y las constantes y tipos que usan. `components/password-strength-meter/` y `utils/password.utils.ts` ya son compartidos (SCRUM-48).
- **HU-29:** `services/session.service.ts` (`subscribeToSessionChanges`, `signOutUser`) y `features/session-guard/` (ruta pública).
- **Configuración del proyecto de Supabase (manual, la hace quien despliega):** Authentication → URL Configuration → Redirect URLs debe incluir `<origen>/actualizar-contrasena` (local y desplegado). La plantilla del correo no se toca: sin un SMTP propio Supabase no deja editarla y envía la predeterminada, que ya trae el enlace de restablecimiento.

## 12. Contratos externos

**Supabase Auth, desde el cliente:**
- `auth.resetPasswordForEmail(email, { redirectTo })`: envía el correo si la cuenta existe y no devuelve error si no existe. `redirectTo` debe estar en la lista de Redirect URLs del proyecto, o Supabase usa la URL del sitio.
- Límite de envíos: HTTP 429 y código `over_email_send_rate_limit`.

**HU-29, Supabase Auth, desde el cliente (flujo implícito, `detectSessionInUrl` activo):**
- Al cargar `/actualizar-contrasena` con un enlace válido, supabase-js guarda la sesión de recuperación, **borra el fragmento `#` de la URL** y emite `PASSWORD_RECOVERY` justo después de `INITIAL_SESSION`. Un `INITIAL_SESSION` con sesión **no** prueba que hubo un enlace de recuperación.
- Con un enlace vencido o ya usado, el fragmento **queda en la URL** con `error=access_denied`, `error_code=otp_expired` y `error_description=...`, y supabase-js **no emite ningún evento**: el error solo se ve leyendo la URL.
- `auth.updateUser({ password })`: cambia la contraseña de la sesión actual. Errores relevantes: `same_password` (igual a la actual) y `weak_password` (incumple la política del proyecto).
- `auth.signOut({ scope: "global" })`: revoca todas las sesiones de la cuenta.

No hay tablas, RLS ni Edge Functions nuevas.

## 13. Casos de aceptación

- Caso 1: en `/login` hay un enlace "¿Olvidaste tu contraseña?" que lleva a `/recuperar-contrasena`.
- Caso 2: `/recuperar-contrasena` se abre sin sesión, con el guard encendido y apagado.
- Caso 3: con el correo vacío el botón está deshabilitado y no se envía nada; con un formato inválido se muestra el error bajo el campo y el botón sigue deshabilitado.
- Caso 4: con un correo registrado aparece la confirmación genérica y llega el correo con el enlace.
- Caso 5: con un correo sin cuenta aparece exactamente la misma confirmación y no llega correo.
- Caso 6: la confirmación y la pantalla de los casos 4 y 5 son idénticas (no hay otra diferencia observable).
- Caso 7: pedir dos veces seguidas el mismo correo (dentro del minuto) muestra la confirmación genérica las dos veces, tenga o no cuenta.
- Caso 8: mientras se envía, el botón está deshabilitado y dice "Enviando...".
- Caso 9: con la red caída se muestra el mensaje de error y el formulario sigue editable para reintentar.
- Caso 10: "Volver al inicio de sesión" lleva a `/login`; "Usar otro correo" devuelve al formulario vacío.
- Caso 11: el enlace del correo abre `/actualizar-contrasena`.

Casos de HU-29 (SCRUM-52):
- Caso 12: al abrir el enlace válido del correo se ve el formulario con "Nueva contraseña" y "Repetir nueva contraseña", cada una con su botón de ojo.
- Caso 13: al abrir el enlace válido, la URL queda sin el fragmento (el token no se queda en la barra de direcciones ni en el historial).
- Caso 14: con contraseñas distintas aparece "Las contraseñas no coinciden." y "Guardar contraseña" está deshabilitado.
- Caso 15: con una contraseña corta o débil, el medidor lista lo que falta y "Guardar contraseña" está deshabilitado (el mismo medidor y reglas que el registro y el login).
- Caso 16: con una contraseña válida y repetida, se guarda y se ve "Contraseña actualizada"; a los 3 segundos, o al tocar "Iniciar sesión", se llega a `/login`.
- Caso 17: después del caso 16, iniciar sesión con la contraseña nueva funciona y con la anterior no; y con el guard encendido, abrir `/lista` lleva a `/login` (no queda ninguna sesión).
- Caso 18: un enlace vencido o ya usado muestra "El enlace para restablecer tu contraseña no es válido o ya venció." y "Pedir un enlace nuevo", que lleva a `/recuperar-contrasena`.
- Caso 19: abrir `/actualizar-contrasena` a mano, sin enlace, muestra lo mismo que el caso 18, aunque haya una sesión iniciada.
- Caso 20: recargar la página justo después de abrir el enlace válido muestra el caso 18 (el enlace es de un solo uso).
- Caso 21: una contraseña igual a la actual muestra "La nueva contraseña debe ser distinta de la actual." y el formulario sigue editable.
- Caso 22: con la red caída al guardar se muestra el error, lo escrito se conserva y se puede reintentar.
- Caso 23: un doble clic en "Guardar contraseña" envía una sola vez ("Guardando...").
- Caso 24: con el guard encendido y sin sesión, `/actualizar-contrasena` se abre.
- Caso 25: tras guardar con éxito, las sesiones abiertas en otros dispositivos o navegadores de la cuenta quedan cerradas.

## 14. Casos fuera de alcance

- Cambiar la contraseña con la sesión iniciada, pidiendo la contraseña actual: HU-31 (Sprint 4).
- Recuperación por código de 6 dígitos en vez de enlace; PKCE; cambiar cuánto dura el enlace (es un ajuste del proyecto de Supabase).
- Un correo que avise que la contraseña cambió: es una plantilla de Supabase ("Password changed"), que no se edita sin un SMTP propio.
- Invalidar enlaces anteriores al pedir uno nuevo: lo decide Supabase.
- Mantener la sesión abierta tras actualizar la contraseña: se cierran todas por seguridad y se entra de nuevo con la nueva.
- reCAPTCHA en esta pantalla: la historia no lo pide, y no frenaría el abuso, porque cualquiera puede llamar `/auth/v1/recover` directo con la anon key. La defensa es el límite de envíos de Supabase (un correo por minuto por cuenta). Riesgo aceptado y sus costos: hasta ~60 correos por hora a una víctima, y agotar el tope global por hora deja a todos sin recuperación (negación de servicio sin autenticación). Mitigaciones fuera de esta historia: el CAPTCHA de Attack Protection de Supabase y un SMTP propio con cuota propia.
- Recuperación por código de 6 dígitos (OTP) en vez de enlace.
- Diseño e idioma de la plantilla del correo: es configuración del proyecto de Supabase.
- Un SMTP propio. Es un requisito para que la recuperación funcione con usuarios reales (ver §15) y va en un ticket aparte, no en este PR. El correo por defecto de Supabase tiene un tope muy bajo de envíos por hora y solo entrega a miembros de la organización.
- Un mensaje propio de "demasiados intentos" (ver §5: revelaría si la cuenta existe).
- Cambiar la contraseña desde el perfil (HU-31, Sprint 4).

## 15. Notas de implementación

- **No se puede probar a mano sin dos cosas:** la URL de redirección permitida en Supabase y un correo real que reciba el mensaje. Anotar en el PR qué se configuró.
- **El SMTP por defecto de Supabase solo entrega a miembros de la organización del proyecto** (verificado, ver más abajo). A cualquier otro correo no llega nada aunque la pantalla confirme el envío, así que para la prueba manual hay que usar un correo de un miembro de la organización. Con un SMTP propio desaparece esa restricción, pero aparecen los fallos de envío (rebotes, proveedor caído): por eso los 5xx se muestran como confirmación (§5).
- **La respuesta genérica es la regla de seguridad de la historia.** Una revisión que "mejore" el mensaje diciendo "ese correo no existe", o que muestre el límite de envíos como error, la rompe. Los casos 6 y 7 la protegen.
- **Verificado a mano en el proyecto (SCRUM-51), casos 1 a 10:**
  - Caso 4: un correo con cuenta recibe el mensaje y el enlace trae `redirect_to=<origen>/actualizar-contrasena`, así que la URL quedó en Redirect URLs.
  - Caso 5: un correo sin cuenta en Tacha muestra la misma confirmación genérica y no recibe ningún mensaje.
  - Caso 7: pedir dos veces seguidas, dentro del minuto, un correo con cuenta y uno sin cuenta muestra la misma confirmación en los dos, así que el límite de envíos no delata la cuenta.
  - Casos 1, 2, 3, 6, 8, 9 y 10: pasan en el navegador (con el guard encendido y apagado).
  - Un correo **con cuenta en Tacha pero que no es miembro de la organización de Supabase** no recibe el mensaje, y la pantalla muestra igual la confirmación genérica. Confirma que el SMTP por defecto de Supabase solo entrega a miembros de la organización.
- **Consecuencia para producción:** con el SMTP por defecto, la recuperación de contraseña **no funciona para usuarios reales** (solo para miembros de la organización). Antes de usarla con usuarios hay que configurar un SMTP propio (Authentication → SMTP Settings). No es parte del código de esta historia; hace falta un ticket aparte en Jira.
- **No se promete resistencia al análisis de tiempos:** Supabase responde parecido en ambos casos, pero no se garantiza igual al milisegundo. Se promete "mismo mensaje y misma pantalla".
- **El flujo del cliente usa el enlace implícito:** el token llega en el fragmento `#` de la URL y lo procesa supabase-js al cargar `/actualizar-contrasena` (SCRUM-52). Cambiar a PKCE sería una decisión de todo el cliente de Supabase.
- **Redirect URLs sin comodines abiertos:** la lista debe tener solo las URLs exactas (`<origen>/actualizar-contrasena`). Con un comodín amplio (`https://*.vercel.app/**` o `**`), un atacante con un despliegue propio recibiría el token de recuperación en el fragmento `#`. No se puede verificar desde el repo: se revisa en el dashboard.
- **Cada página pública nueva** debe agregarse a `PUBLIC_ROUTES` del guard o quedará protegida. `/actualizar-contrasena` se agrega en SCRUM-52.
- **HU-29, cómo se decide que el enlace es válido** (apoyado en el código de supabase-js 2.117.2): al montar, antes de que el cliente de Supabase procese la URL, se lee el fragmento. Sin `access_token` con `type=recovery`, o con `error`, la pantalla va directo a "no válido". Con un enlace aparente, espera a que Supabase lo confirme: lo da por válido con `PASSWORD_RECOVERY`, y por no válido si, ya con `INITIAL_SESSION`, el fragmento sigue en la URL (Supabase solo lo borra al aceptar el enlace). Si se actualiza esa librería, hay que volver a comprobar este comportamiento.
- **HU-29, `INITIAL_SESSION` no basta:** una persona con sesión iniciada que abre un enlace inválido recibe su sesión vieja en `INITIAL_SESSION`; tomarla por sesión de recuperación dejaría cambiar la contraseña con un enlace roto.
- **HU-29, el cierre global tiene costo:** también cierra las sesiones de los demás dispositivos de la persona. Es lo deseado tras recuperar una contraseña; si se quisiera no hacerlo, bastaría pasar a alcance local.
- **HU-29, el token vive en la URL un instante:** hasta que supabase-js lo procesa y borra el fragmento. No sale en el encabezado `Referer` (los fragmentos no se envían) pero sí queda en el historial si el borrado falla; el caso 13 lo comprueba.
- **HU-29, la sesión de recuperación es una sesión real:** el guard la ve como autenticada y el cierre por inactividad (SCRUM-50) empieza a medirla mientras la persona escribe. Al guardar, se cierra.
- **HU-29, por probar en el proyecto real:** abrir el enlace dos veces (el segundo debe dar el caso 18) y confirmar que, tras guardar, una sesión abierta en otro navegador se cierra.
- El correo por defecto de Supabase limita los envíos por hora para todo el proyecto (y solo entrega a miembros de la organización): si el equipo prueba mucho, el límite global puede agotarse y la confirmación seguirá apareciendo sin que llegue el correo.
