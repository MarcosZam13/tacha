# Plan E2E: recuperación de contraseña

Deriva de [SPEC.md](SPEC.md) (SCRUM-51, casos 1 a 10, y SCRUM-52, casos 11 a 25). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/password-recovery/password-recovery.spec.ts` (escenarios `E2E-RECOVERY-nn`, pedir el enlace) y `reset-password.spec.ts` (`E2E-RESET-nn`, la vista de actualización); cada `test(...)` lleva el ID del escenario en el nombre.

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

# Escenarios de la vista de actualización de contraseña (SCRUM-52)

Nivel más bajo que alcanza: la lectura del fragmento de la URL (`getRecoveryLinkStatus`), la regla de cuándo el enlace es válido (`resolveLinkVerification`), las reglas de la contraseña, el ViewModel (guardar, cerrar sesiones, redirigir) y las cuatro pantallas están cubiertos con tests unitarios y de componente. Acá va lo que solo un navegador real con el cliente real de Supabase prueba: que supabase-js lee el enlace de la URL, lo acepta o lo rechaza, y que la pantalla responde bien a lo que realmente emite.

## Datos y entorno

- **Supabase simulado, cliente real:** el navegador usa el cliente real de supabase-js; solo se responden desde el test las llamadas de red: `GET /auth/v1/user` (confirma el usuario del enlace), `PUT /auth/v1/user` (guardar la contraseña) y `POST /auth/v1/logout` (el cierre de las demás sesiones, `scope=others`, y el de recuperación, `scope=local`). No hay cuenta ni correo reales y no se escribe en la base.
- **El enlace** es un fragmento de URL como el que deja Supabase (`#access_token=...&type=recovery`); los tokens son falsos.
- **Sesión:** ninguna, salvo en E2E-RESET-06, que inyecta una sesión "real" falsa en `localStorage` para probar que una sesión iniciada no basta.
- **Reloj:** E2E-RESET-04 controla el reloj del navegador (`page.clock`) para no esperar los 3 segundos reales.
- **Servidor en frío:** igual que en los escenarios de pedir el enlace: se calientan las tres rutas antes de empezar y cada test tiene 90 segundos.
- **Intermitencia observada:** en una corrida en frío con las dos suites juntas (30 tests en paralelo) el servidor de desarrollo dejó de responder a mitad de camino (`ECONNRESET`, `ERR_CONNECTION_REFUSED`) y fallaron 6 tests por conexión, no por aserciones; la misma corrida pasó 30 de 30 en frío dos veces seguidas y 60 de 60 en caliente. Causa no confirmada (la hipótesis es el servidor de desarrollo, no el código). Si vuelve a pasar, repetir la corrida antes de buscar un defecto del producto.
- **Fuera de E2E:** que el correo real llegue, que el enlace real sea aceptado por el servidor de Supabase, que se cierren las sesiones de otro navegador (caso 25) y abrir el mismo enlace dos veces con el proyecto real (caso 20) piden el proyecto real y un correo de un miembro de la organización; quedan en la prueba manual de QA (SPEC §13 y §15).

## Escenarios

### E2E-RESET-01: un enlace aceptado muestra el formulario

- **Cubre:** SCRUM-52 casos 12 y 13.
- **Precondición:** Supabase simulado; sin sesión. Corre en desktop y en Pixel 7.
- **Pasos:** abrir `/actualizar-contrasena` con un fragmento de enlace de recuperación.
- **Resultado esperado:** se ve el título "Nueva contraseña" con los campos "Nueva contraseña" y "Repetir nueva contraseña", "Guardar contraseña" está deshabilitado y la URL ya no lleva `access_token`.

### E2E-RESET-02: las reglas de la contraseña bloquean el guardado

- **Cubre:** SCRUM-52 casos 14 y 15.
- **Precondición:** el formulario a la vista.
- **Pasos:** escribir una contraseña válida con una repetición distinta; después `12345678` repetida; después `Ab1!` repetida.
- **Resultado esperado:** con la repetición distinta se ve "Las contraseñas no coinciden."; en los tres casos "Guardar contraseña" está deshabilitado y no se hace ninguna petición para guardar.

### E2E-RESET-03: guardar cierra las demás sesiones, cambia la contraseña y cierra la de recuperación, en ese orden

