# Feature: SessionGuard

Cubre SCRUM-49 (HU-26: token de seguridad de sesión).

## 1. Objetivo

Las pantallas privadas de Tacha solo las ve quien tiene una sesión iniciada. El token de sesión (JWT) lo emite Supabase Auth al iniciar sesión, expira y se renueva solo; esta feature asegura que, sin un token válido, el usuario es enviado al login en vez de ver una pantalla privada. Es una protección de experiencia de usuario; la protección real de los datos sigue siendo RLS en la base de datos.

## 2. Alcance

Incluye:
- Un guard en el layout raíz que decide, para cada ruta, si se muestra el contenido, un indicador de carga o se redirige a `/login`.
- Una lista de rutas públicas; todo lo que no esté en la lista exige sesión.
- Considerar iniciada solo una sesión de un usuario real: una sesión anónima no cuenta.
- Redirigir al login cuando la sesión se pierde mientras se está en una pantalla privada (cierre de sesión, token que ya no se puede renovar).
- Un interruptor por variable de entorno: el guard queda construido pero **apagado por defecto**.
- Documentar la duración del token de acceso y cómo se renueva.

No incluye: ver [14](#14-casos-fuera-de-alcance).

## 3. Entradas

- pathname: string (ruta actual del navegador)
- session: la sesión que guarda Supabase en el navegador, o ninguna
- Eventos de sesión de Supabase Auth: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `INITIAL_SESSION`
- `NEXT_PUBLIC_SESSION_GUARD_ENABLED`: el interruptor (`"true"` lo enciende; cualquier otro valor o ausencia lo apaga)

## 4. Salidas

- Guard apagado: se muestran los hijos tal cual, sin consultar la sesión.
- Ruta pública: se muestran los hijos de inmediato, sin esperar a la sesión.
- Ruta privada con sesión real: se muestran los hijos.
- Ruta privada mientras se verifica la sesión: un indicador de carga; el contenido privado no se muestra.
- Ruta privada sin sesión real: redirección a `/login` (reemplaza la entrada del historial) y nada del contenido privado.

## 5. Reglas de negocio

- Con el interruptor apagado el guard no hace nada: no lee la sesión, no se suscribe a eventos y no redirige.
- Una ruta es pública solo si está en la lista de rutas públicas; el resto es privada. Una ruta nueva olvidada en la lista queda protegida (falla cerrado).
- Una sesión es válida para entrar solo si existe y su usuario no es anónimo.
- La sesión se lee del almacenamiento local de Supabase; no se valida contra el servidor en cada navegación. El servidor valida el token en cada petición a la base de datos.
- Si no se puede crear el cliente de Supabase (faltan las variables), se trata como sin sesión.
- Una ruta privada nunca muestra su contenido antes de saber que hay sesión real.
- El token de acceso expira según la configuración del proyecto de Supabase; mientras el token de renovación sea válido se renueva solo y el usuario no es interrumpido. Si ya no se puede renovar, la sesión se pierde y se redirige al login.
- La redirección usa `replace`: el botón "atrás" no devuelve a la pantalla privada.
- El guard no crea sesiones ni hace login por su cuenta.

## 6. Estados

Unión derivada de constantes: `checking | authenticated | unauthenticated`. Se calcula con una función pura a partir de la sesión; no se guardan booleanos sueltos como `isLoggedIn` o `isLoading`.

## 7. Errores

| Situación | Resultado |
|---|---|
| No hay sesión en una ruta privada | Redirección a `/login` |
| La sesión es anónima | Redirección a `/login` |
| No se puede crear el cliente de Supabase (faltan las variables) | Se trata como sin sesión: las rutas privadas redirigen a `/login` y las públicas siguen funcionando |
| El token se vence y no se puede renovar | Evento `SIGNED_OUT`: redirección a `/login` |
| Faltan las variables de Supabase | El cliente lanza su error de configuración; con el guard apagado no se llega a leerlas |

## 8. UI esperada

- Mientras se verifica la sesión en una ruta privada: un `Spinner` centrado en pantalla, con la etiqueta "Verificando tu sesión".
- Mientras se redirige: la misma pantalla de carga (o vacía), nunca el contenido privado.
- No hay ninguna otra interfaz: el guard no dibuja formularios, botones ni mensajes.

## 9. Accesibilidad

- El indicador de carga trae `role="status"` y una etiqueta de texto (`Spinner`), así que un lector de pantalla anuncia que se está verificando la sesión.
- La redirección no deja al usuario en una pantalla vacía sin aviso: la etiqueta del indicador explica qué ocurre.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`; ViewModel (`hooks/useSessionGuardViewModel.ts`) con la lógica y `.tsx` solo de presentación.
- Sin librerías nuevas. Sin `proxy.ts` ni cookies: el cliente guarda la sesión en el almacenamiento local, que el servidor no puede leer.
- Sin magic strings (constants-standards): rutas, estados, nombre de la variable y etiquetas en `constants/`.
- No se modifican las pantallas de otras historias (`/lista`, `/recetas`) ni sus servicios. El único archivo compartido que cambia es `app/layout.tsx`, con una línea.
- Skills: component-architecture, constants-standards, clean-code-practices, project-structure, security-practices.

## 11. Dependencias

- `services/supabase.client.ts` (`getSupabaseClient`).
- `next/navigation` (`usePathname`, `useRouter`).
- `@/components/ui` (`Spinner`).
- `app/layout.tsx` (donde se monta).
- La ruta `/login` de `features/login/`.
- Variable: `NEXT_PUBLIC_SESSION_GUARD_ENABLED` (opcional; apagado si falta).

## 12. Contratos externos

**Supabase Auth, desde el cliente:**
- `auth.onAuthStateChange(callback)`: al suscribirse entrega la sesión guardada en el navegador (evento `INITIAL_SESSION`, renovando el token de acceso si venció y el de renovación es válido) y después avisa de `SIGNED_IN`, `SIGNED_OUT` y `TOKEN_REFRESHED`; devuelve una suscripción que hay que cancelar al desmontar. El guard no usa `getSession()`: una lectura aparte podía llegar tarde y pisar un evento más nuevo.
- La sesión expone `user.is_anonymous`.

**Configuración del proyecto de Supabase (manual):** la duración del token de acceso (JWT expiry, por defecto 3600 segundos). El valor vigente se anota en el PR y en §15.

No hay tablas, RLS ni Edge Functions nuevas.

## 13. Casos de aceptación

Con el interruptor **encendido**:
- Caso 1: sin sesión, abrir `/lista` redirige a `/login` y nunca muestra el contenido.
- Caso 2: con sesión real, `/lista` y `/recetas` se abren.
- Caso 3: con una sesión anónima restante en el navegador, `/lista` redirige a `/login`.
- Caso 4: `/`, `/login`, `/registro` y `/registro/verificado` se abren sin sesión y sin indicador de carga.
- Caso 5: borrar la sesión del almacenamiento local y recargar una pantalla privada redirige a `/login`.
- Caso 6: cerrar la sesión mientras se está en una pantalla privada (por ejemplo, desde otra pestaña) redirige a `/login` sin recargar.
- Caso 7: con el token de acceso vencido pero el de renovación válido, el usuario sigue dentro: el token se renueva y no hay redirección.
- Caso 8: después de la redirección, el botón "atrás" no devuelve a la pantalla privada.
- Caso 9: al abrir una ruta privada se ve el indicador de carga y, antes de saber que hay sesión, no aparece nada del contenido privado.
- Caso 10: tras iniciar sesión en `/login` y navegar a `/lista`, la pantalla se abre.

Con el interruptor **apagado** (por defecto):
- Caso 11: sin sesión, `/lista` y `/recetas` se abren como antes de esta feature.
- Caso 12: el guard no lee la sesión ni se suscribe a eventos.

Documentación:
- Caso 13: la duración del token de acceso queda anotada en §15 con el valor real del proyecto.

## 14. Casos fuera de alcance

- Botón o acción de cerrar sesión: no es de esta historia.
- Cierre automático por inactividad y su aviso: HU-27 (Sprint 3).
- Volver a la página de origen después de iniciar sesión (un parámetro `next` abre riesgo de redirección abierta).
- Validar la sesión contra el servidor en cada navegación, cookies de sesión y `proxy.ts`.
- Control por roles o por household (quién puede ver qué): lo resuelven RLS y las historias de household.
- Migrar o descartar los datos de las sesiones anónimas: ticket aparte.
- **Encender el guard por defecto:** requiere coordinar con quienes trabajan en `/lista` y `/recetas`, que hoy dependen de la sesión anónima automática (`ensureSession`). Es una decisión del equipo con su propio ticket.
- Quitar `ensureSession` y la sesión anónima automática de `services/supabase.client.ts`.

## 15. Notas de implementación

- **Interruptor apagado por defecto.** Con `NEXT_PUBLIC_SESSION_GUARD_ENABLED` ausente, la HU-26 queda implementada pero inactiva: un visitante sin sesión sigue entrando a `/lista`. El criterio "sin token válido se redirige al login" solo se cumple con el interruptor encendido; QA debe probar con la variable en `true`. La variable se lee al compilar: cambiarla exige reiniciar `npm run dev` o reconstruir.
- **El guard es del cliente.** Quien lo salte no obtiene datos: Supabase rechaza un token inválido en cada petición y RLS decide qué filas se ven. Tablas con lectura pública (por ejemplo `household_store_preferences`, deuda ya anotada) seguirían legibles aunque el guard esté encendido.
- **Cuando el guard esté encendido,** las pantallas privadas exigen iniciar sesión también en desarrollo. Los servicios que llaman a `ensureSession` seguirán funcionando: reciben la sesión real y no crean ninguna anónima.
- **Cada página pública nueva** (About, términos, recuperar contraseña, etc.) debe agregarse a la lista de rutas públicas, o quedará protegida.
- **Duración del token:** por defecto el token de acceso dura 3600 segundos y el cliente lo renueva solo con el token de renovación, así que la sesión no se corta cada hora mientras el de renovación sea válido. Una duración máxima total de la sesión o un cierre por inactividad serían ajustes aparte (HU-27). Valor configurado en el proyecto: 3600 segundos. 
- La sesión que usa el guard sale del almacenamiento local, sin validarla contra el servidor; `getUser()` (que consulta al servidor) se reservaría para decisiones de seguridad, que aquí toma RLS.
- Con el guard encendido el hook se suscribe a los eventos de sesión en todas las rutas, también en las públicas: así el estado no queda viejo al ir de `/login` a una ruta privada. Las rutas públicas igual se muestran sin esperar a la sesión.
- **El guard es experiencia de usuario, no la barrera de los datos.** Las políticas de `lists`, `list_items`, `recipes` y `recipe_ingredients` son `to authenticated` y una sesión anónima de Supabase tiene ese rol: un visitante puede llamar `signInAnonymously()` desde la consola y escribir sus propias listas y recetas (ve solo las suyas). La mitigación de fondo es desactivar los inicios de sesión anónimos en el proyecto de Supabase cuando el login real esté activo; como defensa extra, exigir `is_anonymous` falso en las políticas y las RPC. Va en un ticket aparte.
- **Un valor mal escrito apaga el guard en silencio:** `True`, `1` o un nombre equivocado dan "apagado" sin error, y un despliegue que olvide la variable sale con las pantallas privadas abiertas. El valor esperado en producción (`NEXT_PUBLIC_SESSION_GUARD_ENABLED=true`) va en el checklist del despliegue.
- **Las rutas privadas no hacen consultas de datos en el servidor** mientras el guard sea del cliente: el árbol que genera el servidor viaja en el payload de la página aunque el guard no lo pinte. Los datos se piden en el navegador, con el token.
- **Al encender el guard:** `ensureSession` guarda en memoria la sesión que resolvió la primera vez; si alguien tenía una anónima e inicia sesión sin recargar, los servicios pueden seguir usando el id viejo hasta recargar. Se corrige invalidando esa sesión guardada cuando cambie el usuario (en `services/supabase.client.ts`, fuera de esta historia).
