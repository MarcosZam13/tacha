# Tareas: household

Deriva de [plan.md](plan.md). Cada etapa se revisa y se aprueba antes de pasar a la siguiente.

## SCRUM-56: crear household y link de invitación

### Etapa 1 — Specs

- [x] 1.1 Reescribir `specs/SPEC.md`, `specs/plan.md` y `specs/tasks.md` para la versión con base de datos.
- [x] 1.2 Revisión y aprobación de los specs.

### Etapa 2 — Migración 011 (diseño y revisión)

- [x] 2.1 Escribir `supabase/migrations/011_create_households_and_invites.sql` con encabezado (ticket, qué hace, por qué). Es la `011` porque la `009` (SCRUM-123, `009_close_store_preferences_writes.sql`) y la `010` (SCRUM-96, `010_delete_recipes.sql`) ya existen en `develop`; se escribió como `010` y se renombró al sincronizar el 2026-10-03.
- [x] 2.2 Tablas `households`, `household_members` (PK `user_id`, `role` con `check`) y `household_invite_links` (PK `household_id`, `token uuid unique`, `expires_at`), con FKs `on delete cascade`.
- [x] 2.3 RLS: activado en las tres; `select` de la membresía propia y del household propio; ninguna política en `household_invite_links`; `revoke` de escritura (y de lectura en invitaciones).
- [x] 2.4 RPC `create_household(household_name)`: household + membresía `admin` en una transacción; rechaza sin sesión y anónimos.
- [x] 2.5 RPC `create_household_invite()`: verifica admin, upsert por `household_id` con `gen_random_uuid()` y `now() + interval '7 days'`.
- [x] 2.6 RPC `get_household_invite()`: verifica admin, devuelve `token` y `expires_at` (o nada).
- [x] 2.7 Las tres RPC: `security definer`, `set search_path = ''`, nombres calificados, `revoke execute` de `public` y `anon`, `grant` a `authenticated`.
- [x] 2.8 Revisión del SQL con el subagente `security-reviewer`.
- [x] 2.9 Revisión y aprobación de la migración.

### Etapa 3 — Aplicar migración y tipos

