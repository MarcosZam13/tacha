# Feature: AppShell

Ticket: [SCRUM-135](https://tacha.atlassian.net/browse/SCRUM-135) (tarea, Sprint 3). Origen: QA de sistema de `entregable-2` (PR #52, hallazgo F1).

## 1. Objetivo

Que el usuario pueda moverse entre las pantallas de la app (lista, recetas, catálogo, household) sin escribir la URL. Hoy, después de iniciar sesión, cae en la landing y ningún enlace lleva a las pantallas privadas: todo lo construido solo se alcanza por URL.

## 2. Alcance

Incluye:

- Un shell compartido para las pantallas privadas (`/lista`, `/recetas` y sus subrutas, `/catalogo`, `/household`): sidebar fijo en desktop (DESIGN.md §3.1) y tabs inferiores en mobile (§3.2).
- La ruta actual marcada como activa.
- El login exitoso lleva a la lista general, no a la landing.
- Con una sesión registrada, la navbar pública cambia "Registrarse" por una entrada a la app.
- Puntos de extensión documentados (sin implementar) para cerrar sesión (SCRUM-55) y para la URL de retorno después del login (SCRUM-136).

No incluye: ver §14.

## 3. Entradas

- Ruta actual: `pathname: string` (`usePathname` de Next).
- Pantalla privada a mostrar dentro del shell: `children: React.ReactNode`.
- Sesión de Supabase (para la navbar pública): `Session | null`, por `onAuthStateChange`.

## 4. Salidas

- Navegación con enlaces a las 4 secciones, con el ítem activo marcado (`aria-current="page"`).
- Después del login: navegación a `/lista`.
- En la navbar pública: "Registrarse" o "Ir a mi lista" según la sesión.

## 5. Reglas de negocio

1. El shell se muestra en todas las pantallas privadas y en ninguna pública (landing, nosotros, términos, login, registro, invitación).
2. Las URLs no cambian.
3. Solo se muestran secciones que existen hoy: General (`/lista`), Catálogo (`/catalogo`), Recetas (`/recetas`) y Household (`/household`). Las de DESIGN.md que todavía no existen (Fechas, Listas privadas, Finanzas) quedan ocultas hasta que existan (decisión del 2026-10-08).
4. Un ítem está activo si la ruta actual es la suya o una subruta (`/recetas/nueva` activa "Recetas").
5. El login exitoso navega a la ruta que devuelva `resolvePostLoginRoute()`. Hoy siempre es `/lista`; SCRUM-136 le va a dar prioridad a la URL de retorno.
6. Una sesión anónima no cuenta como registrada (mismo criterio que el session guard de SCRUM-49).

## 6. Estados

- Navegación: un ítem activo o ninguno (ruta privada sin ítem propio).
- Navbar pública: `checking` | `authenticated` | `unauthenticated` (`SESSION_STATUS`). Mientras está en `checking` se muestra "Registrarse", que es lo que ve un visitante.

## 7. Errores

- Sin variables de Supabase o sin sesión: la navbar pública se queda en "Registrarse" (`subscribeToSessionChanges` avisa "sin sesión" en vez de lanzar).
- El shell no pide datos: no tiene errores propios.

## 8. UI esperada

- **Desktop (≥ `md`):** sidebar fijo a la izquierda con "Tacha" arriba y los 4 ítems; ítem activo con fondo `tacha-chipbg` y texto `tacha-teal` (mockup v3). La pantalla a la derecha.
- **Mobile (< `md`):** barra de tabs fija abajo con los 4 ítems; la pantalla deja espacio para que la barra no tape contenido. Con 4 ítems no hace falta "Más" (§3.2 lo pide a partir de 6).
- **Navbar pública:** el botón de la derecha dice "Registrarse" (a `/registro`) o "Ir a mi lista" (a `/lista`).

## 9. Accesibilidad

- Cada navegación es un `<nav>` con nombre propio ("Secciones de la app").
- Los ítems son enlaces (`<Link>`), no botones: cambian de página.
- El activo lleva `aria-current="page"`, además del color.
- Hay un solo `<main>` por página: el del shell. Las pantallas privadas pasan su raíz a `<div>`.
- Los tabs mobile tienen texto visible, no solo íconos.

## 10. Restricciones técnicas

- `app/` solo rutas: el grupo `app/(app)/` con un `layout.tsx` delgado; la UI en `components/app-shell/` (project-structure).
- Las rutas se mueven con `git mv` para conservar el historial.
- ViewModel: la lógica (ítem activo, sesión) en hooks; los `.tsx` solo presentan.
- Rutas compartidas en `constants/routes.constants.ts` (shell, login y navbar pública son tres consumidores).
- Sin librerías nuevas. No toca la base.

## 11. Dependencias

- `next/navigation` (`usePathname`), `next/link`.
- `services/session.service.ts`, `utils/getSessionStatus.ts`, `constants/session.constants.ts`: promovidos desde `features/session-guard/` (segundo consumidor: la navbar pública).
- `features/login/hooks/useLoginViewModel.ts` (redirect), `features/landing/components/PublicNavbar.tsx`.

## 12. Contratos externos

- Supabase Auth: `onAuthStateChange` (evento `INITIAL_SESSION` y cambios). Sin tablas ni RPC.

## 13. Casos de aceptación

- [ ] CA-01: desde cualquier pantalla privada se llega a lista, recetas, catálogo y household con un clic/toque, en desktop y en mobile (ancho de Pixel 7).
- [ ] CA-02: después de iniciar sesión en `/login`, el usuario cae dentro de la app, no en la landing.
- [ ] CA-03: con una sesión registrada, la navbar de la landing no muestra "Registrarse".
- [ ] CA-04: la ruta actual está marcada como activa en la navegación.
- [ ] CA-05: las páginas públicas (landing, nosotros, términos, login, registro) mantienen la navbar y el footer públicos, sin sidebar ni tabs.

## 14. Casos fuera de alcance

- Cerrar sesión: SCRUM-55. Va en el pie del sidebar (desktop) y, cuando haya más ítems, en "Más" (mobile); ver plan.md.
- URL de retorno después del login: SCRUM-136. Entra por `resolvePostLoginRoute()`.
- Ítems de secciones que no existen (Fechas, Listas privadas, Finanzas) y el menú "Más": se agregan con su pantalla.
- Íconos en los ítems: el repo no tiene set de íconos; se agregan cuando el equipo elija uno.
- Sub-tabs internos de Catálogo y Recetas (DESIGN.md §3.1): son de cada pantalla.
- Proteger las rutas privadas: ya lo hace el session guard (SCRUM-49) detrás de su flag.

## 15. Notas de implementación

La invitación (`/invitacion/[token]`) queda fuera del shell: es la entrada desde un link compartido y puede abrirse antes de tener cuenta.
