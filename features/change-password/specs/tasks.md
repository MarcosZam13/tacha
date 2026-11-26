# Tareas: cambiar contraseña

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md).

## SCRUM-54: cambiar contraseña

- [x] 1. Constantes: `APP_ROUTE.CHANGE_PASSWORD` y `features/change-password/constants/change-password.constants.ts`.
- [x] 2. Modelos: `ChangePasswordParams`, `ChangePasswordFormValues` y `ChangePasswordViewModel`.
- [x] 3. Utilidad `validateChangePasswordForm`.
- [x] 4. Servicio `change-password.service.ts` (`changePassword`).
- [x] 5. `useChangePasswordViewModel`.
- [x] 6. Componentes: `ChangePasswordFeedback`, `ChangePasswordForm`, `ChangePassword.tsx`.
- [x] 7. Ruta `app/(app)/perfil/contrasena/page.tsx`.
- [x] 8. Acceso desde Perfil: `ProfileChangePasswordLink` y su uso en `Profile.tsx`.
- [x] 9. Tests: validación, servicio, ViewModel, componentes con Page Object y el enlace de Perfil.
- [x] 10. Validar contra los casos de aceptación del SPEC: `tsc`, lint, tests y build; revisión en el navegador con una cuenta real (pendiente).