- [x] 3.1 Aplicar la migración en el SQL Editor de la base compartida (lo hizo la dueña de la historia).
- [ ] 3.1b Avisar al equipo que la migración ya está aplicada en la base compartida.
- [x] 3.2 Verificar los objetos creados en la base: existen las tres tablas y las tres RPC; RLS activado en las tres tablas; las políticas de lectura son las previstas; los permisos directos de tabla están limitados a lo definido; las tres funciones son `security definer`, con `search_path` vacío, y solo las ejecuta `authenticated` (`anon` no).
- [ ] 3.2b Probar la base simulando usuarios, con `rollback` (casos en [plan.md](plan.md#cómo-se-prueba-la-base-antes-de-tener-ui)): anónimo rechazado; segundo household rechazado; regenerar deja una fila y borra el token viejo; `member` rechazado; lectura directa de invitaciones sin acceso. (El caso de regenerar ya se comprobó con datos reales el 2026-10-02, ver Pruebas manuales; los demás siguen pendientes.)
- [x] 3.3 Escribir a mano en `types/database.types.ts` las entradas de la migración 011 (3 tablas y 3 RPC), para que el código compile antes de aplicarla (decisión 2026-09-29, opción B, como en SCRUM-94).
- [x] 3.3b Comparar `types/database.types.ts` con la base real. Verificado en el SQL Editor con consultas de solo lectura (`information_schema.columns` y `pg_proc`): las 11 columnas de `households`, `household_members` y `household_invite_links` (tipos, `NOT NULL` y defaults) y las tres RPC: `create_household(household_name text) → uuid`, `create_household_invite() → TABLE(token uuid, expires_at timestamptz)` y `get_household_invite() → TABLE(token uuid, expires_at timestamptz)`. Los resultados coinciden con `types/database.types.ts` y con la migración 011.
- [ ] 3.4 Revisión y aprobación.

### Etapa 4 — Constantes, modelos y servicio

- [x] 4.1 Renombrar `constants/household-invite.constants.ts` → `household.constants.ts`; quitar `DURATION` y `PREVIEW_NOTICE`; agregar `HOUSEHOLD_DB`, `HOUSEHOLD_ROLE` (+ tipo), `HOUSEHOLD_FORM_LIMIT`, estados de pantalla y textos nuevos.
- [x] 4.2 Ajustar `models/HouseholdInvite.interface.ts` a `{ expiresAt, url }`.
- [x] 4.3 Crear `models/HouseholdMembership.interface.ts` (`{ householdName, role }`).
- [x] 4.4 Renombrar `services/household-invite.service.ts` → `household.service.ts` y reescribirlo: `hasRegisteredSession()`, `getHouseholdMembership()`, `createHousehold(name)`, `getHouseholdInvite()`, `createHouseholdInvite()` y la conversión privada de la respuesta.
- [x] 4.5 `npx tsc --noEmit`, `npm run lint`; revisión y aprobación.

### Etapa 5 — Hooks

- [x] 5.1 Renombrar `hooks/useHouseholdInviteViewModel.ts` → `useHouseholdInvite.ts`: recibe `isAdmin`; carga el enlace con bandera de cancelación; conserva expiración y copia.
- [x] 5.2 Respuestas fuera de orden: contador de pedido en `useRef`; solo se guarda la respuesta del último.
- [x] 5.3 Mientras se regenera, conservar el enlace anterior en pantalla; si falla, volver a leer el enlace vigente en vez de dar por bueno el anterior (B1).
- [x] 5.4 Crear `hooks/useHouseholdViewModel.ts`: sesión, membresía, rol, formulario de creación (estado y validación del nombre), estados de pantalla; usa `useHouseholdInvite` y entrega a la pantalla solo la sección del enlace (`invite.card` con las props de la tarjeta).
- [ ] 5.5 Revisión y aprobación (`npx tsc --noEmit` pasa sobre el estado actual; `npm run lint` se repite en 8.1b).

### Etapa 6 — Componentes, pantalla y ruta

- [x] 6.1 Crear `components/HouseholdCreateForm.tsx` y `components/models/HouseholdCreateFormProps.interface.ts` (solo presentación, con `Input` y `Button`).
- [x] 6.2 Ajustar `components/HouseholdInviteLinkCard.tsx` y sus props: quitar `role="status"` y `feedbackMessage`.
- [x] 6.3 Crear `Household.tsx`: título, estados, formulario o tarjeta, `role="status"` siempre montado y `role="alert"` para errores.
- [x] 6.4 Crear `app/(app)/household/page.tsx` (una línea + metadata).
- [x] 6.5 Pasar los textos visibles al español en `constants/household.constants.ts` ("Mi familia", "Crea tu familia", "Nombre de la familia", "Crear mi familia", "Invitar a mi familia", "Generar enlace de invitación", "Enlace de invitación", "Copiar enlace", "Generar nuevo enlace"); los nombres técnicos siguen con `household`.
- [ ] 6.6 Accesibilidad (revisada en el código; falta probarla en el navegador): solo teclado, anuncios de `role="status"`, estados con texto (no solo color).
- [ ] 6.7 Revisión y aprobación.

### Etapa 7 — Documentación

- [x] 7.1 `docs/documento-proyecto.md` §4.1: la creación mínima del household vive en HU-33; los anónimos no crean households.
- [x] 7.2 `docs/documento-proyecto.md` §6: columnas reales de las tres tablas, token en claro con acceso cerrado, sin `created_by`.
- [x] 7.3 Actualizar las referencias al número de la migración en el código (comentarios), los specs y `docs/documento-proyecto.md`: primero de `009` a `010` y, al sincronizar con `develop` el 2026-10-03, a `011` porque la `009` y la `010` ya existen ahí.
- [x] 7.4 Reescribir `specs/SPEC.md` con la plantilla de 15 secciones (SCRUM-121) y la interfaz en español.
- [ ] 7.5 Revisión y aprobación.

### Etapa 8 — QA y revisiones

- [x] 8.1 `npx tsc --noEmit` y `git diff --check` sobre el estado actual.
- [x] 8.1b `npm run lint` y `npm run build` sobre el estado actual de SCRUM-56: los dos terminaron con exit 0. El build completó el chequeo de TypeScript y generó las rutas, incluida `/household`. `git status` fue idéntico antes y después; la carpeta `.next/` no aparece porque Git la ignora.
- [x] 8.2 Pruebas manuales de la pantalla con una sesión de un usuario de prueba de Supabase Auth (2026-10-01, ver abajo). Se hicieron antes de pasar los textos al español; el camino feliz se repitió en español en 8.2b.
- [x] 8.2b Repetir el camino feliz con la interfaz en español y tomar capturas de evidencia nuevas (2026-10-02). Antes de subirlas al PR hay que recortar o tapar el token completo del enlace.
- [ ] 8.3 Revisión final con los subagentes `code-reviewer`, `security-reviewer` y `qa-checker` sobre el estado final.
- [x] 8.4 Marcar los CA de [SPEC.md](SPEC.md) según lo validado.
- [ ] 8.5 Preparar commit y PR en inglés (regla de SCRUM-122) con la plantilla, pasos de prueba, evidencias y limitaciones conocidas.

### Pruebas manuales (`npm run dev`, `http://localhost:3000/household`)

Realizadas el 2026-10-01 con la migración aplicada y una sesión de un usuario de prueba creado en Supabase Auth. El camino feliz marcado abajo se repitió el 2026-10-02 con los textos en español (8.2b).

Camino feliz:

- [x] Sin sesión: se muestra que se necesita una cuenta registrada.
- [ ] Con una sesión anónima: el mismo aviso, y abrir la pantalla no crea un usuario anónimo.
- [x] Registrado sin familia: formulario; crear con un nombre válido ("Familia de Prueba") → pasa a administrador con el nombre de la familia y aparece la sección de invitación.
- [x] Administrador sin enlace: generar → tarjeta "Activo" con el enlace y la fecha de vencimiento 7 días después.
- [x] Copiar: "Copiar enlace" muestra la confirmación "¡Copiado!".
- [ ] Copiar: el texto pegado coincide con el enlace mostrado y "¡Copiado!" se va a los 2 s.
- [x] Regenerar: "Generar nuevo enlace" genera uno nuevo y aparece el aviso de que el anterior dejó de funcionar.
- [x] Recargar después de regenerar: se recupera el enlace nuevo, no el anterior.
- [x] Regenerar: comprobado directamente en la base (2026-10-02) que queda una sola fila de invitación para la familia y que el token anterior ya no existe.
- [x] Vencido (ajustando `expires_at` del enlace de prueba en el SQL Editor): se muestra "Expirado" con la fecha pasada y la opción de generar uno nuevo.
- [x] Generar después de vencer: vuelve a "Activo"; al recargar sigue "Activo".

Casos borde y negativos:

- [ ] Nombre vacío o demasiado largo: error en el formulario, sin llamar a la base.
- [ ] Doble click en "Crear mi familia" o en "Generar nuevo enlace": una sola familia, un solo enlace.
- [ ] Portapapeles que falla (`navigator.clipboard.writeText = () => Promise.reject()` en la consola): aviso con alternativa manual.
- [ ] Regeneración que falla (ej. sin red): aparece el error; al volver la red, lo que se muestra coincide con el token guardado en la base (nunca un enlace que ya no existe como "Activo").
- [ ] `member` (creado a mano en la base): ve su familia sin opciones de invitar.
- [ ] Llamar a `create_household_invite` como `member` o anónimo desde la consola: error.
- [ ] Todo el flujo solo con teclado.

## Bloqueado / pendiente fuera de esta historia

- [ ] Entrar a `/household` con una sesión iniciada en el login real (`/login`, SCRUM-45, que llegó con la sincronización del 2026-10-03). Las pruebas de SCRUM-56 se hicieron antes, con un usuario de prueba creado en Supabase Auth.
- [ ] Enlazar `/household` desde el Perfil (HU-30), el sidebar y el onboarding cuando existan.
- [ ] HU-34 (SCRUM-57): `/invitacion/[token]` y aceptar la invitación. No es parte de esta historia.
- [ ] Integrar households con `lists`, `recipes` y `household_store_preferences`: otras historias o dueños.

## Pendiente cuando el proyecto tenga runner de tests

El runner (Vitest) ya está en `develop` desde SCRUM-128 (PR #36, 2026-10-03). Estos tests de SCRUM-56 siguen pendientes y no son parte de SCRUM-57.

- [ ] Tests del Facade y de `useHouseholdInvite` (crear household, generar, regenerar, respuestas fuera de orden, fallo con relectura del enlace vigente, expirar, copiar con éxito y con fallo) y Page Object de `Household`, según unit-testing-standards.

## SCRUM-57: unirse a una familia con el enlace

Cada etapa termina en un commit (ver [plan.md](plan.md#commits-y-pr)) que compila por sí solo, y se revisa y aprueba antes de seguir. El PR se abre con el commit de la etapa 1 y queda en `in progress` hasta la etapa 9.

> **Orden real (2026-10-05):** la capa Web (etapas 4 a 7) se hizo antes de aplicar la migración (etapa 3). Mientras la RPC no existió, `acceptHouseholdInvite` fue solo el contrato; después de aplicar la `014` se conectó a la RPC real (4.3). Los commits agrupan las etapas así: (1) constantes + `extractInviteToken`, (2) contrato del servicio + ViewModel, (3) página y ruta, (4) formulario en `/household`, (5) docs de vencimiento.

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Actualizar `specs/SPEC.md` (subsecciones SCRUM-57 en las 15 secciones), `specs/plan.md` (sección SCRUM-57) y `specs/tasks.md` (esta sección).
- [x] 1.2 Revisión y aprobación de la documentación (aprobada al commitear `2d0340a`).
- [x] 1.3 Commit `docs(SCRUM-57): add join household spec, plan and tasks` (`2d0340a`), push y abrir el PR hacia `develop` con label `in progress`: PR #43.
- [x] 1.4 Sincronizar la rama con `develop` (merge `c4f4245`, 2026-10-04): trae Vitest, Playwright, el `SessionGuard` y la migración `012`. `tsc`, lint, `npm test` y build pasan.
- [x] 1.5 Ajustar SPEC, plan y tasks a lo que trajo `develop`: tests obligatorios, `SessionGuard` mergeado, migración provisional `014`, E2E como decisión pendiente.
- [x] 1.6 Revisión y aprobación de 1.5; commit `docs(SCRUM-57): align plan with merged test runner and session guard` (`d48bdfd`).

### Etapa 2 — Migración (commit `feat`)

- [x] 2.1 Revisar otra vez el número libre en `develop` y en las ramas abiertas. Revisado el 2026-10-05: `develop` llega a la `012`, la rama de SCRUM-97 usa la `013` y no hay rama con la renumeración de la `011`. Confirmado: `014`.
- [x] 2.2 Escribir `supabase/migrations/014_accept_household_invite.sql` con encabezado (ticket, qué hace, por qué) y la RPC de [plan.md](plan.md#datos-1): cuenta registrada, formato, `for share`, vencimiento con `clock_timestamp()`, `on conflict (user_id) do nothing`, guarda si la membresía desaparece (`P0001`) y los 5 resultados.
- [x] 2.3 `revoke execute` de `public` y `anon`, `grant` a `authenticated`; sin políticas ni permisos de tabla nuevos.
- [x] 2.4 Revisión del SQL con el subagente `security-reviewer` (dos rondas, 2026-10-05): sin hallazgos críticos, altos ni bajos después de aplicar `clock_timestamp()` y la guarda del caso nulo; queda como deuda la falta de rate limit (Media, ya aprobada).
- [ ] 2.5 Revisión y aprobación de la migración; commit.

### Etapa 3 — Aplicar y tipos (commit `feat`)

- [x] 3.1 La dueña de la historia aplica la migración en el SQL Editor de la base compartida (con aprobación explícita) y avisa al equipo.
- [x] 3.2 Verificar en la base: la función existe, es `security definer`, `search_path` vacío, `authenticated` la ejecuta y `anon` no (`pg_proc`, `has_function_privilege`).
- [x] 3.3 Probar la RPC simulando usuarios con `rollback` (casos de [plan.md](plan.md#cómo-se-prueba-la-rpc)).
- [x] 3.4 Agregar `accept_household_invite` a `types/database.types.ts` a mano y compararlo con la firma real: verificada en el SQL Editor (`accept_household_invite(invite_token text) → text`).
- [ ] 3.5 Revisión y aprobación; commit.

### Etapa 4 — Constantes, util y servicio (commit `feat`)

- [x] 4.1 Constantes en `household.constants.ts`: `HOUSEHOLD_DB.RPC.ACCEPT_HOUSEHOLD_INVITE`, `HOUSEHOLD_JOIN_RESULT` (+ tipo), `HOUSEHOLD_JOIN_STATUS`, `HOUSEHOLD_JOIN_TEXT`, `HOUSEHOLD_JOIN_FORM_ERROR`, patrón del token, `HOUSEHOLD_ROUTE.HOUSEHOLD` y `LOGIN` (claves en orden alfabético, `as const`).
- [x] 4.2 `utils/extractInviteToken.ts`: enlace completo (con barra final, query o fragmento) o código solo → token; si no, `null`.
- [x] 4.3 `acceptHouseholdInvite(inviteToken)` en `household.service.ts`: llama a la RPC solo con `{ invite_token }`, acota el resultado a `HouseholdJoinResultType` con una type guard y lanza error ante un valor desconocido, sin incluir el token en el mensaje.
- [x] 4.4 Tests de `extractInviteToken` (10 casos) y de `household.service.ts` con el cliente de Supabase mockeado: los 5 resultados, la llamada solo con el token, valor desconocido, error de Supabase y `hasRegisteredSession` (sin sesión, anónima, registrada).
- [x] 4.5 `npx tsc --noEmit`, `npm run lint` y `npm test`; commit `feat(SCRUM-57): add invite token extraction and join constants`.

### Etapa 5 — ViewModel de la página (commit `feat`)

- [x] 5.1 `hooks/useHouseholdInvitationViewModel.ts`: formato → sesión (`hasRegisteredSession`, nunca `ensureSession`) con bandera de cancelación; `onJoin` con guarda `useRef`; mapa resultado → estado; `failed` ante error.
- [x] 5.2 Test de `useHouseholdInvitationViewModel` con `renderHook` y el servicio mockeado: formato inválido, sin cuenta, cada resultado, doble clic y falla.
- [x] 5.3 `npx tsc --noEmit`, `npm run lint` y `npm test`; commit `feat(SCRUM-57): add invitation view model and service contract` (incluye el contrato del servicio).

### Etapa 6 — Página y ruta (commit `feat`)

- [x] 6.1 `HouseholdInvitation.tsx`: solo presentación; `role="status"` y `role="alert"` siempre montadas; `Link` a `/login` y a `/household`; el token no se muestra.
- [x] 6.2 `app/invitacion/[token]/page.tsx`: ruta delgada (`await params`), metadata con título y `referrer: "no-referrer"`.
- [x] 6.3 `tests/HouseholdInvitation.page.ts` (Page Object, sin `expect`) y `tests/HouseholdInvitation.test.tsx` (jsdom).
- [x] 6.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`; commit `feat(SCRUM-57): add invitation page and route`.

### Etapa 7 — Formulario en `/household` (commit `feat`)

- [x] 7.1 `hooks/useHouseholdJoinForm.ts`: valor, error, `extractInviteToken`, navegar a `/invitacion/<token>`.
- [x] 7.2 `components/HouseholdJoinForm.tsx` y `components/models/HouseholdJoinFormProps.interface.ts` (solo presentación, `Input` y `Button`).
- [x] 7.3 `useHouseholdViewModel` compone el hook y entrega `join`; `Household.tsx` muestra el formulario en el estado sin familia, junto a "Crea tu familia".
- [x] 7.4 Test de `useHouseholdJoinForm` (router mockeado): vacío y sin token no navegan; enlace o código navegan a `/invitacion/<token>`.
- [x] 7.5 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`; commit `feat(SCRUM-57): add household invitation form`.

### Etapa 8 — Pruebas y documentación (commits `test` y `docs`)

- [x] 8.1 Completar los tests de [plan.md](plan.md#pruebas) que no hayan entrado en las etapas 4 a 7 y comprobar que cada CA de SPEC §13 tenga al menos un test (camino feliz + un caso negativo o límite como mínimo, CONTRIBUTING §7); commit `test` si hace falta. Obligatorio.
- [x] 8.2 Pruebas manuales de [SPEC §13](SPEC.md#hu-34-scrum-57) con cuentas registradas de prueba, con capturas sin el token. Las sesiones se cargaron desde la consola porque `/login` no funciona en local sin la clave de reCAPTCHA (SPEC §15).
- [x] 8.3 `docs/documento-proyecto.md` §4.1 y §6 ([plan.md](plan.md#documento-del-proyecto)); commit `docs`.
- [x] 8.4 Marcar en SPEC §13 y en esta lista solo lo que se validó; commit `docs`.

### Etapa 9 — Revisiones y QA

- [x] 9.1 Volver a revisar el número de la migración contra `develop` y renombrar si hace falta: revisado el 2026-10-06, `develop` llega a la `012` y la rama de SCRUM-97 usa la `013`; la `014` sigue libre.
- [x] 9.2 `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` (lo mismo que corre el CI).
- [x] 9.3 Subagentes `code-reviewer`, `security-reviewer` y `qa-checker` (2026-10-06): sin hallazgos de seguridad ni de estructura; se aplicaron sus correcciones menores (nombre de constante, comentarios, tests de `hasRegisteredSession`).
- [ ] 9.4 Completar la descripción del PR con la plantilla (en inglés), pasos de prueba y evidencia; pasar a `waiting qa` y mover la tarjeta de Jira en el mismo momento.
- [ ] 9.5 Merge solo con `qa accepted` puesto por otra persona.

### Coordinación con otras historias

- [ ] SCRUM-49 (`SessionGuard`, Esteban; ya en `develop`, apagado por defecto): acordar qué pasa con `/invitacion/<token>` cuando se encienda (no está en `PUBLIC_ROUTES` y la lista no admite rutas dinámicas). Propuesta en [plan.md](plan.md#riesgos-y-deuda-conocida).
- [x] E2E (Playwright, SCRUM-129): decidido que SCRUM-57 no lleva E2E (necesitaría cuentas registradas de prueba en la base compartida); ver SPEC §15. Propuesta en [plan.md](plan.md#pruebas).
- [ ] SCRUM-45 (login, Esteban): proponer el retorno al enlace después del login como mejora aparte.
- [ ] QA: confirmar el número final de la migración cuando se resuelva la renumeración de la `011`.

### Fuera de esta historia

- [ ] Salir de la familia (HU-34c, SCRUM-58).
- [ ] Decidir qué pasa con la lista personal al unirse (HU-34b, SCRUM-59).
- [ ] Vista previa del nombre de la familia antes de aceptar.

## SCRUM-58: salir de la familia

Cada etapa termina en un commit (ver [plan.md](plan.md#commits-y-pr-1)) que compila por sí solo, y se revisa y aprueba antes de seguir. El PR (nuevo, no el #43) se abre con el commit de la etapa 1 y queda en `in progress` hasta la etapa 8.

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Agregar SCRUM-58 a `specs/SPEC.md` (subsecciones en las 15 secciones), `specs/plan.md` y `specs/tasks.md`.
- [x] 1.2 Revisión y aprobación de la documentación.
- [x] 1.3 Commit `docs(SCRUM-58): add leave household spec, plan and tasks`, push y abrir el PR hacia `develop` con label `in progress` (la tarjeta de Jira en In Progress). PR #63.

### Etapa 2 — Migración (commits `feat` y `test`)

- [x] 2.1 Revisar otra vez el número libre en `develop` y en los PRs abiertos (al 2026-10-10: `develop` llega a la `019`; `020`–`022` en ramas abiertas; propuesta `023`).
- [x] 2.2 Escribir `supabase/migrations/023_leave_household.sql` con encabezado (ticket, qué hace, por qué): `get_household_members()` y `leave_household(new_admin_user_id)` según [plan.md](plan.md#datos-2) (bloqueos, relectura, resultados), `revoke`/`grant`, sin políticas ni permisos de tabla nuevos.
- [x] 2.3 Escribir `supabase/tests/023_leave_household.test.sql` con los casos de [plan.md](plan.md#cómo-se-aplica-y-se-prueba-la-migración).
- [x] 2.4 Revisión del SQL con el subagente `security-reviewer`; aprobación; commit de la migración y su prueba (uno solo: `feat(SCRUM-58): add leave household RPCs and SQL tests`).

### Etapa 3 — Aplicar y tipos (commit `feat`)

- [x] 3.1 La dueña de la historia avisa al grupo y aplica la migración en el SQL Editor **junto con su fila** en `supabase_migrations.schema_migrations` (procedimiento de `supabase/README.md`).
- [x] 3.2 Comprobar que el historial coincide con `migrations/`.
- [x] 3.3 Correr completo `supabase/tests/023_leave_household.test.sql`.
- [x] 3.4 Agregar `get_household_members` y `leave_household` a `types/database.types.ts` a mano y compararlos con la firma real (`pg_proc`). Comparados con `023_leave_household.sql` y con la consulta a `pg_proc` (la dueña de la historia).
- [x] 3.5 Commit.

### Etapa 4 — Constantes, modelo y servicio (commit `feat`)

- [x] 4.1 Constantes que usa el servicio: nombres de las RPC y `HOUSEHOLD_LEAVE_RESULT` (+ tipo), con claves en orden alfabético y `as const`. `HOUSEHOLD_LEAVE_STATUS`, `HOUSEHOLD_LEAVE_TEXT` y "Miembro sin nombre" se agregan en las etapas 5 y 6, donde se usan.
- [x] 4.2 `models/HouseholdMember.interface.ts`.
- [x] 4.3 `getHouseholdMembers()` y `leaveHousehold(newAdminUserId)` en `household.service.ts`, con type guards para el rol y el resultado, sin correos ni datos sensibles en los errores.
- [x] 4.4 Tests del servicio con el cliente de Supabase mockeado.
- [x] 4.5 `npx tsc --noEmit`, `npm run lint` y `npm test`; revisión y aprobación; commit.

### Etapa 5 — ViewModel (commit `feat`)

- [x] 5.1 `HOUSEHOLD_LEAVE_STATUS` y `HOUSEHOLD_LEAVE_DIALOG_CASE` (+ tipos) en las constantes y `hooks/useHouseholdLeave.ts`: unión de estados, carga de miembros solo para el admin, elegido, confirmar con guarda `useRef`, mapa resultado → estado, cancelar.
- [x] 5.2 Test de `useHouseholdLeave` con el servicio mockeado ([plan.md](plan.md#pruebas-1)).
- [ ] 5.3 `npx tsc --noEmit`, `npm run lint` y `npm test`; revisión y aprobación; commit. Las comprobaciones pasan (etapas 5 y 6 implementadas juntas); faltan la revisión y el commit.

### Etapa 6 — Diálogo y pantalla (commit `feat`)

- [x] 6.1 `HOUSEHOLD_LEAVE_TEXT` (con "Miembro sin nombre"), `HOUSEHOLD_LEAVE_DIALOG_DESCRIPTION` y `HOUSEHOLD_LEAVE_FORM` en las constantes y `components/HouseholdLeaveDialog.tsx` y sus props: solo presentación, `Modal`, radios nativos en `fieldset` con `legend` y `label`.
- [x] 6.2 `useHouseholdViewModel` compone `useHouseholdLeave` y vuelve a leer la membresía al salir; `Household.tsx` muestra la sección "Salir de la familia" para miembro y admin.
- [x] 6.3 Page Object y tests de interfaz: `tests/HouseholdLeave.page.ts` (un solo Page Object para la sección y el diálogo, sin `expect`) y `tests/HouseholdLeave.test.tsx` (jsdom: el diálogo solo y la pantalla completa). Se unieron con los de `HouseholdLeaveDialog` después de la revisión, sin quitar ningún test.
- [ ] 6.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`; revisión y aprobación; commit. Las comprobaciones pasan; faltan la revisión y el commit.

### Etapa 7 — Pruebas y documentación (commit `docs`)

- [x] 7.1 Comprobar que cada CA de SPEC §13 (HU-34c) tenga al menos un test (camino feliz + un caso negativo o límite, CONTRIBUTING §7).
- [ ] 7.2 Pruebas manuales de CA-01 a CA-04 con cuentas de prueba; capturas sin correos ni datos sensibles. **Pendiente: las ejecuta la dueña de la historia.**
- [x] 7.3 `docs/documento-proyecto.md` §4.1 y §6 ([plan.md](plan.md#documento-del-proyecto-1)).
- [ ] 7.4 Marcar en SPEC §13 y en esta lista solo lo que se validó; commit `docs`.

### Etapa 8 — Revisiones y QA

- [x] 8.1 Traer `develop` con un merge (la rama no se rebasea: ya está publicada) y volver a revisar el número de la migración. Al 2026-10-11 `develop` no avanzó desde el último merge (no hace falta otro) y ninguna otra rama usa la `023`.
- [x] 8.2 `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`. Pasan todos (595 tests).
- [ ] 8.3 Subagentes `code-reviewer`, `security-reviewer` y `qa-checker`; corregir en commits `fix(SCRUM-58): …`. Primera pasada hecha antes del commit de las etapas 5 y 6, con los hallazgos confirmados ya corregidos (aviso de salida que no se borraba, "elige a otra" sin nadie a quien elegir, tests de cancelación que no podían fallar, `not_member` y falla al salir en la pantalla, aviso buscado en `role="status"`, un solo act por test, nombres del Page Object, tabla de pruebas del plan). Pasada final de `code-reviewer` hecha: las correcciones están bien y sus dos hallazgos bajos (Escape desde el Page Object, test de radios con dos acciones) se corrigieron en un commit `fix`. La revisión de `security-reviewer` sigue vigente (después no cambió nada de sesión, permisos ni datos). Falta `qa-checker` sobre la evidencia del QA manual.
- [ ] 8.4 Completar la descripción del PR con la plantilla (en inglés), pasos de prueba y evidencia; pasar a `waiting qa` y mover la tarjeta de Jira en el mismo momento.
- [ ] 8.5 Merge solo con `qa accepted` puesto por otra persona.

### Fuera de esta historia

- [ ] Qué pasa con las listas compartidas al salir (contrato para HU-34b, SCRUM-59).
- [ ] Ver a todos los miembros (HU-35, SCRUM-60) y eliminar miembros (HU-36).
- [ ] Borrado de cuenta del único administrador (deuda M1).

## SCRUM-59: decidir qué hacer con la lista personal

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir. El PR se abre con el commit de la etapa 1, con label `on hold` mientras la #63 (SCRUM-58) esté `in progress` ([plan.md](plan.md#dependencias-y-gitflow)).

### Etapa 0 — Decisiones y aprobaciones (antes de implementar)

- [x] 0.1 Decisiones de producto D1 a D9 de la dueña de la historia (2026-10-10), registradas en SPEC §5.
- [x] 0.2 T1: reglas para compartir (cantidades, tachados, compras y requisitos de receta). Implementadas con la propuesta (SPEC §5); la dueña de la historia las confirma en la revisión del PR.
- [x] 0.3 T2: qué se puede hacer con la lista personal después de "Mantener". Implementado: sección de solo lectura en `/lista`; confirmar en la revisión.
- [x] 0.4 T3: qué pasa con la lista de la familia cuando la familia se elimina, y si se actualiza la prueba SQL de SCRUM-58. Implementado: la lista se va con la familia; las recetas y los planes quedan personales; prueba de la `023` actualizada.
- [x] 0.5 T4: si el modo compra sobre la lista de la familia entra en la parte A. Funciona sin cambios, con compras personales; el gasto de la familia es HU-38.
- [ ] 0.6 T5 y D7: el equipo aprueba (o no) separar la parte A en otro ticket; se registra en Jira y en `docs/sprints.md`. **Pendiente:** la parte A quedó implementada en esta rama.
- [x] 0.7 D5 y D6: diseño de dónde se guarda la decisión y qué conserva quien sale, coordinado con SCRUM-58. `household_members.personal_lists_decision` (se borra al salir); quien sale pierde el acceso por la RLS y conserva su lista personal.

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Agregar SCRUM-59 a `specs/SPEC.md` (subsecciones en las 15 secciones), `specs/plan.md` y `specs/tasks.md`.
- [x] 1.2 Revisión y aprobación de la documentación.
- [x] 1.3 Commit `docs(SCRUM-59): add personal list decision planning` (`28bde3a`), push y abrir el PR hacia `develop` con el título `feat(SCRUM-59): manage personal lists when joining a household` y label `on hold`: PR #64.

### Etapa 2 — Plan detallado (después de la etapa 0)

- [x] 2.1 Completar en plan.md archivos, datos, contratos de RPC, concurrencia y commits de la parte A y de la parte B.
- [x] 2.2 Revisar otra vez el número de la migración: al 2026-10-11 la `024` está libre en `develop` y en las ramas remotas (la `020` y la `021` son de SCRUM-131).
- [x] 2.3 Traer `develop` con un merge cuando la #63 esté mergeada (`03b3b07`) y resolver los conflictos de los specs conservando las dos historias. El merge dejó separadores `=======` y líneas perdidas; los tres specs se reconstruyeron el 2026-10-11 ([plan.md](plan.md#dependencias-y-gitflow)).

### Etapa 3 — Implementación (2026-10-11)

- [x] 3.1 Migración `024_household_lists.sql` (partes A y B) y su prueba `supabase/tests/024_household_lists.test.sql`; paso 8 de la prueba de la `023` actualizado.
- [x] 3.2 Tipos en `types/database.types.ts`, escritos a mano a partir de la `024`.
- [ ] 3.3 Comparar los tipos con la firma real (`pg_proc`) después de aplicar la `024`.
- [x] 3.4 Servicio, constantes y `usePersonalListsDecision` con sus tests; mocks de los tests existentes de household.
- [x] 3.5 `PersonalListsDecision` en `/household` (después de crear) y en `/invitacion/<token>` (después de unirse), con Page Object y tests.
- [x] 3.6 `/lista`: `getGeneralList` usa `find_general_list_id`; sección de solo lectura "Mi lista personal"; test del servicio.
- [x] 3.7 `npx tsc --noEmit`, `npm run lint`, `npm test` (639 tests) y `npm run build` pasan; `git diff --check` limpio.

### Etapa 4 — Aplicar la migración (la dueña de la historia)

- [x] 4.1 `security-reviewer` sobre la `024` antes de aplicarla (2026-10-11): sin hallazgos críticos ni altos; los de la prueba y los refuerzos menores se corrigieron; las dos medias y tres bajas quedan como decisión o deuda en [plan.md](plan.md#riesgos).
- [ ] 4.2 Aplicar la `024` con su fila del historial ([plan.md](plan.md#cómo-se-aplica-y-se-prueba-la-024)).
- [ ] 4.3 Correr `024_household_lists.test.sql` y otra vez `023_leave_household.test.sql`.
- [ ] 4.4 Verificar de solo lectura las políticas y las firmas.

### Etapa 5 — QA y cierre

- [ ] 5.1 Pruebas manuales de CA-01 a CA-05 con cuentas registradas de prueba (dos o tres), con capturas sin correos ni tokens. Incluye la regresión de `/lista`, el modo compra, las recetas y el plan.
- [ ] 5.2 E2E de `/lista` (`features/shopping-list/specs/E2E.md`) contra la base con la `024` aplicada.
- [x] 5.3 `docs/documento-proyecto.md` §4.1, §4.2 y §6.
- [ ] 5.4 Revisiones `code-reviewer`, `security-reviewer` (final) y `qa-checker`.
- [ ] 5.5 Marcar en SPEC §13 solo lo validado; descripción del PR #64; `waiting qa` y Jira.

### Fuera de esta historia

- [ ] Conservar la lista de una sesión anónima al registrarse (ticket aparte, SCRUM-49).
- [ ] Tarea técnica: que borrar la cuenta de quien creó la lista de la familia no la borre para todos ([plan.md](plan.md#riesgos)).
- [ ] Tarea técnica: tope de cantidad en `list_items` y en las funciones que agregan; no reabrir filas compradas por otro al agregar (HU-38 / `shopping-list`).
- [ ] Sublistas por fecha y listas privadas.
- [ ] HU-35, HU-36 y HU-38.


## SCRUM-60: consultar a los integrantes de la familia

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir. El PR se abre con el commit de la etapa 1 y queda en `in progress` hasta el final.

### Etapa 0 — Decisiones

- [x] 0.1 Decisiones de producto de la dueña de la historia (2026-10-17): iniciales o ícono genérico, cualquier miembro consulta su familia, 20 por página con "Cargar más", búsqueda automática con debounce, etiqueta "Tú" (SPEC §5).

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Agregar SCRUM-60 a `specs/SPEC.md` (subsecciones en las 15 secciones), `specs/plan.md`, `specs/tasks.md` y `docs/documento-proyecto.md` §4.1.
- [ ] 1.2 Revisión y aprobación de la documentación.
- [x] 1.3 Commit `docs(SCRUM-60): add household members list planning`, push y abrir el PR hacia `develop` con label `in progress` (PR #68).

### Etapa 2 — Migración (commit `feat`)

- [x] 2.1 Revisar otra vez el número libre (`025`).
- [x] 2.2 Escribir `025_household_members_page.sql` con los requisitos de seguridad de [plan.md](plan.md#datos-3) y su prueba SQL.
- [x] 2.3 Revisión con `security-reviewer`; aprobación; commit (`0bc8f8c`).
- [x] 2.4 La dueña de la historia la aplica con su fila del historial y corre la prueba SQL: aplicada y registrada; la prueba terminó en `ok`.

### Etapa 3 — Tipos (commit `feat`)

- [x] 3.1 `get_household_members_page` en `types/database.types.ts`, comparado con `pg_proc` (la firma coincidió).

### Etapa 4 — Servicio y ViewModel (commit `feat`)

- [x] 4.1 Constantes: RPC, tamaño de página, debounce, estados y textos. `GET_HOUSEHOLD_MEMBERS_PAGE`, `HOUSEHOLD_MEMBERS_PAGE` (20 por página, debounce de 300 ms, tope de 60 caracteres), `HOUSEHOLD_MEMBERS_LOAD_MORE_STATUS` y `HOUSEHOLD_MEMBERS_TEXT` (título, búsqueda, etiquetas, cantidad, sin resultados, errores, reintento y "Cargar más").
- [x] 4.2 `getHouseholdMembersPage` y sus tests (con el modelo `HouseholdMembersPage`).
- [x] 4.3 `useHouseholdMembers` y sus tests. Incluye que, al cambiar de familia, nunca se ve a nadie de la anterior mientras carga la nueva.

### Etapa 5 — Pantalla (commit `feat`)

- [x] 5.1 `HouseholdMembersSection` y sus props, con `toMemberInitials` para el avatar.
- [x] 5.2 Integración en `useHouseholdViewModel` y `Household.tsx`.
- [x] 5.3 Page Object y tests (jsdom): `HouseholdMembers.page.ts`, `HouseholdMembers.test.tsx` y `toMemberInitials.test.ts`.
- [x] 5.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` (2026-10-17): los cuatro sin errores; Vitest completo, 796 tests en 86 archivos.

### Etapa 6 — QA y cierre

- [ ] 6.1 Pruebas manuales de CA-01 a CA-03 con cuentas registradas de prueba, con capturas sin correos.
- [ ] 6.2 `docs/documento-proyecto.md` §6 y marcar SPEC §13 solo con lo validado.
- [ ] 6.3 `code-reviewer`, `security-reviewer` y `qa-checker`.
- [ ] 6.4 Descripción del PR, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] La foto real del perfil (HU-30).
- [ ] Eliminar miembros (HU-36).

## SCRUM-61: eliminar a un integrante de la familia

Cada etapa termina en un commit que compila por sí solo y se revisa y aprueba antes de seguir. El PR se abre con el commit de la etapa 1, en `on hold` mientras SCRUM-60 (#68) no esté en `develop`.

### Etapa 0 — Decisiones

- [x] 0.1 Decisiones de la dueña de la historia (2026-10-18): D1 (el enlace no se invalida porque es uno por familia; limitación documentada), D2 (sin notificaciones) y textos de D3 (SPEC §5, §7 y §8).

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Agregar SCRUM-61 a `specs/SPEC.md` (subsecciones en las 15 secciones), `specs/plan.md`, `specs/tasks.md` y `docs/documento-proyecto.md` §4.1.
- [x] 1.2 Revisión y aprobación de la documentación (la dueña de la historia confirmó las decisiones y pidió implementar, 2026-10-19).
- [x] 1.3 Commit `docs(SCRUM-61): add household member removal planning` (`d6df4e2`), push y abrir el PR hacia `develop` con label `on hold` (PR #69).

### Etapa 2 — Después del merge de SCRUM-60

- [x] 2.1 Traer `develop` a esta rama; resolver los conflictos de los specs conservando las subsecciones de las dos historias (`e5dd9c4`; sin marcas de conflicto, las dos historias en los tres specs).
- [x] 2.2 Pasar el PR a `in progress` (y Jira). El PR #69 está en `in progress`.

### Etapa 3 — Migración (commit `feat`)

- [x] 3.1 Revisar otra vez el número libre (`026`). Libre el 2026-10-19 en `develop` y en todas las ramas remotas.
- [x] 3.2 Escribir `026_remove_household_member.sql` con lo de [plan.md](plan.md#scrum-61-eliminar-a-un-integrante-de-la-familia) y su prueba SQL (`supabase/tests/026_remove_household_member.test.sql`). La prueba pasa en PGlite, con la `011` real y las políticas reales de `lists` y `list_items` de la `024`, y detecta las mutaciones de autorización.
- [ ] 3.3 Revisión con `security-reviewer`; aprobación; commit.
  - Hecho (2026-10-19): `security-reviewer`, sin hallazgos críticos ni altos.
    - Medio: el enlace no rota. Es la limitación aceptada en D1 (SPEC §5).
    - Bajo, corregido: el chequeo de admin va antes que el de «a sí mismo».
    - Casos agregados a la prueba: `search_path` fijo, un miembro contra el admin y un miembro con su propio id.
  - Falta: tu aprobación y el commit.
- [x] 3.4 La dueña de la historia la aplica con su fila del historial y corre la prueba SQL. Hecho el 2026-10-19:
  - aplicada y verificada: devuelve `text`, `security definer`, `search_path` vacío y `execute` solo para `authenticated`;
  - con `plpgsql.check_asserts` en `on`, la prueba completa terminó en `ok`.

### Etapa 4 — Tipos y servicio (commit `feat`)

- [x] 4.1 `remove_household_member` en `types/database.types.ts`, comparado con `pg_proc` (`member_user_id uuid` → `text`, verificado en la base el 2026-10-19).
- [x] 4.2 Constantes del servicio (`HOUSEHOLD_DB.RPC.REMOVE_HOUSEHOLD_MEMBER`, `HOUSEHOLD_REMOVE_MEMBER_RESULT`), `removeHouseholdMember` y sus tests (`tests/household.service.test.ts`).

### Etapa 5 — Hook (commit `feat`)

- [x] 5.1 Constantes del flujo y `useHouseholdMemberRemoval` con sus tests.
  - Constantes: `HOUSEHOLD_REMOVE_MEMBER_STATUS` y `HOUSEHOLD_REMOVE_MEMBER_TEXT`, con los textos de D3.
  - Tests: `tests/useHouseholdMemberRemoval.test.ts` (confirmar, cancelar, los cuatro resultados, error y reintento, doble clic, pantalla cerrada).

### Etapa 6 — Pantalla (commit `feat`)

- [x] 6.1 `HouseholdRemoveMemberDialog` y sus props; "Eliminar integrante" en las filas de `HouseholdMembersSection` (nombre accesible «Eliminar integrante {nombre}»; el foco va al título de la sección después de eliminar).
- [x] 6.2 Integración en `useHouseholdViewModel` y `Household.tsx`: el botón solo para el admin y nunca en su fila; `onMembersChanged` recarga la lista y `onAdminLost` vuelve a leer la membresía; el aviso va en la zona `role="status"`.
- [x] 6.3 Page Object y tests (jsdom): `tests/HouseholdRemoveMember.page.ts` y `tests/HouseholdRemoveMember.test.tsx` (15 tests). Incluye una regresión: la fila propia del admin nunca tiene el botón, aunque la lista lo muestre con rol `member`; falla si se quita la regla «nunca en la fila propia».
- [x] 6.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` (2026-10-19): los cuatro sin errores; Vitest completo, 860 tests en 92 archivos; el build genera `/household`.

### Etapa 7 — QA y cierre

- [x] 7.1 Pruebas manuales de CA-01 a CA-04 con tres cuentas registradas de prueba, con capturas sin correos. Hecho por la dueña de la historia (2026-10-19):
  - CA-01, con captura: el admin ve «Eliminar integrante» en las filas de B y C, y no en la suya;
  - CA-02, con captura: «Cancelar» cierra el diálogo sin eliminar a nadie;
  - CA-04, con captura: al eliminar aparece el aviso de éxito y B desaparece de la familia;
  - CA-03, **sin captura** (comprobado funcionalmente): como B, perdió el acceso a la familia y conserva sus datos personales.
- [x] 7.2 `docs/documento-proyecto.md` §4.1 y §6, y marcar SPEC §13 solo con lo validado (2026-10-19). En §13 están marcados los casos que validan la prueba SQL en la base y los tests; CA-01 a CA-04, la concurrencia y «Generar enlace nuevo» esperan la prueba manual.
- [ ] 7.3 `code-reviewer`, `security-reviewer` y `qa-checker`.
  - Hecho (2026-10-19): las tres revisiones, sin hallazgos críticos ni altos.
    - Corregido: el diálogo nombra igual que la fila (`utils/toMemberLabel.ts`; con un nombre de solo espacios mostraba un texto vacío), dos comentarios de `titleFocusKey` y el orden de `removeDialog`.
    - Tests agregados: la fila de otro admin sin botón, Escape mientras elimina y el nombre de solo espacios.
    - Anotado en SPEC §15: sin E2E y la concurrencia.
  - Falta: la aprobación de la dueña de la historia sobre las correcciones.
- [ ] 7.4 Descripción del PR, `waiting qa` y Jira.

### Fuera de esta historia

- [ ] Notificar a la persona eliminada.
- [ ] Impedir que vuelva a unirse (lista de bloqueados).