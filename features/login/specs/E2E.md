# Plan E2E: login — cierre por inactividad

Deriva de [SPEC.md](SPEC.md) (SCRUM-50, casos 31 a 44). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/login/login-inactivity.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: la regla de vencimiento (`isInactivityExpired`, incluido el borde "justo en el límite") y la lectura de la variable (`parseInactivityLimit`) están cubiertas con tests unitarios (`features/login/tests/`). Acá va lo que solo un navegador real prueba: que el componente montado en el layout raíz mide la inactividad con sus listeners y su temporizador, cierra la sesión, redirige a `/login` y que el aviso aparece una sola vez.

## Datos y entorno

- **Sesión:** una sesión real **falsa**, inyectada en `localStorage` antes de abrir `/lista` (usuario no anónimo, vence en 24 horas). No hay cuenta real, no se llama a la base ni se escribe nada: no hace falta limpieza. Las llamadas a Supabase (`rest` y `auth`) se responden desde el test, y el cierre de sesión (`/auth/v1/logout`) con `204`.
- **Tiempo:** el reloj del navegador se controla con `page.clock`; no se espera 30 minutos reales. El límite que se prueba es el valor por defecto (30 minutos).
- **Precondición del entorno:** `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES` ausente o en `30`. Con otro valor (por ejemplo `1`, el de la prueba manual) E2E-INACT-02 falla. El guard (`NEXT_PUBLIC_SESSION_GUARD_ENABLED`) puede estar encendido o apagado: una sesión real pasa en los dos casos.
- **Servidor en frío:** en desarrollo, Next compila cada ruta la primera vez que se pide y puede recargar la página abierta, lo que descarta el reloj ya adelantado. Por eso el spec calienta `/terminos`, `/lista` y `/login` antes de empezar (`warmUpRoutes`) y da 90 segundos por test.
- **Fuera de E2E:** dos pestañas (casos 35 y 42), pestaña en segundo plano (36), sesión anónima (40) y `sessionStorage` bloqueado (44) no se automatizan: piden varias pestañas o bloquear el almacenamiento del navegador, y quedan en la prueba manual de QA (SPEC §13). El cálculo del límite (41) lo cubre `parseInactivityLimit.test.ts`.

## Escenarios

### E2E-INACT-01: sin actividad durante 30 minutos se cierra la sesión

- **Cubre:** SCRUM-50 casos 31, 37 y 43.
- **Precondición:** sesión real falsa inyectada, reloj controlado. Corre en desktop y en Pixel 7.
- **Pasos:**
  1. Abrir `/lista` con la sesión.
  2. Adelantar el reloj 31 minutos sin ninguna acción.
- **Resultado esperado:** la URL pasa a `/login` y se ve el aviso "Tu sesión se cerró por inactividad. Iniciá sesión de nuevo." La URL no lleva parámetros.

### E2E-INACT-02: la actividad reinicia el conteo

- **Cubre:** SCRUM-50 casos 32 y 34.
- **Precondición:** igual que E2E-INACT-01.
- **Pasos:**
  1. Abrir `/lista` con la sesión.
  2. Adelantar el reloj 29 minutos; pulsar una tecla.
  3. Adelantar otros 29 minutos (58 desde que se abrió).
  4. Adelantar 2 minutos más (60 desde que se abrió, 31 desde la tecla).
- **Resultado esperado:** después del paso 3 la persona sigue en `/lista`, sin aviso (pasaron 58 minutos en total, pero solo 29 desde la tecla). Después del paso 4 la sesión se cierra y se llega a `/login` con el aviso.

### E2E-INACT-03: el aviso aparece una sola vez

- **Cubre:** SCRUM-50 caso 38.
- **Precondición:** sesión real falsa inyectada, reloj controlado.
- **Pasos:**
  1. Abrir `/login` sin sesión.
  2. Con la sesión, abrir `/lista`, adelantar 31 minutos y esperar el aviso en `/login`.
  3. Recargar la página.
  4. Abrir `/login?motivo=inactividad`.
- **Resultado esperado:** en el paso 1 no hay aviso. En el paso 2 aparece. Después de recargar (paso 3) ya no está, y la URL vieja con `motivo=inactividad` (paso 4) tampoco lo muestra.
