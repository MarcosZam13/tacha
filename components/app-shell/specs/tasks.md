# Tareas: app shell (SCRUM-135)

Deriva de [plan.md](plan.md). Cada tarea se valida antes de pasar a la siguiente.

- [x] 1. `constants/routes.constants.ts` (`APP_ROUTE`) y re-export en el barrel.
- [x] 2. Promover la sesión: `git mv` de `session.service.ts` y `getSessionStatus.ts` y `SESSION_STATUS` a `constants/session.constants.ts`; actualizar imports de session-guard. Sin cambio de comportamiento: `tsc`, lint y tests.
- [x] 3. `isRouteActive` con tests.
- [x] 4. Constantes, modelos y `useAppShellViewModel`.
- [x] 5. Presentación: `AppNavLink`, `AppSidebar`, `AppTabBar`, `AppShell`, con test de componente (Page Object).
- [x] 6. `git mv` de las 4 rutas a `app/(app)/` + `layout.tsx`; raíces `<main>` → `<div>` en las 4 features.
- [x] 7. Login: `resolvePostLoginRoute()` con test; usarlo en `useLoginViewModel`.
- [x] 8. Navbar pública: `usePublicNavbarViewModel` + `PublicNavbarCta`.
- [ ] 9. E2E: escenario de navegación en `specs/E2E.md` y su test.
- [ ] 10. Validar CA-01..05 en el navegador (desktop y Pixel 7); `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`.

> 2026-10-09: en pausa (`on hold`) mientras SCRUM-66 vuelve a `in progress` para hacer el tachado optimista. Faltan la 9 (E2E) y la 10 (validación).
