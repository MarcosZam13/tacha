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

## SCRUM-47, 49

Se agregan cuando cada historia se empiece.
