# Plan técnico: SessionGuard

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## Archivos

```
features/session-guard/
  SessionGuard.tsx                     entrada ("use client"): muestra hijos, carga o nada (solo presentación)
  hooks/
    useSessionGuardViewModel.ts        lee la sesión, escucha eventos, calcula el estado y redirige
  models/
    SessionGuardProps.interface.ts     props: children
    SessionGuardViewModel.interface.ts lo que devuelve el hook
  services/
    session.service.ts                 subscribeToSessionChanges(): se suscribe a supabase.auth.onAuthStateChange (desde SCRUM-135 en services/session.service.ts)
  utils/
    getSessionStatus.ts                función pura: sesión → checking | authenticated | unauthenticated (desde SCRUM-135 en utils/getSessionStatus.ts, con SESSION_STATUS en constants/session.constants.ts)
    isPublicRoute.ts                   función pura: ruta → ¿es pública?
  constants/
    session-guard.constants.ts         interruptor, rutas, estados, etiqueta del indicador
  specs/  SPEC.md · plan.md · tasks.md

app/layout.tsx                         + envuelve {children} con <SessionGuard>
.env.example                           + NEXT_PUBLIC_SESSION_GUARD_ENABLED (comentado, apagado por defecto)
```

No se tocan `/lista`, `/recetas`, `services/supabase.client.ts` ni `ensureSession`. El único archivo compartido que cambia es `app/layout.tsx`.

## Datos

Sin tablas, RLS, RPC ni Edge Functions. La duración del token de acceso es un ajuste del proyecto de Supabase (se revisa a mano y se anota).

## Flujo

Navego a `/lista` → `app/layout.tsx` renderiza `SessionGuard` → `useSessionGuardViewModel` mira primero el interruptor (`IS_SESSION_GUARD_ENABLED`): apagado, deja pasar. Encendido, un efecto se suscribe con `subscribeToSessionChanges()` (`session.service.ts` → `auth.onAuthStateChange`) al montarse, en todas las rutas; el primer evento (`INITIAL_SESSION`) trae la sesión actual y `getSessionStatus(session)` calcula el estado, que se recalcula con cada evento posterior. `isPublicRoute(pathname)` decide si la ruta es pública; si lo es, deja pasar sin esperar al estado. Con estado `unauthenticated` el hook llama a `router.replace("/login")`. `SessionGuard.tsx` pinta los hijos solo si está permitido, un `Spinner` mientras verifica y nada mientras redirige.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Interruptor `NEXT_PUBLIC_SESSION_GUARD_ENABLED`, apagado por defecto | Encender el guard ya | `/lista` y `/recetas` dependen hoy de la sesión anónima automática; encenderlo rompe las pruebas y demos de quienes trabajan en ellas sin avisarles. El costo: el criterio 3 de la HU solo se cumple encendido, y alguien debe decidir cuándo encenderlo |
| Guard del cliente | `proxy.ts` con cookies | El cliente guarda la sesión en localStorage; el servidor no la ve. Pasar a cookies (`@supabase/ssr`) cambia todo el cliente de Supabase y toca a todas las features |
| Un solo guard en `app/layout.tsx` con lista pública | Un grupo de rutas `(protegido)/` o un guard por página | Mover o editar las páginas de otras historias arriesga conflictos con sus PRs; un punto único se enciende y apaga en un lugar |
| Lista de rutas públicas (falla cerrado) | Lista de rutas privadas | Una ruta nueva olvidada en la lista de públicas queda protegida; olvidada en una lista de privadas queda abierta |
| Una sesión anónima no cuenta | Aceptar cualquier sesión | `ensureSession` crea una anónima para cualquiera; si contara, el guard nunca redirigiría a nadie |
| Sesión local, entregada por `onAuthStateChange` | `getUser()` en cada navegación | La sesión local es instantánea; `getUser()` hace una petición por navegación. Lo que protege los datos es RLS, no este guard |
| Solo la suscripción, sin `getSession()` aparte | Leer con `getSession()` y además suscribirse | Dos fuentes de la misma verdad admiten una carrera: si llega `SIGNED_OUT` antes de que `getSession()` responda, la respuesta vieja pisa el estado nuevo. `INITIAL_SESSION` ya trae la sesión actual |
| `try/catch` en la suscripción y "sin sesión" ante un fallo | Dejar que lance | Si faltan las variables de Supabase, un error dentro del efecto rompe todo el layout, incluidas `/` y `/login`; así solo las rutas privadas se redirigen |
| Suscripción a `onAuthStateChange` | Comprobar solo al montar | Sin la suscripción, un cierre de sesión en otra pestaña o un token que no se puede renovar dejarían al usuario viendo una pantalla privada sin sesión |
| Estado como unión `checking \| authenticated \| unauthenticated`, calculado por una función pura | Booleanos `isLoading` e `isLoggedIn` | Dos booleanos admiten la combinación "cargando y sin sesión a la vez"; además la función pura se prueba sin React |
| `router.replace("/login")` | `router.push` | Con `push`, "atrás" devolvería a la pantalla privada y volvería a redirigir (un bucle) |
| Sin parámetro `next` para volver al origen | Guardar la ruta de origen | Un destino que viene de la URL es una redirección abierta si no se valida; no hay tiempo de diseñarlo bien en este sprint |
| Sin store compartido | Un store de sesión | Solo el guard necesita el estado; un store sin segundo consumidor es la abstracción prematura que `nextjs-enterprise-patterns` pide evitar |
| Indicador `Spinner` ya existente | Pantalla en blanco | Una pantalla vacía parece rota; el `Spinner` trae `role="status"` y etiqueta |
| El interruptor y las rutas viven en las constantes de la feature | `constants/app.constants.ts` | Es una constante de esta feature, y ese archivo compartido ya lo tocan otras historias |

## Puesta en marcha (cuando el equipo decida encender el guard)

1. Avisar a quienes trabajan en `/lista`, `/recetas` y cualquier página privada: necesitarán iniciar sesión también en desarrollo.
2. Agregar a la lista de rutas públicas cualquier página pública que haya aparecido (About, términos, recuperar contraseña…).
3. Poner `NEXT_PUBLIC_SESSION_GUARD_ENABLED=true` en el entorno y reconstruir.
4. Evaluar quitar `ensureSession` y la sesión anónima automática (ticket aparte).
