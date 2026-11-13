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
