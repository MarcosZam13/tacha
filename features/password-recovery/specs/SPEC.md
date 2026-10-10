# Feature: Recuperación de contraseña

Cubre SCRUM-51 (HU-28: recuperación de contraseña). La vista donde se escribe la nueva contraseña (HU-29, SCRUM-52) se agregará a este mismo spec.

## 1. Objetivo

Quien olvidó su contraseña puede pedir un enlace para restablecerla escribiendo su correo. La pantalla nunca revela si el correo tiene cuenta: responde igual exista o no, para que nadie la use para averiguar quién usa Tacha. El enlace lleva a la vista de actualización de contraseña (HU-29, SCRUM-52).

## 2. Alcance

Incluye:
- Un enlace "¿Olvidaste tu contraseña?" en la pantalla de login.
- La ruta pública `/recuperar-contrasena` con un formulario de un solo campo: el correo.
- Validar el formato del correo antes de enviar.
- Pedir a Supabase Auth el correo de recuperación, con el enlace apuntando a `/actualizar-contrasena`.
- Una confirmación genérica, igual para correos con cuenta y sin ella.
- Agregar la ruta a las rutas públicas del guard de sesión.

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- email: string (lo escribe la persona)

## 4. Salidas

- Correo vacío o con formato inválido: mensaje de error bajo el campo; no se envía nada.
- Solicitud aceptada, correo sin cuenta o límite de envíos de Supabase: la misma confirmación genérica.
- Error de red u otro fallo inesperado: mensaje de reintento; el formulario queda editable.

## 5. Reglas de negocio

- La confirmación es una sola: "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña." No cambia según exista o no la cuenta.
- El correo se normaliza (recortar y minúsculas) antes de validarlo y de enviarlo, igual que en el login.
- Supabase no devuelve error cuando el correo no existe; el código no intenta distinguirlo ni lo pregunta.
- **El límite de envíos se muestra como la confirmación genérica, no como un mensaje propio.** Supabase limita cada cuenta a un correo de recuperación por minuto y también tiene un tope global de correos por hora, y ambos responden con el mismo código (`over_email_send_rate_limit`, HTTP 429). Si la pantalla mostrara "esperá un momento" solo en ese caso, pedir dos veces seguidas el mismo correo diría si tiene cuenta (con cuenta: límite; sin cuenta: confirmación). Costo: si el tope global se agota, la persona espera un correo que no llega; puede reintentar más tarde.
- Solo los fallos que no dependen de la cuenta (red, servidor, faltan las variables de Supabase) muestran el mensaje de error.
- La pantalla siempre espera la respuesta de Supabase antes de confirmar: no hay un camino más rápido para correos sin cuenta.
- El enlace de redirección se arma con el origen de la propia página (`window.location.origin`) y la ruta `/actualizar-contrasena`; nunca con un valor tomado de la URL (sin redirección abierta).
- Mientras se envía, el botón queda deshabilitado (no hay doble envío).
- Tras confirmar, la persona puede volver al login o usar otro correo; el mismo correo se puede volver a pedir.

## 6. Estados

Unión derivada de constantes: `idle | submitting | sent | error`. El valor del formulario es `{ email }`. Lo derivado (errores de validación, si el botón está deshabilitado) se calcula en cada render; no se guarda.

## 7. Errores

| Situación | Resultado |
|---|---|
| Correo vacío | "El correo es obligatorio." |
| Formato inválido | "Ingresá un correo válido." |
| Correo sin cuenta | La confirmación genérica |
| Límite de envíos de Supabase | La confirmación genérica (ver §5) |
| Error de red o del servidor | "No pudimos enviar el correo. Intentá de nuevo en unos minutos." |
| Faltan las variables de Supabase | El mismo mensaje de error de red |

## 8. UI esperada

- En `/login`, bajo los campos y antes del botón, un enlace "¿Olvidaste tu contraseña?".
- En `/recuperar-contrasena`: título "Recuperar contraseña", una línea de explicación, campo "Correo electrónico", botón "Enviar enlace" ("Enviando..." mientras tanto) y enlace "Volver al inicio de sesión". Mismo ancho y fondo que el login.
- Confirmado: el formulario se reemplaza por el mensaje genérico, con "Volver al inicio de sesión" y "Usar otro correo".
- Reutiliza `Input` y `Button` de `@/components/ui`.

## 9. Accesibilidad

- El campo tiene su etiqueta visible; el error se anuncia con `role="alert"` (como el login).
- La confirmación es `role="status"`: un lector de pantalla la anuncia al aparecer, aunque el botón de enviar ya no exista.
- El botón deshabilitado mientras envía no depende solo del color.
- Los enlaces son `<Link>` (cambian de página).

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; ViewModel (`hooks/useForgotPasswordViewModel.ts`) con la lógica y `.tsx` solo de presentación.
- Sin librerías nuevas, sin Edge Function y sin reCAPTCHA: `resetPasswordForEmail` lo llama el cliente.
- Sin magic strings (constants-standards): textos, estados y códigos en `constants/`; las rutas, en `constants/routes.constants.ts`, porque las usan login, guard y esta feature.
- Fuera de la feature solo cambian `app/recuperar-contrasena/page.tsx` (nuevo), el enlace en `features/login/components/LoginForm.tsx`, `constants/routes.constants.ts` y `PUBLIC_ROUTES` del guard.
- Skills: component-architecture, constants-standards, clean-code-practices, project-structure, security-practices.

