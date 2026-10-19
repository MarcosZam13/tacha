# Plan E2E: landing — formulario de contacto

Deriva de [SPEC.md](SPEC.md) (casos 10 a 16). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/landing/contact-form.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: las reglas de los campos (`validateContactForm`), la traducción de códigos (`contact.service`) y los estados del ViewModel, incluida la limpieza de lo que se envía, tienen tests unitarios. Acá va lo que solo prueba un navegador real: la sección montada en la página, el enlace de la navbar, el widget conectado al formulario y la petición que sale hacia la Edge Function.

## Datos y entorno

- **reCAPTCHA:** es UI de terceros. El script de Google se responde desde el test con un `grecaptcha` falso que dibuja el botón "No soy un robot (E2E)" y entrega el token `e2e-captcha-token`.
- **Edge Function:** se responde desde el test (`page.route`). No se escribe en la base compartida, así que no hace falta limpieza. Lo que se guarda en la base lo prueba `supabase/tests/028_create_contact_messages.test.sql`.
- **Fuera de E2E:** la verificación real con Google y el límite por correo (quedan en la prueba manual de QA, con la función desplegada).

## Escenarios

### E2E-CONTACTO-01: desde la navbar se llega al formulario y el envío se confirma
- **Cubre:** casos 10 y 14.
- **Pasos:**
  1. Abrir `/`.
  2. Tocar "Contacto" en la navbar.
  3. Completar Nombre, Correo y Mensaje.
  4. Marcar el reCAPTCHA.
  5. Tocar "Enviar mensaje".
- **Resultado esperado:** la URL termina en `#formulario-contacto` y se ve "¡Gracias! Recibimos tu mensaje y te vamos a responder al correo que nos dejaste." La petición lleva los datos, el token y `source: "landing"`.

### E2E-CONTACTO-02: sin reCAPTCHA no se envía
- **Cubre:** caso 12.
- **Pasos:** completar los campos sin marcar el reCAPTCHA y tocar "Enviar mensaje".
- **Resultado esperado:** aparece "Confirmá que no sos un robot." y no sale ninguna petición a la Edge Function.

### E2E-CONTACTO-03: error del servidor
- **Cubre:** caso 15.
- **Pasos:** con la función respondiendo 500, completar, marcar el reCAPTCHA y enviar.
- **Resultado esperado:** aparece "No pudimos enviar tu mensaje. Intentá de nuevo en unos minutos." y el nombre escrito sigue en el campo.
