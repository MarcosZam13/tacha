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
