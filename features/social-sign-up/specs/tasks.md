# Tareas: SocialSignUp

Deriva de [plan.md](plan.md).

## SCRUM-42: registro mediante proveedor externo

- [x] 1. Configurar Google y Facebook en Supabase y las Redirect URLs.
- [x] 2. Constantes de la feature y rutas compartidas.
- [x] 3. Modelos de los ViewModels y del aviso.
- [x] 4. Utilidades puras: `getSocialSignUpResult` y `hasProviderError`.
- [x] 5. Servicio: iniciar y completar el registro.
- [x] 6. ViewModels.
- [x] 7. Presentación: botones y página de retorno.
- [x] 8. Ruta `app/registro/social/page.tsx`, ruta pública y botones en `/registro`.
- [x] 9. Pruebas unitarias y E2E.
- [x] 10. Validar CA-01 a CA-06 con cuentas reales.
- [ ] 11. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`.

## SCRUM-43: completar datos tras el registro social

- [x] 1. Ruta `AUTH_ROUTE.COMPLETE_SIGN_UP` y constantes del formulario.
- [x] 2. Modelos, `toCompleteSignUpAccount` y `validateSignUpName` (con el máximo compartido `USER_NAME_MAX_LENGTH`).
- [x] 3. Servicio del formulario; el retorno deja de guardar la marca.
- [x] 4. ViewModel, `CompleteSignUp.tsx` y la ruta `app/registro/completar/page.tsx`.
- [x] 5. Pruebas unitarias y E2E-SOCIAL-04 y 05.
- [x] 5b. Puerta de las pantallas privadas (`CompleteSignUpGate`, `isSocialSignUpPending`), su montaje en `app/(app)/layout.tsx`, pruebas y E2E-SOCIAL-06.
- [ ] 6. Validar con cuentas reales: registro nuevo con Google y Facebook, abandono y vuelta, y una cuenta de correo.
- [ ] 7. Revisar con `code-reviewer`, `security-reviewer` y `qa-checker`.
