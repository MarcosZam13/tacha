# Plan técnico: app shell

Deriva de [SPEC.md](SPEC.md). Pasos en [tasks.md](tasks.md).

## Archivos

```
app/(app)/                              grupo de rutas: no agrega segmento a la URL
  layout.tsx                            delgado: <AppShell>{children}</AppShell>
  lista/page.tsx                        ← git mv app/lista
  recetas/page.tsx, nueva/, [id]/editar/ ← git mv app/recetas
  catalogo/page.tsx                     ← git mv app/catalogo
  household/page.tsx                    ← git mv app/household

components/app-shell/
  AppShell.tsx                          "use client": sidebar + <main> + tabs (solo presentación)
  components/
    AppSidebar.tsx                      desktop (md+): marca + ítems
    AppTabBar.tsx                       mobile: barra fija abajo
    AppNavLink.tsx                      un ítem: <Link> con aria-current; lo usan las dos navegaciones
    models/                             props
  hooks/useAppShellViewModel.ts         ítems con isActive según usePathname
  constants/app-shell.constants.ts      ítems (orden y texto), textos
  models/AppNavItem.interface.ts
  utils/isRouteActive.ts                pathname + href → activo (ruta exacta o subruta)
  tests/                                isRouteActive + AppShell (Page Object)
  specs/

constants/routes.constants.ts           APP_ROUTE: CATALOG, HOUSEHOLD, LIST, RECIPES
constants/session.constants.ts          ← SESSION_STATUS desde features/session-guard
services/session.service.ts             ← git mv desde features/session-guard/services
utils/getSessionStatus.ts               ← git mv desde features/session-guard/utils

features/login/utils/resolvePostLoginRoute.ts   hoy devuelve APP_ROUTE.LIST (punto de extensión de SCRUM-136)
features/login/hooks/useLoginViewModel.ts       usa resolvePostLoginRoute() en vez de LOGIN_ROUTE.HOME
features/landing/hooks/usePublicNavbarViewModel.ts   sesión registrada → CTA a la app
features/landing/components/PublicNavbarCta.tsx      "use client": el botón de la derecha de la navbar
features/{shopping-list,recipes,catalog,household}   raíz <main> → <div> (un solo <main> por página)
```

## Flujo

1. Entrar a `/recetas/nueva` → Next arma `app/layout.tsx` → `app/(app)/layout.tsx` → `AppShell` → `useAppShellViewModel` lee `usePathname()` → `isRouteActive("/recetas/nueva", "/recetas")` = true → "Recetas" se dibuja activo con `aria-current="page"`.
2. Tocar "Catálogo" → `<Link href="/catalogo">` navega en el cliente; el layout del grupo no se desmonta, solo cambia `children`.
3. Login exitoso → `useLoginViewModel` → `router.push(resolvePostLoginRoute())` → `/lista`.
4. Landing con sesión registrada → `PublicNavbarCta` → `usePublicNavbarViewModel` se suscribe a `subscribeToSessionChanges` → `getSessionStatus` → `authenticated` → "Ir a mi lista".

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Grupo de rutas `app/(app)/` con su `layout.tsx` | Envolver cada `page.tsx` con `<AppShell>` | Un solo lugar decide qué pantallas llevan shell. Al navegar entre ellas el layout no se vuelve a montar, así que no parpadea. Las URLs no cambian porque `(app)` no es un segmento |
| `components/app-shell/` | `features/app-shell/` | Lo usan todas las pantallas privadas; `components/` es lo compartido entre features (project-structure) |
| `git mv` de las rutas | Copiar y borrar | Conserva el historial (`git log --follow`) |
| Ocultar secciones que no existen | "Próximamente" deshabilitado | Decisión del 2026-10-08: no se muestran promesas en la demo; cada ítem entra con su pantalla |
| Enlaces (`<Link>`) | Botones con `router.push` | Cambian de página: el navegador permite abrir en otra pestaña, y el lector de pantalla los anuncia como enlaces |
| `aria-current="page"` además del color | Solo el color | El color no le llega a un lector de pantalla ni a quien no distingue el teal |
| `isRouteActive` como util pura | Comparar en el JSX | Se testea sin React, y la regla de subrutas queda en un solo lugar |
| Mostrar sidebar o tabs con clases de Tailwind (`hidden md:flex`) | Detectar el ancho con JS | Sin parpadeo ni diferencia entre servidor y cliente; el CSS decide |
| Promover sesión a `services/`, `utils/`, `constants/` | Importar desde `features/session-guard/` | La navbar pública es el segundo consumidor real; importar de otra feature amarra una a la otra (component-architecture §1) |
| `resolvePostLoginRoute()` | Cambiar la constante `LOGIN_ROUTE.HOME` | SCRUM-136 necesita un lugar donde la URL de retorno gane sobre el default; una función es ese lugar y hoy es una línea |
| `PublicNavbarCta` como pieza cliente | Volver cliente toda la navbar | La navbar y la landing siguen siendo de servidor; solo el botón necesita la sesión |

## Puntos de extensión (sin implementar)

- **Cerrar sesión (SCRUM-55):** al pie de `AppSidebar` (desktop). En mobile, cuando exista "Más" (más de 5 ítems, §3.2), va adentro; mientras tanto, el lugar natural es la pantalla de Perfil/Household.
- **URL de retorno (SCRUM-136):** `features/login/utils/resolvePostLoginRoute.ts` recibe la URL de retorno y la devuelve si es una ruta interna válida; si no, `APP_ROUTE.LIST`.
  - Requisitos de la revisión de seguridad (2026-10-09) para no abrir un *open redirect*. `router.push` con `//evil.com` o una URL absoluta sí sale del sitio:
    1. Lista permitida: solo rutas de `APP_ROUTE` o sus subrutas (`APP_ROUTE.X + "/"`); cualquier otra cosa → `APP_ROUTE.LIST`. Así quedan afuera las públicas y `/login` (evita bucles).
    2. Normalizar antes de validar: `new URL(value, window.location.origin)`, exigir mismo `origin`, usar solo `pathname + search`. Rechazar lo que no empiece con exactamente una `/` (`//`, `/\`, `\`, `javascript:`, `https:`). Ojo con los tabs y saltos de línea dentro del valor (el navegador los quita: `/<tab>/evil.com` termina siendo `//evil.com`) y con `%2F%2F` / `%5C`: decodificar una vez y validar el resultado.
    3. El guard codifica la ruta al armar el parámetro (`encodeURIComponent(pathname + search)`).
    4. Límite de largo (ej. 2048) y validación como función pura con un test por cada vector.
    5. La URL de retorno no da permisos: solo decide a dónde navegar; el acceso sigue dependiendo del guard y de RLS.
- **Deuda conocida (revisión de seguridad, no la introduce este PR):** el acceso a las rutas privadas se controla solo en el cliente (`SessionGuard`, detrás de `NEXT_PUBLIC_SESSION_GUARD_ENABLED`); los datos los protege RLS. `app/(app)/layout.tsx` es el lugar natural para un chequeo de sesión en el servidor (proxy con `@supabase/ssr`) cuando el equipo lo decida.
