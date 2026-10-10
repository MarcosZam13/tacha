# Tareas: recuperación de contraseña

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

## SCRUM-51: recuperación de contraseña

- [ ] 1. Rutas en `constants/routes.constants.ts` (`AUTH_ROUTE`: login, recuperar y actualizar contraseña) y constantes de la feature: textos, estados, resultados y código de Supabase (`constants/password-recovery.constants.ts`).
- [ ] 2. Modelos: retorno del ViewModel y props de los componentes (`models/`, `components/models/`).
- [ ] 3. Función pura con su prueba: `utils/validateForgotPasswordEmail.ts` (`tests/`). Casos: vacío, solo espacios, sin `@`, válido con mayúsculas y espacios.
- [ ] 4. Servicio: `services/password-recovery.service.ts` (`requestPasswordReset`; límite de envíos y correo sin cuenta cuentan como enviado; red o servidor, error; no lanza) y su prueba con el cliente de Supabase simulado.
- [ ] 5. ViewModel: `hooks/useForgotPasswordViewModel.ts` (valor, error derivado, envío, estado).
- [ ] 6. Presentación: `ForgotPassword.tsx`, `ForgotPasswordForm.tsx`, `ForgotPasswordSent.tsx`.
- [ ] 7. Ruta: `app/recuperar-contrasena/page.tsx` con `metadata`.
- [ ] 8. Enlace "¿Olvidaste tu contraseña?" en `LoginForm` y la ruta en `PUBLIC_ROUTES` del guard.
- [ ] 9. Agregar `<origen>/actualizar-contrasena` a Redirect URLs en Supabase (SPEC §11); la plantilla del correo no se edita (SMTP por defecto). Anotar en el PR qué se configuró.
- [ ] 10. `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] 11. Validar a mano los casos 1 a 10 del SPEC con el correo de un miembro de la organización de Supabase y uno inexistente, con el guard encendido y apagado. Verificar el caso 7 (dos pedidos seguidos) con los dos correos.
- [ ] 12. `E2E.md` y prueba en `e2e/` (playwright-e2e): casos 1, 3, 5, 6, 9 y 10, con las llamadas a Supabase simuladas (el envío real del correo queda a mano).
- [ ] 13. Pasar los subagentes de revisión (`code-reviewer` y `security-reviewer`) y aplicar lo que corresponda.
- [ ] 14. Pasar el PR a `waiting qa` y la tarjeta de Jira a Waiting QA.