- **Cubre:** SCRUM-52 casos 16 y 25 (las peticiones de cierre).
- **Precondición:** el formulario a la vista; Supabase acepta todo.
- **Pasos:** escribir `Prueba2026!` y repetirla; tocar "Guardar contraseña"; tocar "Iniciar sesión".
- **Resultado esperado:** se ve "Contraseña actualizada"; la petición de guardar lleva la contraseña nueva; lo que hizo la pantalla, en orden, es cerrar las demás sesiones, guardar y cerrar la sesión de recuperación; al tocar "Iniciar sesión" la URL es `/login`.

### E2E-RESET-04: se va al inicio de sesión solo

- **Cubre:** SCRUM-52 caso 16.
- **Precondición:** reloj controlado; la confirmación a la vista.
- **Pasos:** adelantar el reloj 2 segundos; adelantarlo otros 2.
- **Resultado esperado:** a los 2 segundos la URL sigue siendo `/actualizar-contrasena`; a los 4 (pasados los 3) es `/login`.

### E2E-RESET-05: un enlace vencido ofrece pedir otro

- **Cubre:** SCRUM-52 caso 18.
- **Precondición:** Supabase simulado; sin sesión.
- **Pasos:** abrir `/actualizar-contrasena` con el fragmento de error de un enlace vencido (`error_code=otp_expired`); tocar "Pedir un enlace nuevo".
- **Resultado esperado:** se ve "El enlace no es válido" y "El enlace para restablecer tu contraseña no es válido o ya venció.", sin ningún campo de contraseña; el enlace lleva a `/recuperar-contrasena`.

### E2E-RESET-06: abrir la página a mano, ni con sesión iniciada, deja cambiar la contraseña

- **Cubre:** SCRUM-52 caso 19.
- **Precondición:** una sesión "real" falsa guardada en el navegador.
- **Pasos:** abrir `/actualizar-contrasena` sin fragmento.
- **Resultado esperado:** se ve "El enlace no es válido" y no existe ningún campo de contraseña.

### E2E-RESET-07: un fallo de red al guardar se puede reintentar

- **Cubre:** SCRUM-52 caso 22.
- **Precondición:** el formulario a la vista; el primer guardado falla por red y el segundo tiene éxito.
- **Pasos:** escribir `Prueba2026!` y repetirla; tocar "Guardar contraseña"; sin cambiar nada, tocarlo otra vez.
- **Resultado esperado:** primero se ve "No pudimos actualizar tu contraseña…" y los dos campos conservan lo escrito; después del segundo intento se ve "Contraseña actualizada".

### E2E-RESET-08: una contraseña igual a la actual se rechaza

- **Cubre:** SCRUM-52 caso 21.
- **Precondición:** el formulario a la vista; Supabase responde `same_password`.
- **Pasos:** escribir `Prueba2026!` y repetirla; tocar "Guardar contraseña".
- **Resultado esperado:** se ve "La nueva contraseña debe ser distinta de la actual.", el botón sigue habilitado y no se ve "Contraseña actualizada".

### E2E-RESET-09: si no se pueden cerrar las demás sesiones, la contraseña no se cambia

- **Cubre:** SCRUM-52 caso 26.
- **Precondición:** el formulario a la vista; el servidor falla al cerrar las demás sesiones.
- **Pasos:** escribir `Prueba2026!` y repetirla; tocar "Guardar contraseña".
- **Resultado esperado:** se ve "No pudimos cerrar tus otras sesiones, así que no cambiamos tu contraseña. Intentá de nuevo."; lo único que hizo la pantalla es intentar cerrar las demás sesiones (no hubo ninguna petición de guardar); los campos conservan lo escrito, el botón sigue habilitado y no se ve "Contraseña actualizada".

### E2E-RESET-10: recargar tras abrir el enlace muestra que ya no es válido

- **Cubre:** SCRUM-52 caso 20.
- **Precondición:** el formulario a la vista tras abrir un enlace aceptado.
- **Pasos:** recargar la página.
- **Resultado esperado:** se ve "El enlace no es válido" y no existe ningún campo de contraseña (Supabase borró el fragmento al aceptar el enlace, y el enlace es de un solo uso).
