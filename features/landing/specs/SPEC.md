# Feature: Landing

## 1. Objetivo
Que un visitante sin sesión entienda qué es Tacha, conozca a la organización y sus reglas de uso, confíe en ella (testimonios) y llegue al registro.

## 2. Alcance
Incluye:
- Sprint 1: HU-01 navbar, HU-02 hero, HU-08 footer, HU-09 redes, HU-11 logo.
- Sprint 2: HU-03 intro (SCRUM-25), HU-04 leer más (SCRUM-26), HU-05 testimonios (SCRUM-27), HU-07 sección de demo con marcador "Aquí va la demo" (SCRUM-29), HU-10 términos (SCRUM-32), HU-12 misión y visión (SCRUM-34), HU-13 organización (SCRUM-35).
- Sprint 3: HU-06 formulario de contacto con reCAPTCHA en / y el enlace "Contacto" de la navbar apuntando a él (SCRUM-28).
- Sprint 3: HU-14 el mismo formulario de contacto en /nosotros (SCRUM-36).

No incluye: "Iniciar sesión" en la navbar (HU-22), el video de la demo.

## 3. Entradas
- testimonials: TestimonialList (lista no vacía) → TestimonialsCarousel
- Clic en "Leer más", en las flechas del carrusel y en "Volver".
- Formulario de contacto: name: string, email: string, message: string, captchaToken (lo entrega el widget de reCAPTCHA).
- source: "landing" | "about" (prop de ContactSection según la página).