## 11. Dependencias

- `services/supabase.client.ts` (`getSupabaseClient`).
- `utils/email.utils.ts` (`normalizeEmail`) y `constants/email.constants.ts` (`EMAIL_PATTERN`).
- `@/components/ui` (`Input`, `Button`).
- `features/login/` (el enlace) y `features/session-guard/` (ruta pública).
- La ruta `/actualizar-contrasena` de SCRUM-52: es el destino del enlace del correo y todavía no existe (da 404 hasta que se mergee; por eso va en el mismo sprint).
- **Configuración del proyecto de Supabase (manual, la hace quien despliega):** Authentication → URL Configuration → Redirect URLs debe incluir `<origen>/actualizar-contrasena` (local y desplegado). La plantilla del correo no se toca: sin un SMTP propio Supabase no deja editarla y envía la predeterminada, que ya trae el enlace de restablecimiento.

## 12. Contratos externos

**Supabase Auth, desde el cliente:**
- `auth.resetPasswordForEmail(email, { redirectTo })`: envía el correo si la cuenta existe y no devuelve error si no existe. `redirectTo` debe estar en la lista de Redirect URLs del proyecto, o Supabase usa la URL del sitio.
- Límite de envíos: HTTP 429 y código `over_email_send_rate_limit`.

No hay tablas, RLS ni Edge Functions nuevas.

## 13. Casos de aceptación

- Caso 1: en `/login` hay un enlace "¿Olvidaste tu contraseña?" que lleva a `/recuperar-contrasena`.
- Caso 2: `/recuperar-contrasena` se abre sin sesión, con el guard encendido y apagado.
- Caso 3: el correo vacío o con formato inválido muestra el error y no envía nada.
- Caso 4: con un correo registrado aparece la confirmación genérica y llega el correo con el enlace.
- Caso 5: con un correo sin cuenta aparece exactamente la misma confirmación y no llega correo.
- Caso 6: la confirmación y la pantalla de los casos 4 y 5 son idénticas (no hay otra diferencia observable).
- Caso 7: pedir dos veces seguidas el mismo correo (dentro del minuto) muestra la confirmación genérica las dos veces, tenga o no cuenta.
- Caso 8: mientras se envía, el botón está deshabilitado y dice "Enviando...".
- Caso 9: con la red caída se muestra el mensaje de error y el formulario sigue editable para reintentar.
- Caso 10: "Volver al inicio de sesión" lleva a `/login`; "Usar otro correo" devuelve al formulario vacío.
- Caso 11: el enlace del correo abre `/actualizar-contrasena` (se prueba cuando exista SCRUM-52).

## 14. Casos fuera de alcance

- La vista para escribir la nueva contraseña, la expiración del enlace y reenviar si venció: HU-29 (SCRUM-52).
- reCAPTCHA en esta pantalla: la historia no lo pide. La defensa contra abuso es el límite de envíos de Supabase.
- Recuperación por código de 6 dígitos (OTP) en vez de enlace.
- Diseño e idioma de la plantilla del correo: es configuración del proyecto de Supabase.
- Un SMTP propio. El correo por defecto de Supabase tiene un tope muy bajo de envíos por hora y no es para producción.
- Un mensaje propio de "demasiados intentos" (ver §5: revelaría si la cuenta existe).
- Cambiar la contraseña desde el perfil (HU-31, Sprint 4).

## 15. Notas de implementación

- **No se puede probar a mano sin dos cosas:** la URL de redirección permitida en Supabase y un correo real que reciba el mensaje. Anotar en el PR qué se configuró.
- **El SMTP por defecto de Supabase solo entrega a miembros de la organización del proyecto** (según su documentación; pendiente de confirmar al probar). A cualquier otro correo no llega nada aunque la pantalla confirme el envío, así que para la prueba manual hay que usar un correo de un miembro de la organización. Con un SMTP propio desaparece esa restricción.
- **La respuesta genérica es la regla de seguridad de la historia.** Una revisión que "mejore" el mensaje diciendo "ese correo no existe", o que muestre el límite de envíos como error, la rompe. Los casos 6 y 7 la protegen.
- **Pendiente de verificar con el proyecto real** (SPEC §5 se apoya en el comportamiento documentado de Supabase): pedir dos veces seguidas un correo con cuenta y uno sin cuenta, y confirmar que la pantalla muestra lo mismo en las dos.
- **No se promete resistencia al análisis de tiempos:** Supabase responde parecido en ambos casos, pero no se garantiza igual al milisegundo. Se promete "mismo mensaje y misma pantalla".
- **El flujo del cliente usa el enlace implícito:** el token llega en el fragmento `#` de la URL y lo procesa SCRUM-52. Cambiar a PKCE sería una decisión de todo el cliente de Supabase.
- **Cada página pública nueva** debe agregarse a `PUBLIC_ROUTES` del guard o quedará protegida. `/actualizar-contrasena` se agrega en SCRUM-52.
- El correo por defecto de Supabase limita los envíos por hora para todo el proyecto (y solo entrega a miembros de la organización): si el equipo prueba mucho, el límite global puede agotarse y la confirmación seguirá apareciendo sin que llegue el correo.
