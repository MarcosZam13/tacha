# Tareas: cerrar sesión

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md).

## SCRUM-55: cerrar sesión

- [x] 1. Constantes: `constants/unsaved-changes.constants.ts` (barrel) y `components/sign-out-button/constants/sign-out.constants.ts`.
- [x] 2. Servicio `services/unsaved-changes.service.ts` y su test.
- [x] 3. Hooks `hooks/useUnsavedChanges.ts` (`useReportUnsavedChanges`, `useHasUnsavedChanges`).
- [x] 4. Modelo `SignOutViewModel` y `useSignOutViewModel`.
- [x] 5. `SignOutButton.tsx` con el diálogo de confirmación.
- [x] 6. Perfil informa sus cambios sin guardar (`useProfileViewModel`).
- [x] 7. Conectar el botón: `AppSidebar` y `Profile.tsx`.
- [x] 8. Tests: servicio, ViewModel, componente con Page Object; ajustar los de `app-shell` y `profile` (mock de `useRouter`).
- [x] 9. Validar contra los casos de aceptación del SPEC: `tsc`, lint, tests y build; revisión en el navegador con una cuenta real (pendiente).