## 4. Salidas
- "Leer más" lleva a la sección ampliada (#mas-informacion).
- Las flechas cambian el testimonio visible.
- "Volver" regresa a la página anterior, o a / si no hay página anterior.
- Un envío válido invoca la Edge Function submit-contact-message y guarda una fila en contact_messages.
- Envío exitoso: el formulario se reemplaza por una confirmación con "Enviar otro mensaje".
- Envío fallido: mensaje de error en un role="alert" y el texto escrito se conserva.
- "Contacto" de la navbar lleva a la sección del formulario (/#formulario-contacto).

## 5. Reglas de negocio
- La información ampliada detalla los mismos puntos de la intro (una sola fuente de datos).
- El carrusel es circular: después del último viene el primero y viceversa.
- Con un solo testimonio no se muestran controles.
- /, /terminos y /nosotros son rutas públicas (PUBLIC_ROUTES del session guard).
- Todo enlace de la navbar o el footer apunta a una página que existe.
- Nombre, correo y mensaje son obligatorios (los espacios de los extremos no cuentan).
- Nombre: 2 a 100 caracteres. Mensaje: 10 a 1000. Correo: formato válido, máximo 254, se guarda en minúsculas.
- Sin token de reCAPTCHA no se envía. El token se verifica en el servidor con la clave secreta.
- Un token sirve para un solo intento: después de cada envío (exitoso o no) el widget se reinicia.
- Máximo 5 mensajes por correo por hora (lo controla la Edge Function).

## 6. Estados
- Carrusel: índice del testimonio activo (0..n-1).
- Formulario de contacto: idle | submitting | success | error (CONTACT_SUBMIT_STATUS).
- Resto de la feature: sin estado.

## 7. Errores
- Se entra a /terminos directo (pestaña nueva): "Volver" lleva a /.
- Campo obligatorio vacío, nombre o mensaje fuera de largo, correo inválido: mensaje bajo el campo.
- reCAPTCHA sin marcar: "Confirmá que no sos un robot."
- reCAPTCHA rechazado por Google, límite de envíos, error del servidor o de red: mensaje general en role="alert".
- El script de reCAPTCHA no carga: "No pudimos cargar el reCAPTCHA. Recargá la página."

## 8. UI esperada
- Intro: título, descripción, 3 tarjetas, enlace "Leer más".
- Información ampliada: un bloque por cada punto de la intro y "Volver arriba".
- Demo: recuadro con el texto "Aquí va la demo".
- Testimonios: inicial, nombre, ubicación, cita, flechas y posición "1 de 3".
- Footer: enlaces "Términos y condiciones" y "Nosotros".
- /terminos: botón "Volver", título, fecha y secciones numeradas.
- /nosotros: título, Misión y Visión en bloques separados, "Quiénes somos" y la sección "Contactanos" al final.
- Sección "Contactanos" (id formulario-contacto) al final de /: descripción, Nombre, Correo electrónico, Mensaje (textarea con contador), reCAPTCHA y botón "Enviar mensaje" / "Enviando...".
- Confirmación: texto de éxito y botón "Enviar otro mensaje".

## 9. Accesibilidad
- Un h1 por página; h2 por sección; h3 por bloque.
- Las flechas tienen aria-label; el testimonio se anuncia con aria-live="polite".
- La etiqueta de "Leer más" incluye el texto visible.
- La sección de contacto es una región con nombre (aria-labelledby al h2 "Contactanos").
- Cada campo tiene label; los obligatorios llevan "*" y el atributo required.
- El botón no se deshabilita por campos vacíos: al enviar se muestran los errores, para que la persona sepa qué falta.
- La confirmación usa role="status" y los errores generales, role="alert".

## 10. Restricciones técnicas
- TypeScript estricto, sin any; Tailwind con tokens tacha-*.
- Sin librerías de carrusel.
- "use client" solo en TestimonialsCarousel, BackButton y ContactSection; su lógica va en un ViewModel.
- Textos, rutas e IDs en constantes.

## 11. Dependencias
- features/landing/constants/landing.constants.ts, carousel.constants.ts, terms.constants.ts
- @/components/ui (Button), @/constants (BUTTON_VARIANT)
- features/session-guard/constants/session-guard.constants.ts (PUBLIC_ROUTES)
- features/landing/constants/contact.constants.ts
- components/recaptcha-widget/RecaptchaWidget.tsx, @/constants (RECAPTCHA, RECAPTCHA_SITE_KEY, EMAIL_PATTERN)
- services/supabase.client.ts (functions.invoke)

## 12. Contratos externos
- Edge Function `submit-contact-message` (POST).
  - Body: { name, email, message, source: "about" | "landing", captchaToken }.
  - Respuestas: 201 { received: true } · 400 { code: "invalid_request" | "captcha_failed" } · 429 { code: "rate_limited" } · 500 { code: "server_misconfigured" | "server_error" }.
- Tabla `contact_messages` (migración 028): RLS activado, sin políticas y sin permisos para anon ni authenticated. Solo escribe la Edge Function con la service role.
- Secret de Supabase: RECAPTCHA_SECRET_KEY (el mismo del login).

## 13. Casos de aceptación
- Caso 1 (HU-03): / muestra "¿Qué es Tacha?" con 3 puntos, sin sesión.
- Caso 2 (HU-04): "Leer más" baja a la información ampliada con los mismos 3 puntos; "Volver arriba" e "Inicio" regresan.
- Caso 3 (HU-05): se ve un testimonio con nombre y ubicación; las flechas cambian de testimonio en forma circular.
- Caso 4 (HU-07): la sección de demo se ve sin sesión con el texto "Aquí va la demo". CA-03 a CA-05 quedan pendientes hasta tener el video.
- Caso 5 (HU-10): el footer lleva a /terminos sin sesión; "Volver" regresa a la página anterior.
- Caso 6 (HU-12): /nosotros muestra Misión y Visión en bloques separados.
- Caso 7 (HU-13): /nosotros muestra el origen, el propósito y las características de la organización.
- Caso 8: sin scroll horizontal en 320px; se ve bien en modo claro y oscuro.
- Caso 9: tsc, lint, test y build pasan.
- Caso 10 (HU-06 CA-01, CA-02): / muestra la sección "Contactanos" con Nombre, Correo electrónico, Mensaje, reCAPTCHA y "Enviar mensaje"; "Contacto" de la navbar lleva a ella.
- Caso 11 (CA-03): enviar con campos vacíos muestra "obligatorio" en cada uno y no llama al servidor.
- Caso 12 (CA-04, CA-05): sin marcar el reCAPTCHA no se envía y se pide marcarlo; si Google rechaza el token, se muestra el error y se pide marcarlo de nuevo.
- Caso 13 (CA-06): un correo sin formato válido o un mensaje de menos de 10 caracteres muestra su error.
- Caso 14 (CA-07): un envío exitoso muestra la confirmación y vacía el formulario.
- Caso 15 (CA-08): un fallo del servidor o de la red muestra un mensaje claro y conserva el texto.
- Caso 16 (seguridad): un insert directo a contact_messages con la anon key falla con 42501.
- Caso 17 (HU-14 CA-01 a CA-08): /nosotros muestra la misma sección "Contactanos", con las mismas validaciones, reCAPTCHA, confirmación y errores; el mensaje se guarda con source "about".

## 14. Casos fuera de alcance
- El video de la demo y sus controles.
- Autoplay del carrusel.
- Contenido editable desde una base de datos.
- Avisar por correo al equipo cuando llega un mensaje (requiere un proveedor de correo; hoy se leen en el Table Editor de Supabase).
- Panel para leer o responder mensajes desde la app.
- reCAPTCHA v3 / invisible.

## 15. Notas de implementación
Los textos de misión, visión, términos y testimonios son un borrador hasta que el equipo los valide.
