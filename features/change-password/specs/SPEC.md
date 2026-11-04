# Feature: ChangePassword

Historia: **SCRUM-54 (HU-31) — Cambiar contraseña**. Criterios en [docs/historias-usuario.md](../../../docs/historias-usuario.md). Es la pantalla a la que lleva el acceso "Cambiar contraseña" de la vista de Perfil ([features/profile](../../profile/specs/SPEC.md), SCRUM-53).

## 1. Objetivo

Que la persona autenticada cambie su contraseña desde el perfil, sin pasar por el correo de recuperación (HU-28/29). Para hacerlo tiene que probar que conoce la actual, así quien encuentre una sesión abierta no puede tomar la cuenta.

## 2. Alcance

Incluye:

- Acceso "Cambiar contraseña" en la vista de Perfil (CA-01).
- Ruta privada `/perfil/contrasena` con el formulario: contraseña actual, nueva y repetir nueva (CA-02).
- La misma barra de fortaleza y los mismos requisitos de contraseña que el registro (CA-03).
- Guardar solo se habilita cuando la nueva es válida y coincide con "Repetir" (CA-04).
- Error específico si la contraseña actual es incorrecta, sin exponer nada de la real (CA-05).
- Confirmación al cambiarla; la sesión sigue abierta (CA-06).
- Enlace para volver al perfil.

No incluye: ver el apartado 14.

## 3. Entradas

- `currentPassword: string`
- `newPassword: string`
- `confirmPassword: string`
- Sesión de Supabase Auth: el correo de la cuenta (`user.email`), para verificar la contraseña actual.

## 4. Salidas

- La contraseña de la cuenta actualizada en Supabase Auth.
- Mensaje de confirmación o de error; los campos se vacían tras el éxito.
- La sesión de este navegador sigue abierta.

## 5. Reglas de negocio

1. La contraseña actual es obligatoria y se verifica contra Supabase **antes** de cambiar nada.
2. La nueva contraseña cumple las reglas del registro: al menos 8 caracteres y no de nivel débil (`validateNewPasswordForm`).
3. "Repetir nueva contraseña" tiene que ser igual a la nueva.
4. La nueva tiene que ser distinta de la actual.
5. "Guardar" está deshabilitado mientras haya algún error de las reglas 1 a 4 o se esté guardando.
6. Si la contraseña actual es incorrecta, no se cambia nada y el mensaje aparece bajo ese campo.
7. Cambiar la contraseña no cierra la sesión de este navegador (CA-06).
8. Los valores de las contraseñas no se guardan fuera del estado del formulario, ni se escriben en consola ni en la URL.

## 6. Estados

Del guardado: `idle | saving | saved`. Es una unión derivada de constantes (constants-standards §7), no booleanos sueltos. Los fallos no son un estado: son mensajes (`currentPasswordError`, `submitError`) que se limpian al volver a escribir.

## 7. Errores

| Caso | Cómo se muestra |
|---|---|
| Contraseña actual incorrecta | Mensaje específico bajo "Contraseña actual" |
| Nueva y repetir no coinciden | "Las contraseñas no coinciden." bajo "Repetir" |
| Nueva igual a la actual | "La nueva contraseña debe ser distinta de la actual." bajo "Nueva contraseña" |
| Nueva contraseña débil o corta | El medidor lista lo que falta; Guardar deshabilitado |
| Supabase rechaza la nueva (política de contraseñas) | Mensaje general: no cumple los requisitos |
| Demasiados intentos (429) | Mensaje general: esperar unos minutos |
| Sin sesión con correo, red o servidor | Mensaje general genérico |

Ningún mensaje muestra el texto de error de Supabase ni la contraseña.

## 8. UI esperada

- Título "Cambiar contraseña" (recibe el foco al abrir).
- Tres campos con el botón del ojo (`PasswordInput`): "Contraseña actual", "Nueva contraseña", "Repetir nueva contraseña".
- `PasswordStrengthMeter` bajo la nueva contraseña mientras se escribe.
- Botón "Guardar contraseña" (con "Guardando..." mientras guarda).
- Región con la confirmación "Contraseña actualizada." o con el error general.
- Enlace "Volver al perfil".
- En Perfil: un enlace "Cambiar contraseña" a esta pantalla.

