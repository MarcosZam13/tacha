# Plan E2E: recuperación de contraseña

Deriva de [SPEC.md](SPEC.md) (SCRUM-51, casos 1 a 10). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/password-recovery/password-recovery.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: la validación del formato (`validateForgotPasswordEmail`), el servicio (qué cuenta como enviado, incluido el límite de envíos y la red caída) y el ViewModel (doble envío, limpiar el fallo al escribir) están cubiertos con tests unitarios (`features/password-recovery/tests/`). Acá va lo que solo un navegador real prueba: que el enlace del login lleva a la pantalla, que lo que se escribe y se envía llega a Supabase con el correo normalizado y el enlace de actualización, y que **la pantalla muestra exactamente lo mismo** sea cual sea la respuesta que no depende de un error de red.

## Datos y entorno

- **Sin cuenta y sin base:** la llamada a Supabase (`POST /auth/v1/recover`) se responde desde el test; no se envía ningún correo, no se lee ni se escribe en la base y no hace falta limpieza.
- **Sesión:** ninguna (la pantalla es pública). El guard (`NEXT_PUBLIC_SESSION_GUARD_ENABLED`) puede estar encendido o apagado.
- **Servidor en frío:** en desarrollo, Next compila cada ruta la primera vez que se pide y puede recargar la página abierta. El spec calienta `/login` y `/recuperar-contrasena` antes de empezar y da 90 segundos por test.
- **Intermitencia observada (E2E-RECOVERY-01):** en una sesión de trabajo, el clic en "¿Olvidaste tu contraseña?" no llegó a navegar en 4 corridas seguidas en frío (la URL se quedaba en `/login`), con el mismo código que después pasó 4 de 4 en frío y 24 de 24 en caliente. Con el clic y la red registrados, a solas y en frío la navegación funciona. Causa no confirmada: pudo ser que hubiera otro servidor de desarrollo o navegador compitiendo en la máquina. El clic se reintenta hasta que la URL cambia (`clickLinkUntilNavigated`), porque en desarrollo una recarga del servidor justo después de cargar la página puede perder el primer clic. Si vuelve a pasar, repetir la corrida y revisar la traza (`npx playwright show-trace`).
- **Fuera de E2E:** que el correo real llegue y que su enlace abra la vista de actualización (casos 4 y 11) piden un correo de un miembro de la organización de Supabase (el SMTP por defecto no entrega a otros) y la ruta de SCRUM-52; quedan en la prueba manual de QA. Que la respuesta real de Supabase para un correo sin cuenta sea idéntica a la de uno con cuenta (casos 5 y 7 con el proyecto real) tampoco se puede probar con la llamada simulada: se verificó a mano (SPEC §15).

## Escenarios

### E2E-RECOVERY-01: llegar a la pantalla desde el login

- **Cubre:** SCRUM-51 casos 1 y 2.
- **Precondición:** sin sesión. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/login`.
  2. Tocar "¿Olvidaste tu contraseña?".
- **Resultado esperado:** la URL es `/recuperar-contrasena` y se ve el título "Recuperar contraseña" con el campo "Correo electrónico" y el botón "Enviar enlace" deshabilitado.

### E2E-RECOVERY-02: un correo inválido no se envía

- **Cubre:** SCRUM-51 caso 3.
- **Precondición:** `/recuperar-contrasena` abierta.
- **Pasos:**
  1. Sin escribir nada, mirar el botón "Enviar enlace".
  2. Escribir `ana@`.
- **Resultado esperado:** con el campo vacío el botón está deshabilitado y no hay mensaje. Con `ana@` se ve "Ingresá un correo válido.", el botón sigue deshabilitado y no se hace ninguna petición a Supabase.

### E2E-RECOVERY-03: la confirmación es la misma, tenga o no efecto

- **Cubre:** SCRUM-51 casos 5, 6 y 7 (sin el envío real). El caso 8 ("Enviando...") lo cubre `ForgotPasswordForm.test.tsx`, y los dos pedidos seguidos con el proyecto real se verificaron a mano (SPEC §15).
- **Precondición:** `/recuperar-contrasena` abierta. Se repite dos veces, con la llamada a Supabase respondida (a) con éxito, (b) con el límite de envíos (429, `over_email_send_rate_limit`) y (c) con un error del servidor (500).
- **Pasos:**
  1. Escribir `  Ana@Correo.COM ` y tocar "Enviar enlace".
- **Resultado esperado:** la petición a Supabase lleva el correo `ana@correo.com` (recortado y en minúsculas) y un `redirect_to` que termina en `/actualizar-contrasena`. En los dos casos se ve el mismo texto: "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam." y no se ve ningún mensaje de error.

### E2E-RECOVERY-04: un fallo de red se puede reintentar

- **Cubre:** SCRUM-51 caso 9.
- **Precondición:** `/recuperar-contrasena` abierta; la primera llamada a Supabase falla por red y la segunda tiene éxito.
- **Pasos:**
  1. Escribir `ana@correo.com` y tocar "Enviar enlace".
  2. Ver el resultado; sin cambiar nada, tocar "Enviar enlace" otra vez.
- **Resultado esperado:** primero se ve "No pudimos enviar el correo. Intentá de nuevo en unos minutos.", el campo conserva el correo y el botón vuelve a estar habilitado. Después del segundo intento se ve la confirmación.

### E2E-RECOVERY-05: las salidas de la confirmación

- **Cubre:** SCRUM-51 caso 10.
- **Precondición:** la confirmación ya está a la vista (llamada a Supabase con éxito).
- **Pasos:**
  1. Tocar "Usar otro correo".
  2. Pedir el enlace de nuevo y tocar "Volver al inicio de sesión".
- **Resultado esperado:** el primer toque devuelve el formulario con el campo vacío. El segundo lleva a `/login`.
