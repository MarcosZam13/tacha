# Tareas: recuperación de contraseña

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-51: recuperación de contraseña

- [x] 1. Rutas en `constants/routes.constants.ts` (`AUTH_ROUTE`: login, recuperar y actualizar contraseña) y constantes de la feature: textos, estados, resultados y código de Supabase (`constants/password-recovery.constants.ts`).
- [x] 2. Modelos: retorno del ViewModel y props de los componentes (`models/`, `components/models/`).
- [x] 3. Función pura con su prueba: `utils/validateForgotPasswordEmail.ts` (`tests/`). Casos: vacío, solo espacios, sin `@`, válido con mayúsculas y espacios.
- [x] 4. Servicio: `services/password-recovery.service.ts` (`requestPasswordReset`; límite de envíos y correo sin cuenta cuentan como enviado; red o servidor, error; no lanza) y su prueba con el cliente de Supabase simulado.
- [x] 5. ViewModel: `hooks/useForgotPasswordViewModel.ts` (valor, error derivado, envío, estado) y su prueba.
- [x] 6. Presentación: `ForgotPassword.tsx`, `ForgotPasswordForm.tsx`, `ForgotPasswordSent.tsx`.
- [x] 7. Ruta: `app/recuperar-contrasena/page.tsx` con `metadata`.
- [x] 8. Enlace "¿Olvidaste tu contraseña?" en `LoginForm` y la ruta en `PUBLIC_ROUTES` del guard.
- [x] 9. Agregar `<origen>/actualizar-contrasena` a Redirect URLs en Supabase (SPEC §11); la plantilla del correo no se edita (SMTP por defecto). Anotar en el PR qué se configuró.
- [x] 10. `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [x] 11. Validar a mano los casos 1 a 10 del SPEC con el correo de un miembro de la organización de Supabase y uno inexistente, con el guard encendido y apagado. Verificar el caso 7 (dos pedidos seguidos) con los dos correos.
- [x] 12. `E2E.md` y prueba en `e2e/` (playwright-e2e): casos 1, 3, 5, 6, 9 y 10, con las llamadas a Supabase simuladas (el envío real del correo queda a mano).
- [x] 13. Pasar los subagentes de revisión (`code-reviewer` y `security-reviewer`) y aplicar lo que corresponda: solo espacios en el campo, texto de la confirmación en el SPEC, foco al título, errores 5xx como confirmación, test meta eliminado, pruebas de componente, `SESSION_GUARD_ROUTE.LOGIN` y notas de abuso y de Redirect URLs sin comodines en el SPEC.
- [ ] 14. Pasar el PR a `waiting qa` y la tarjeta de Jira a Waiting QA.

## SCRUM-52: vista de actualización de contraseña

**Parte 1: promover lo compartido con el login (sin cambiar su comportamiento)**

- [ ] 1. Mover a carpetas compartidas `PasswordInput`, `EyeIcon` y su ViewModel (`components/password-input/`), con sus modelos y constantes (`constants/password.constants.ts`).
- [ ] 2. Mover la validación de la nueva contraseña (`utils/validateNewPasswordForm.ts`) y `updateUserPassword` (`services/password.service.ts`), con sus tipos, mensajes y resultados.
- [ ] 3. Actualizar los imports del login y validar que se comporta igual (`npm test`, `npm run build` y los E2E del login).

**Parte 2: la vista de actualización**

- [ ] 4. Constantes de la vista (textos, estados, parámetros del fragmento, 3 segundos de espera) y `AUTH_ROUTE.RESET_PASSWORD` en `PUBLIC_ROUTES` del guard.
- [ ] 5. Modelos: retorno del ViewModel y props de los componentes.
- [ ] 6. Función pura con su prueba: `utils/getRecoveryLinkStatus.ts` (`recovery`, `error`, `none`; con fragmento vacío, con `error_code`, con token y `type=recovery`, con `type` distinto).
- [ ] 7. Servicios: `subscribeToRecoveryEvents` en `password-recovery.service.ts` y `signOutEverywhere` en `services/session.service.ts` (alcance global; si falla, cierra el local; no lanza), con pruebas.
- [ ] 8. ViewModel: `hooks/useResetPasswordViewModel.ts` (verificación del enlace, valores, validación derivada, guardado, cierre de sesiones y redirección a los 3 segundos) y su prueba, con temporizadores simulados.
- [ ] 9. Presentación: `ResetPassword.tsx`, `ResetPasswordForm.tsx`, `ResetPasswordInvalid.tsx` y `ResetPasswordDone.tsx`, con el foco al título de cada pantalla, y sus pruebas.
- [ ] 10. Ruta: `app/actualizar-contrasena/page.tsx` con `metadata`.
- [ ] 11. `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 12. Validar a mano los casos 11 a 25 del SPEC con el correo de un miembro de la organización de Supabase: abrir el enlace dos veces, con la sesión iniciada y sin ella, y comprobar que otra sesión abierta se cierra.
- [ ] 13. `E2E.md` y prueba en `e2e/` (playwright-e2e), con la sesión de recuperación simulada: casos 12, 13, 14, 16, 18, 19 y 22.
- [ ] 14. Pasar los subagentes de revisión (`code-reviewer` y `security-reviewer`) y aplicar lo que corresponda.
- [ ] 15. Pasar el PR a `waiting qa` y la tarjeta de Jira a Waiting QA.
