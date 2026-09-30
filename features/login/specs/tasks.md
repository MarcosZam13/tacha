# Tareas: login

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-45: login con reCAPTCHA

- [ ] 1. Constantes de la feature (`constants/login.constants.ts`).
- [ ] 2. Modelos: valores del formulario, parámetros del servicio, retorno del ViewModel, props del widget.
- [ ] 3. Validación pura (`utils/validateLoginForm.ts`).
- [ ] 4. Edge Function `supabase/functions/login-with-recaptcha/index.ts`.
- [ ] 5. Servicio (`services/login.service.ts`).
- [ ] 6. Hook del widget (`hooks/useRecaptchaWidget.ts`) y `components/RecaptchaWidget.tsx`.
- [ ] 7. ViewModel (`hooks/useLoginViewModel.ts`).
- [ ] 8. Presentación: `Login.tsx` con `Input`, `Button` y el widget.
- [ ] 9. Ruta `app/login/page.tsx`, `.env.example` y `supabase/README.md`.
- [ ] 10. Desplegar la función y configurar el secret (manual, ver plan).
- [ ] 11. Validar los casos de aceptación del SPEC en el navegador; `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## SCRUM-46, 47, 48, 49

Se agregan cuando cada historia se empiece (dependen de que SCRUM-45 esté mergeada).
