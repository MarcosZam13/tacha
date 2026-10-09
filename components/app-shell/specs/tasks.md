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
- [x] 9. E2E: escenario de navegación en `specs/E2E.md` y su test.
- [x] 10. Validar CA-01..05 en el navegador (desktop y Pixel 7); `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`.

> 2026-10-09: estuvo en pausa (`on hold`) mientras SCRUM-66 volvía a `in progress` por el tachado optimista; retomada el mismo día.
>
> Validación: E2E 10/10 (suite completa, desktop + Pixel 7). En el navegador: sidebar en desktop con "Recetas" activo en `/recetas/nueva`; en Pixel 7 (emulado con Playwright, la ventana de Chrome no se puede achicar) tabs abajo con el activo marcado. CA-02 y CA-03 con tests unitarios; con cuenta registrada quedan para QA.
