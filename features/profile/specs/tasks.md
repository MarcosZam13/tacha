# Tareas: perfil

Ver [SPEC.md](SPEC.md) y [plan.md](plan.md).

## SCRUM-53: editar datos de perfil

- [x] 1. Migración `supabase/migrations/036_create_avatars_bucket.sql` (bucket + políticas).
- [x] 2. Constantes: `constants/user-profile.constants.ts` (barrel), `APP_ROUTE.PROFILE`, `features/profile/constants/profile.constants.ts`.
- [x] 3. Tipos y utilidades compartidas: `types/profile.types.ts`, `utils/toUserProfile.ts`, promover `toMemberInitials` a `utils/toInitials.ts` (household cambia solo su import y su test).
- [x] 4. Utilidades de la feature: `validateProfileName`, `validateAvatarFile`, `getAvatarStoragePath`.
- [x] 5. Servicio `profile.service.ts` (`saveProfile`).
- [x] 6. Hook compartido `hooks/useUserProfile.ts`.
- [x] 7. `useProfileViewModel` y su modelo.
- [x] 8. `components/profile-avatar/ProfileAvatar.tsx`.
- [x] 9. Componentes de la feature: `ProfilePhotoField`, `ProfileSaveFeedback`, `ProfileForm`, `Profile.tsx`.
- [x] 10. Ruta `app/(app)/perfil/page.tsx`.
- [x] 11. Navegación: `useAppShellViewModel`, enlace en `AppSidebar`, `AppTopBar` en mobile, `AppShell`.
- [x] 12. Tests: utilidades, servicio, ViewModel, componentes con Page Object y `ProfileAvatar`; actualizar los de `app-shell`.
- [x] 13. Validar contra los casos de aceptación del SPEC: `tsc`, lint, tests y build; revisión en el navegador (pendiente: necesita la migración aplicada y una sesión).
- [ ] 14. Aplicar `036` en la base compartida (bloqueada: aviso al grupo) antes de `waiting qa`.
