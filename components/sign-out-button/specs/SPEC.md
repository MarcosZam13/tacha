# Feature: SignOutButton

Historia: **SCRUM-55 (HU-32) — Cerrar sesión (logout)**. Criterios en [docs/historias-usuario.md](../../../docs/historias-usuario.md).

Vive en `components/sign-out-button/` y no en `features/` porque lo usan dos lugares que no pueden importarse entre sí: el sidebar (`components/app-shell/`) y la pantalla de Perfil (`features/profile/`).

## 1. Objetivo

Que la persona cierre su sesión desde cualquier pantalla privada con un botón siempre a la vista, y que no pierda por accidente lo que está editando.

## 2. Alcance

Incluye:

- Botón "Cerrar sesión" al pie del sidebar (desktop) y al final de la pantalla de Perfil (mobile, donde el criterio dice "Más → Perfil") (CA-01).
- Cierre de la sesión de este navegador y redirección a `/login` (CA-02).
- Confirmación antes de cerrar cuando hay cambios sin guardar; sin ellos, el cierre es inmediato (CA-03).
- Un registro mínimo de "esta pantalla tiene cambios sin guardar" que cualquier pantalla puede usar, y su primer uso: el formulario de Perfil.

No incluye: ver el apartado 14.

## 3. Entradas

- Clic o `Enter`/`Espacio` sobre el botón.
- Las pantallas que informan que tienen cambios sin guardar (`hasChanges: boolean` por pantalla).

## 4. Salidas

- La sesión de este navegador cerrada (`signOutUser`).
- Redirección a `/login` con `router.replace`.
- Un diálogo de confirmación cuando hay cambios sin guardar.

## 5. Reglas de negocio

1. Sin cambios sin guardar, un clic cierra la sesión de inmediato.
2. Con cambios sin guardar, un clic abre un diálogo; la sesión no se cierra hasta confirmar. Cancelar (botón, `Escape` o clic fuera) vuelve a la pantalla tal como estaba.
3. El cierre es de este navegador (alcance `local`): no cierra las sesiones de otros dispositivos.
4. Se redirige al login con `replace`: "atrás" no debe volver a una pantalla privada sin sesión.
5. Mientras se cierra, el botón queda deshabilitado y no se puede enviar un segundo cierre.
6. El cierre no falla ni se queda colgado: `signOutUser` no lanza y tiene un tope de espera; la redirección ocurre en cualquier caso.
7. Una pantalla informa sus cambios sin guardar mientras existen y los retira al guardarse o al desmontarse; así nunca queda un aviso viejo.

## 6. Estados

`idle | confirming | signingOut`. Unión derivada de constantes (constants-standards §7), no booleanos sueltos.

## 7. Errores

No hay mensajes de error: `signOutUser` no lanza y, pase lo que pase, se redirige al login. El peor caso (la red no responde) es que la sesión del servidor expire sola; la de este navegador ya se borró.

## 8. UI esperada

- Botón "Cerrar sesión" (secundario). Mientras cierra: "Cerrando sesión...".
- Diálogo: título "¿Cerrar sesión?", texto "Tenés cambios sin guardar. Si cerrás sesión, se pierden.", botones "Cerrar sesión" (destructivo) y "Seguir editando".

## 9. Accesibilidad

- Es un botón real, alcanzable con Tab y con `Enter`/`Espacio`.
- El diálogo usa `role="dialog"` y `aria-modal` (`Modal` compartido) y se cierra con `Escape`.
- El botón de confirmar es el destructivo; el de cancelar, el secundario.
- Con el diálogo abierto no hay otra acción de cierre.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; Tailwind con tokens `tacha-*`.
- Lógica en `useSignOutViewModel`; los `.tsx` solo presentan.
- Reutilizar `signOutUser`, `Modal` y `Button`; no escribir otro cierre de sesión.
- Sin strings ni números mágicos (constants-standards).
- Sin librería de estado: el registro de cambios sin guardar es un servicio con suscripción (mismo patrón que `subscribeToSessionChanges`) leído con `useSyncExternalStore`.
- Sin migración ni Edge Function.

## 11. Dependencias

- `@/services/session.service` (`signOutUser`), `next/navigation` (`useRouter`).
- `@/components/ui` (`Button`, `Modal`), `@/constants` (`AUTH_ROUTE`, `BUTTON_VARIANT`).
- `services/unsaved-changes.service.ts` y `hooks/useUnsavedChanges.ts` (nuevos, compartidos).
- Quién lo usa: `components/app-shell/components/AppSidebar.tsx` y `features/profile/Profile.tsx`.

## 12. Contratos externos

- **Auth:** `auth.signOut({ scope: "local" })` vía `signOutUser`.
- **RLS / tablas:** no hay cambios.

## 13. Casos de aceptación

| # | Caso | Criterio |
|---|---|---|
| 1 | El botón está al pie del sidebar de desktop | CA-01 |
| 2 | El botón está al final de la pantalla de Perfil (mobile) | CA-01 |
| 3 | Sin cambios sin guardar, un clic cierra la sesión y lleva a `/login` | CA-02, CA-03 |
| 4 | Con cambios sin guardar en Perfil, un clic abre la confirmación y no cierra | CA-03 |
| 5 | En la confirmación, "Seguir editando" o `Escape` vuelve al formulario con lo escrito | CA-03 |
| 6 | En la confirmación, "Cerrar sesión" cierra y lleva a `/login` | CA-02 |
| 7 | Tras guardar el perfil, el cierre vuelve a ser inmediato | Regla 7 |
| 8 | Tras cerrar, "atrás" no vuelve a una pantalla privada | Regla 4 |
| 9 | Mientras cierra, el botón está deshabilitado | Regla 5 |
| 10 | Cerrar sesión en este navegador no cierra otros dispositivos | Regla 3 |

## 14. Casos fuera de alcance

- Cerrar todas las sesiones de la cuenta.
- Avisar de cambios sin guardar al cerrar la pestaña o navegar (`beforeunload`).
- Que otras pantallas informen sus cambios sin guardar: lo hace cada una con `useReportUnsavedChanges` cuando le toque. Hoy solo Perfil (la pantalla de cambio de contraseña, SCRUM-54, aún no está en `develop`).
- El menú "Más" de mobile (DESIGN.md §3.2).
- El aviso de cierre por inactividad (SCRUM-50), que sigue como está.

## 15. Notas de implementación

- La inactividad ya limpia su marca cuando la sesión termina por cualquier causa, así que el cierre manual no necesita tocarla.
- Si SCRUM-54 se mergea después, ambas historias agregan una línea al final de `Profile.tsx`: es un conflicto pequeño de resolver a mano.
