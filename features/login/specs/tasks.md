# Tareas: login

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-45: login con reCAPTCHA

- [x] 1. Constantes de la feature (`constants/login.constants.ts`).
- [x] 2. Modelos: valores del formulario, parámetros del servicio, retorno del ViewModel, respuesta de la función, props y ViewModel del widget, tipo de `window.grecaptcha`.
- [x] 3. Validación pura (`utils/validateLoginForm.ts`).
- [x] 4. Edge Function `supabase/functions/login-with-recaptcha/index.ts`.
- [x] 5. Servicio (`services/login.service.ts`).
- [x] 6. Hook del widget (`hooks/useRecaptchaWidgetViewModel.ts`) y `components/RecaptchaWidget.tsx`.
- [x] 7. ViewModel (`hooks/useLoginViewModel.ts`).
- [x] 8. Presentación: `Login.tsx` con `Input`, `Button` y el widget.
- [x] 9. Ruta `app/login/page.tsx`, `.env.example`, `supabase/README.md` y `.gitignore`.
- [x] 10. Desplegar la función con la CLI y configurar el secret (claves de prueba de Google).
- [x] 11. Validar los casos de aceptación del SPEC en el navegador; `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] 12. (Antes de producción, no bloquea este PR) Reemplazar las claves de prueba por las reales de reCAPTCHA.

## SCRUM-46: mostrar u ocultar la contraseña

- [x] 1. Constantes: `INPUT_TYPE` y `PASSWORD_TOGGLE_LABEL`; `LOGIN_FORM_FIELDS` usa `INPUT_TYPE` (`constants/login.constants.ts`).
- [x] 2. Modelos: props del campo y retorno de su hook (`models/PasswordInputProps.interface.ts`, `models/PasswordInputViewModel.interface.ts`).
- [x] 3. ViewModel del campo (`hooks/usePasswordInputViewModel.ts`).
- [x] 4. Ícono (`components/EyeIcon.tsx`).
- [x] 5. Presentación: `components/PasswordInput.tsx`.
- [x] 6. `Login.tsx` usa `PasswordInput` para el campo de contraseña.
- [x] 7. Validar los casos 11 a 15 del SPEC en el navegador (incluido el teclado); `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-47: mensajes de error en el login

- [x] 1. Constantes: `ACCOUNT_BLOCKED` en `LOGIN_ERROR_MESSAGE`, `LOGIN_RESULT` y `LOGIN_API_CODE`; entradas en `LOGIN_API_CODE_RESULT` y `LOGIN_RESULT_MESSAGE` (`constants/login.constants.ts`).
- [x] 2. Edge Function: reenviar `user_banned` junto con `email_not_confirmed` y colapsar el resto a `invalid_credentials` (`supabase/functions/login-with-recaptcha/index.ts`).
- [x] 3. Redesplegar la función: `npx supabase functions deploy login-with-recaptcha --use-api`.
- [x] 4. Crear en Supabase un usuario de prueba y banearlo (Authentication → Users) para poder probar el caso 18.
- [x] 5. Verificar la nota del SPEC §15 con un usuario baneado y otro sin verificar, cada uno con contraseña incorrecta y correcta. Resultado: sin verificar solo se revela con la contraseña correcta; baneado se revela con cualquier contraseña (limitación aceptada, documentada en §15 y en el plan).
- [ ] 6. Validar los casos 16 a 21 del SPEC en el navegador; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-48: aviso de contraseña débil en el login

**Parte 1: promover el código de fortaleza (sin cambiar el comportamiento del registro)**

- [x] 1. `constants/password.constants.ts` con las constantes de fortaleza movidas desde `registro.constants.ts`, y su export en `constants/index.ts`.
- [x] 2. `types/password.types.ts` con `PasswordStrength`.
- [x] 3. `utils/password.utils.ts` con `evaluatePasswordStrength`.
- [x] 4. `components/password-strength-meter/` con el medidor y su modelo de props.
- [x] 5. Actualizar los imports de `registro-manual` y borrar las copias viejas.
- [x] 6. Validar que el registro funciona igual (medidor, requisitos, coincidencia de contraseñas); `npx tsc --noEmit`, `npm run lint`, `npm run build`.

**Parte 2: el aviso y el cambio de contraseña**

- [x] 7. Constantes del login: textos, mensajes de error, resultados del cambio, estados y códigos de Supabase (`constants/login.constants.ts`).
- [x] 8. Modelos: valores y errores del formulario, retorno del ViewModel y props de los minis componentes.
- [x] 9. Validación pura (`utils/validateChangePasswordForm.ts`) y `utils/getStatusAfterLogin.ts`.
- [x] 10. Servicio (`services/password.service.ts`).
- [x] 11. ViewModel del cambio (`hooks/useChangePasswordViewModel.ts`) y `hooks/useFocusHeadingOnMount.ts`.
- [x] 12. `useLoginViewModel.ts`: evaluar la contraseña tras un login exitoso y fijar la fase `weak-password`.
- [x] 13. Componentes: `FocusedHeading`, `LoginForm`, `WeakPasswordNotice`, `ChangePasswordForm`, `PasswordChangedNotice` y `WeakPasswordFlow`.
- [x] 14. `Login.tsx` muestra `WeakPasswordFlow` cuando la fase es `weak-password`.
- [x] 15. Preparar en Supabase una cuenta verificada con contraseña débil (por ejemplo `12345678`) para probar.
- [x] 16. Validar los casos 22 a 30 del SPEC en el navegador; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-50: cierre de sesión por inactividad

- [ ] 1. Constantes: límite por defecto, eventos, claves de `localStorage`, parámetro `motivo` y su valor, textos del aviso (`constants/login.constants.ts`).
- [ ] 2. Funciones puras con sus pruebas: `utils/isInactivityExpired.ts` y `utils/parseInactivityLimit.ts` (`tests/`). Casos borde: justo en el límite, marca futura, valor vacío, `0`, texto.
- [ ] 3. Servicio de actividad: `services/activity.service.ts` (`recordActivity`, `readLastActivity`, `clearLastActivity`), con respaldo en memoria si `localStorage` falla.
- [ ] 4. `signOutUser()` en `services/session.service.ts` (`scope: "local"`, no lanza).
- [ ] 5. ViewModel: `hooks/useInactivityTimeoutViewModel.ts` (suscripción a la sesión, listeners, temporizador, comprobación al volver a la pestaña, cierre y redirección).
- [ ] 6. Presentación: `InactivityTimeout.tsx` (devuelve `null`) y montarlo en `app/layout.tsx`.
- [ ] 7. Aviso en el login: `InactivityNotice.tsx`, leer `?motivo=inactividad` en `useLoginViewModel` y pintarlo en `LoginForm`; `Suspense` si el build lo exige.
- [ ] 8. `.env.example`: documentar `NEXT_PUBLIC_INACTIVITY_TIMEOUT_MINUTES` (comentada).
- [ ] 9. `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`.
- [ ] 10. Validar los casos 31 a 42 del SPEC con el límite en 1 minuto (incluye dos pestañas y pestaña en segundo plano).
- [ ] 11. Quitar la variable de prueba de `.env.local`.
- [ ] 12. `E2E.md` y prueba en `e2e/` (playwright-e2e): casos 31, 32, 37 y 38.
- [ ] 13. Pasar el PR a `waiting qa` y la tarjeta de Jira a Waiting QA.

El guard de sesión (SCRUM-49) tiene sus propias tareas en `features/session-guard/specs/tasks.md`.
