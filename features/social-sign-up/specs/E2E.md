# Plan E2E: registro con proveedor externo

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/social-sign-up/social-sign-up.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: la detección del correo existente, la desvinculación, la marca y los estados del ViewModel tienen tests unitarios. Acá va lo que solo prueba un navegador real: los botones montados en la página, la salida hacia el proveedor y la ruta pública de retorno.

## Datos y entorno

- **Google y Facebook:** son de terceros. La petición a `/auth/v1/authorize` se responde desde el test con una redirección de vuelta. No se crean usuarios ni se escribe en la base.
- **Fuera de E2E:** el inicio de sesión real, la cuenta nueva, el correo existente y la desvinculación quedan en la prueba manual con cuentas reales.

## Escenarios

### E2E-SOCIAL-01: se muestran los botones
- **Cubre:** CA-01.
- **Pasos:** abrir `/registro`.
- **Resultado esperado:** se ven "Registrarse con Google" y "Registrarse con Facebook".

### E2E-SOCIAL-02: abre el flujo del proveedor y cancelar muestra el error
- **Cubre:** CA-02 y CA-06.
- **Pasos:** abrir `/registro`; tocar "Registrarse con Facebook"; el proveedor simulado vuelve con `error=access_denied`.
- **Resultado esperado:** la petición lleva `provider=facebook` y la ruta de retorno; se ve "No pudimos completar el registro" y el enlace "Volver al registro".

### E2E-SOCIAL-03: abrir la página de retorno sin iniciar el flujo
- **Cubre:** regla de negocio de §5.
- **Pasos:** abrir `/registro/social` directamente.
- **Resultado esperado:** se ve "No pudimos completar el registro".

## SCRUM-43: completar datos

Los tests están en `e2e/features/social-sign-up/complete-sign-up.spec.ts`. La sesión es una cuenta de Google sin marca guardada en el navegador (`signInAsNewSocialUser`, misma forma que `e2e/support/fake-session.ts`) y Supabase se responde desde el test: `GET /auth/v1/user` devuelve esa cuenta y `PUT /auth/v1/user` registra el guardado y devuelve la cuenta con lo guardado, como el real. No se escribe en la base.

### E2E-SOCIAL-04: un nombre vacío no se guarda
- **Cubre:** SCRUM-43 CA-01 y CA-02.
- **Pasos:** abrir `/registro/completar`; borrar el nombre; tocar "Continuar".
- **Resultado esperado:** el campo traía el nombre del proveedor; se ve "El nombre es obligatorio.", la URL no cambia y no sale ningún guardado.

### E2E-SOCIAL-05: guardar el nombre lleva a la lista
- **Cubre:** SCRUM-43 CA-03.
- **Pasos:** abrir `/registro/completar`; escribir "Ana María"; tocar "Continuar".
- **Resultado esperado:** sale un guardado con `name` "Ana María" y `social_sign_up_completed_at`, y la URL pasa a `/lista`.

### E2E-SOCIAL-06: una cuenta sin completar no entra a la app
- **Cubre:** SCRUM-43 CA-06.
- **Pasos:** con la sesión de una cuenta de Google sin marca, abrir `/lista`.
- **Resultado esperado:** la URL pasa a `/registro/completar` y se ve "Completá tu registro".

## SCRUM-44: términos y condiciones

Mismo archivo y misma preparación que SCRUM-43. E2E-SOCIAL-04 y 05 marcan el checkbox antes de continuar, y E2E-SOCIAL-05 comprueba además que se guarde `terms_accepted_at`.

### E2E-SOCIAL-07: sin aceptar los términos no se completa el registro
- **Cubre:** SCRUM-44 CA-01, CA-02 y CA-03.
- **Pasos:** abrir `/registro/completar` sin marcar el checkbox; después abrir `/lista`.
- **Resultado esperado:** el checkbox "Acepto los términos y condiciones" está sin marcar, "Continuar" está deshabilitado, "Ver términos y condiciones" apunta a `/terminos`, `/lista` vuelve al formulario y no sale ningún guardado.

### E2E-SOCIAL-08: volver desde los términos regresa al formulario
- **Cubre:** SCRUM-44 CA-03.
- **Pasos:** abrir `/registro/completar`; tocar "Ver términos y condiciones"; en `/terminos`, tocar "← Volver".
- **Resultado esperado:** la URL pasa a `/terminos` y, al volver, a `/registro/completar`, donde se ve "Completá tu registro".
