# Guía de estudio: SCRUM-135 (app shell)

Para defender el código en vivo. El contrato está en [SPEC.md](SPEC.md) y las decisiones con su alternativa en [plan.md](plan.md#decisiones).

## 1. Cómo se demuestra

1. `npm run dev` → `/lista`: sidebar a la izquierda con "General" marcado.
2. Tocar "Recetas" → `/recetas`; tocar "Nueva receta" → `/recetas/nueva`: "Recetas" sigue marcado (subruta).
3. DevTools en modo dispositivo, Pixel 7: el sidebar desaparece y aparecen tabs abajo.
4. Abrir `/` (landing): sin sidebar ni tabs, con la navbar pública. Sin sesión dice "Registrarse".
5. Iniciar sesión en `/login` con una cuenta registrada: cae en `/lista`, no en la landing. Volver a `/`: la navbar dice "Ir a mi lista".

## 2. Recorrido (mapa del flujo)

**Abrir `/recetas/nueva`:**
`app/layout.tsx` (raíz: fuentes + `SessionGuard`) →
`app/(app)/layout.tsx` (el grupo `(app)` no agrega nada a la URL) → `<AppShell>` →
`components/app-shell/hooks/useAppShellViewModel.ts`: `usePathname()` = `/recetas/nueva` → por cada ítem de `APP_NAV_ITEMS`, `isRouteActive(pathname, href)` →
`/recetas/nueva` empieza con `/recetas/` → "Recetas" activo →
`AppSidebar` y `AppTabBar` dibujan `AppNavLink` con `aria-current="page"` en el activo →
`children` = `app/(app)/recetas/nueva/page.tsx` → `<RecipeEditor />` dentro del único `<main>`.

**Tocar "Catálogo":** `<Link href="/catalogo">` navega en el cliente. El layout del grupo **no se desmonta**: solo cambia `children` y el ViewModel recalcula el activo.

**Login:** `useLoginViewModel` → login correcto → `router.push(resolvePostLoginRoute())` → `/lista`.

**Navbar pública:** `PublicNavbar` (servidor) → `PublicNavbarCta` ("use client") → `usePublicNavbarViewModel` se suscribe a `subscribeToSessionChanges` → `getSessionStatus(session)` → `authenticated` → "Ir a mi lista".

## 3. Archivos

| Archivo | Qué hace |
|---|---|
| `app/(app)/layout.tsx` | Envuelve las pantallas privadas con el shell |
| `app/(app)/{lista,recetas,catalogo,household}/` | Las rutas de siempre, movidas con `git mv` (URLs iguales) |
| `components/app-shell/AppShell.tsx` | Sidebar + `<main>` + tabs |
| `components/app-shell/components/AppSidebar.tsx` / `AppTabBar.tsx` | Las dos navegaciones; el CSS (`md:`) decide cuál se ve |
| `components/app-shell/components/AppNavLink.tsx` | Un ítem: `<Link>` con `aria-current`; variante sidebar o tab |
| `components/app-shell/hooks/useAppShellViewModel.ts` | Qué ítem está activo, derivado de la ruta |
| `components/app-shell/utils/isRouteActive.ts` | Ruta exacta o subruta, sin confundir `/listas-privadas` con `/lista` |
| `components/app-shell/constants/` | Ítems, textos, variantes |
| `constants/routes.constants.ts` | `APP_ROUTE`: lo usan shell, login y navbar |
| `services/session.service.ts`, `utils/getSessionStatus.ts`, `constants/session.constants.ts` | Movidos desde session-guard: ahora los usan el guard y la navbar |
| `features/login/utils/resolvePostLoginRoute.ts` | A dónde ir después del login (punto de extensión de SCRUM-136) |
| `features/landing/components/PublicNavbarCta.tsx` + `hooks/usePublicNavbarViewModel.ts` | "Registrarse" o "Ir a mi lista" |
| Raíces de shopping-list, recipes, catalog, household | `<main>` → `<div>`: un solo `<main>` por página |
| `e2e/features/app-shell/` | E2E-SHELL-01 y 02 |

## 4. Decisiones X vs Y

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Grupo de rutas `app/(app)/` con su `layout.tsx` | Envolver cada `page.tsx` con `<AppShell>` | Un solo lugar decide qué pantallas llevan shell, y al navegar entre ellas el layout no se vuelve a montar (no parpadea) |
| `components/app-shell/` | `features/app-shell/` | Lo usan todas las pantallas privadas: es UI compartida (project-structure) |
| `git mv` | Copiar y borrar | Conserva el historial (`git log --follow app/(app)/lista/page.tsx`) |
| Ocultar secciones que no existen | Mostrarlas "Próximamente" | Decisión del equipo (2026-10-08): no prometer en la demo; cada ítem entra con su pantalla |
| `<Link>` | Botón con `router.push` | Cambia de página: se puede abrir en otra pestaña y el lector de pantalla lo anuncia como enlace |
| `aria-current="page"` además del color | Solo color | El color no le llega a un lector de pantalla |
| CSS (`hidden md:flex`) para elegir sidebar o tabs | Medir el ancho con JS | Sin parpadeo y sin diferencia entre lo que pinta el servidor y el cliente |
| Ítem activo **derivado** de la ruta | Guardarlo en un estado | La ruta ya es la fuente de verdad; un estado se podría desincronizar con "atrás" |
| Promover la sesión a carpetas compartidas | Importar desde `features/session-guard/` | La navbar es el segundo consumidor real; importar de otra feature las amarra |
| `resolvePostLoginRoute()` | Cambiar una constante | SCRUM-136 necesita un lugar donde la URL de retorno gane sobre el default |
| Solo el botón de la navbar es cliente | Toda la navbar `"use client"` | La landing sigue renderizándose en el servidor; solo lo que necesita la sesión va al navegador |

## 5. Conceptos nuevos

- **Grupo de rutas `(carpeta)`:** organiza rutas y les da un layout común sin cambiar la URL.
- **Layout que no se desmonta:** al navegar entre páginas del mismo layout, React conserva el layout y solo cambia `children`.
- **`usePathname`:** hook de Next que devuelve la ruta actual; obliga a que el componente sea cliente.
- **Componente cliente dentro de uno de servidor:** `PublicNavbar` es de servidor y renderiza `PublicNavbarCta`, que es cliente.

## 6. Preguntas trampa (con respuesta)

<details><summary>"¿Por qué cambiaste las URLs a /app/lista?"</summary>

No cambiaron (premisa falsa). `(app)` es un grupo de rutas: los paréntesis hacen que Next no lo use como segmento. La URL sigue siendo `/lista`. Lo prueba E2E-SHELL-01.
</details>

<details><summary>"¿Por qué guardas en un estado cuál es la sección activa?"</summary>

No se guarda (premisa falsa). `useAppShellViewModel` la calcula en cada render con `usePathname()` + `isRouteActive`. La ruta es la fuente de verdad.
</details>

<details><summary>"¿Cómo decide el componente si dibuja sidebar o tabs?"</summary>

No decide: dibuja los dos y el CSS esconde uno (`hidden md:flex` en el sidebar, `md:hidden` en los tabs). Por eso no hay JS midiendo la pantalla ni diferencia entre servidor y cliente.
</details>

<details><summary>"¿Por qué `/listas-privadas` no marcaría 'General'?"</summary>

`isRouteActive` compara contra `href + "/"`: `/listas-privadas` no empieza con `/lista/`. Si comparara solo con `startsWith("/lista")`, sí lo marcaría. Está en `tests/isRouteActive.test.ts`.
</details>

<details><summary>"¿Por qué movieron código de la feature de Esteban?"</summary>

La navbar pública necesitaba saber si hay sesión registrada, y eso vivía en `features/session-guard/`. Importar de otra feature las amarra; con un segundo consumidor real, lo compartido va a `services/`, `utils/` y `constants/`. Se movió con `git mv` y el guard funciona igual.
</details>

## 7. Drills de cambio en vivo

| Pedido | Dónde | Meta |
|---|---|---|
| "Agrega 'Finanzas' a la navegación" | `APP_ROUTE` en `constants/routes.constants.ts` + un ítem en `APP_NAV_ITEMS`; crear `app/(app)/finanzas/page.tsx` | 3 min |
| "Cambia 'Mi familia' por 'Household'" | `components/app-shell/constants/app-shell.constants.ts` (y el E2E, que lo fija por su cuenta) | 1 min |
| "Que después del login vaya a recetas" | `features/login/utils/resolvePostLoginRoute.ts` → `APP_ROUTE.RECIPES` (y su test) | 1 min |
| "Que el sidebar sea más ancho" | `AppSidebar.tsx`: `w-56` → `w-64` | 1 min |
| "Que `/invitacion` también tenga el shell" | Mover con `git mv` a `app/(app)/invitacion/`; explicar por qué hoy no (se abre desde un link, puede ser sin cuenta) | 2 min |

## 8. Puntos débiles

Se llena en el simulacro.