## 9. Accesibilidad

- Cada campo con `label` asociado; los errores ligados con `aria-describedby` (lo resuelve `PasswordInput`).
- `autocomplete`: `current-password` en la actual, `new-password` en las otras dos (ayuda a los gestores de contraseñas).
- La confirmación es `role="status"`; el error general, `role="alert"`.
- El botón del ojo con nombre accesible ("Mostrar contraseña" / "Ocultar contraseña").
- El foco va al título al abrir la pantalla.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`. Tailwind con tokens `tacha-*`.
- Lógica en `useChangePasswordViewModel`; los `.tsx` solo presentan.
- Reutilizar `PasswordInput`, `PasswordStrengthMeter`, `FocusedHeading`, `validateNewPasswordForm` y `updateUserPassword`; no copiarlos.
- Sin strings ni números mágicos (constants-standards).
- La contraseña actual se verifica en el servidor de Supabase (`signInWithPassword`); no hay verificación solo en el cliente.
- Sin librería de formularios. Sin migración ni Edge Function.

## 11. Dependencias

- `@/services/password.service` (`updateUserPassword`), `@/services/supabase.client`.
- `@/components/password-input`, `@/components/password-strength-meter`, `@/components/focused-heading`, `@/components/ui`.
- `@/constants` (`NEW_PASSWORD_*`, `PASSWORD_UPDATE_RESULT*`, `AUTOCOMPLETE`, `APP_ROUTE`), `@/types/new-password.types`, `@/utils/validateNewPasswordForm`, `@/utils/password.utils`.
- `features/profile`: solo recibe un enlace nuevo; no se importa nada de esa feature.

## 12. Contratos externos

- **Auth:** `auth.getUser()` (correo), `auth.signInWithPassword({ email, password })` para verificar la actual, `auth.updateUser({ password })` para cambiarla. Códigos de error usados: `invalid_credentials`, `over_request_rate_limit` / estado 429, `same_password`, `weak_password`.
- **RLS / tablas:** no hay cambios.
- **Configuración de Supabase:** no requiere cambiar ninguna opción del dashboard.

## 13. Casos de aceptación

| # | Caso | Criterio |
|---|---|---|
| 1 | La vista de Perfil tiene el acceso "Cambiar contraseña" y lleva a la pantalla | CA-01 |
| 2 | La pantalla pide contraseña actual, nueva y repetir nueva | CA-02 |
| 3 | Al escribir la nueva aparece el medidor, igual que en el registro | CA-03 |
| 4 | Con nueva y repetir distintas, Guardar está deshabilitado y se explica por qué | CA-04 |
| 5 | Con la actual incorrecta aparece el error bajo ese campo y no se cambia nada | CA-05 |
| 6 | Con datos correctos se cambia, se confirma y la sesión sigue abierta | CA-06 |
| 7 | Una nueva igual a la actual se rechaza con su mensaje | Regla 4 |
| 8 | Una nueva débil o corta no se puede enviar | Regla 2 |
| 9 | Tras cambiarla, iniciar sesión con la vieja falla y con la nueva funciona | CA-06 |
| 10 | Mientras guarda, no se puede enviar de nuevo | Regla 5 |

## 14. Casos fuera de alcance

- Cerrar las demás sesiones de la cuenta al cambiar la contraseña (el criterio solo pide no cerrar esta). Queda como mejora posible, con `revokeOtherSessions`.
- Recuperación de contraseña (HU-28/29, ya hechas) y el cambio forzado tras un login con contraseña débil (feature `login`).
- Cerrar sesión (SCRUM-55).
- Aviso por correo de que la contraseña cambió.
- Límite propio de intentos: lo aplica Supabase Auth.

## 15. Notas de implementación

- `signInWithPassword` sirve para verificar, pero reemplaza la sesión de este navegador por una nueva de la misma cuenta; para quien usa la app no cambia nada.
- Una cuenta anónima (sin correo) no puede usar esta pantalla: el servicio devuelve el error genérico.
