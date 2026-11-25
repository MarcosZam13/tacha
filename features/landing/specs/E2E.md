# Plan E2E: landing — formulario de contacto y navbar

Deriva de [SPEC.md](SPEC.md) (casos 10 a 17). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/landing/contact-form.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

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

### E2E-CONTACTO-04: contacto desde Nosotros
- **Cubre:** caso 17 (SCRUM-36).
- **Pasos:** abrir `/nosotros`; completar Nombre, Correo y Mensaje; marcar el reCAPTCHA; tocar "Enviar mensaje".
- **Resultado esperado:** se ve la confirmación y la petición lleva `source: "about"`.

### E2E-LOGIN-ENTRADA-02: desde el registro se llega al login
- **Cubre:** SCRUM-144 (incluido en SCRUM-158).
- **Pasos:** abrir `/registro` y tocar "Iniciá sesión", debajo del título.
- **Resultado esperado:** se abre `/login`.

## Navbar (SCRUM-159)

Los tests están en `e2e/features/landing/public-navbar.spec.ts`. Que el botón se oculte con una sesión registrada lo prueba `PublicNavbarCta.test.tsx`: es lógica del ViewModel y no necesita un navegador.

### E2E-NAVBAR-01: un visitante llega al login desde la navbar
- **Cubre:** caso 18.
- **Pasos:** abrir `/` sin sesión; tocar "Iniciar sesión" en la navbar.
- **Resultado esperado:** "Registrarse" sigue visible y la URL pasa a `/login`.
