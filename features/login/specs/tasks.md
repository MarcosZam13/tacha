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

## SCRUM-46, 47, 48, 49

Se agregan cuando cada historia se empiece (dependen de que SCRUM-45 esté mergeada).
