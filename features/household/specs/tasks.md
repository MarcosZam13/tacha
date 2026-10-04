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
- [x] 6.4 Crear `app/household/page.tsx` (una línea + metadata).
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

### Etapa 1 — Specs (commit `docs`)

- [x] 1.1 Actualizar `specs/SPEC.md` (subsecciones SCRUM-57 en las 15 secciones), `specs/plan.md` (sección SCRUM-57) y `specs/tasks.md` (esta sección).
- [ ] 1.2 Revisión y aprobación de la documentación.
- [x] 1.3 Commit `docs(SCRUM-57): add join household spec, plan and tasks` (`2d0340a`), push y abrir el PR hacia `develop` con label `in progress`: PR #43.
- [x] 1.4 Sincronizar la rama con `develop` (merge `c4f4245`, 2026-10-04): trae Vitest, Playwright, el `SessionGuard` y la migración `012`. `tsc`, lint, `npm test` y build pasan.
- [x] 1.5 Ajustar SPEC, plan y tasks a lo que trajo `develop`: tests obligatorios, `SessionGuard` mergeado, migración provisional `014`, E2E como decisión pendiente.
- [ ] 1.6 Revisión y aprobación de 1.5; commit `docs`.

### Etapa 2 — Migración (commit `feat`)

- [ ] 2.1 Revisar otra vez el número libre en `develop` y en las ramas abiertas (al 2026-10-04: `012` en `develop`, `013` en la rama de SCRUM-97, renumeración de la `011` anunciada por QA sin rama; propuesta provisional `014`); confirmar el número con la dueña de la historia.
- [ ] 2.2 Escribir `supabase/migrations/014_accept_household_invite.sql` (o el número confirmado en 2.1) con encabezado (ticket, qué hace, por qué) y la RPC de [plan.md](plan.md#datos-1): cuenta registrada, formato, `for share`, vencimiento, `on conflict (user_id) do nothing`, resultados.
- [ ] 2.3 `revoke execute` de `public` y `anon`, `grant` a `authenticated`; sin políticas ni permisos de tabla nuevos.
- [ ] 2.4 Revisión del SQL con el subagente `security-reviewer`.
- [ ] 2.5 Revisión y aprobación de la migración; commit.

### Etapa 3 — Aplicar y tipos (commit `feat`)

- [ ] 3.1 La dueña de la historia aplica la migración en el SQL Editor de la base compartida (con aprobación explícita) y avisa al equipo.
- [ ] 3.2 Verificar en la base: la función existe, es `security definer`, `search_path` vacío, `authenticated` la ejecuta y `anon` no (`pg_proc`, `has_function_privilege`).
- [ ] 3.3 Probar la RPC simulando usuarios con `rollback` (casos de [plan.md](plan.md#cómo-se-prueba-la-rpc)).
- [ ] 3.4 Agregar `accept_household_invite` a `types/database.types.ts` a mano y compararlo con la firma real.
- [ ] 3.5 Revisión y aprobación; commit.

### Etapa 4 — Constantes, util y servicio (commit `feat`)

- [ ] 4.1 Constantes en `household.constants.ts`: `HOUSEHOLD_DB.RPC.ACCEPT_HOUSEHOLD_INVITE`, `HOUSEHOLD_JOIN_RESULT` (+ tipo), `HOUSEHOLD_JOIN_STATUS`, `HOUSEHOLD_JOIN_TEXT`, `HOUSEHOLD_JOIN_FORM_ERROR`, patrón del token, `HOUSEHOLD_ROUTE.HOUSEHOLD` y `LOGIN` (claves en orden alfabético, `as const`).
- [ ] 4.2 `utils/extractInviteToken.ts`: enlace completo (con barra final, query o fragmento) o código solo → token; si no, `null`.
- [ ] 4.3 `acceptHouseholdInvite(inviteToken)` en `household.service.ts`: llama a la RPC, acota el resultado a `HouseholdJoinResultType` y lanza error ante un valor desconocido.
- [ ] 4.4 Tests de `extractInviteToken` y de `acceptHouseholdInvite` (cliente de Supabase mockeado), según [plan.md](plan.md#pruebas).
- [ ] 4.5 `npx tsc --noEmit`, `npm run lint` y `npm test`; revisión y aprobación; commit.

### Etapa 5 — ViewModel de la página (commit `feat`)

- [ ] 5.1 `hooks/useHouseholdInvitationViewModel.ts`: formato → sesión (`hasRegisteredSession`, nunca `ensureSession`) con bandera de cancelación; `onJoin` con guarda `useRef`; mapa resultado → estado; `failed` ante error.
- [ ] 5.2 Test de `useHouseholdInvitationViewModel` con `renderHook` y el servicio mockeado: formato inválido, sin cuenta, cada resultado, doble clic y falla.
- [ ] 5.3 `npx tsc --noEmit`, `npm run lint` y `npm test`; revisión y aprobación; commit.

### Etapa 6 — Página y ruta (commit `feat`)

- [ ] 6.1 `HouseholdInvitation.tsx`: solo presentación; `role="status"` y `role="alert"` siempre montadas; `Link` a `/login` y a `/household`; el token no se muestra.
- [ ] 6.2 `app/invitacion/[token]/page.tsx`: ruta delgada (`await params`), metadata con título y `referrer: "no-referrer"`.
- [ ] 6.3 `tests/HouseholdInvitation.page.ts` (Page Object, sin `expect`) y `tests/HouseholdInvitation.test.tsx` (jsdom).
- [ ] 6.4 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`; revisión y aprobación; commit.

### Etapa 7 — Formulario en `/household` (commit `feat`)

- [ ] 7.1 `hooks/useHouseholdJoinForm.ts`: valor, error, `extractInviteToken`, navegar a `/invitacion/<token>`.
- [ ] 7.2 `components/HouseholdJoinForm.tsx` y `components/models/HouseholdJoinFormProps.interface.ts` (solo presentación, `Input` y `Button`).
- [ ] 7.3 `useHouseholdViewModel` compone el hook y entrega `join`; `Household.tsx` muestra el formulario en el estado sin familia, junto a "Crea tu familia".
- [ ] 7.4 Test de `useHouseholdJoinForm` (router mockeado): vacío y sin token no navegan; enlace o código navegan a `/invitacion/<token>`.
- [ ] 7.5 `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build`; revisión y aprobación; commit.

### Etapa 8 — Pruebas y documentación (commits `test` y `docs`)

- [ ] 8.1 Completar los tests de [plan.md](plan.md#pruebas) que no hayan entrado en las etapas 4 a 7 y comprobar que cada CA de SPEC §13 tenga al menos un test (camino feliz + un caso negativo o límite como mínimo, CONTRIBUTING §7); commit `test` si hace falta. Obligatorio.
- [ ] 8.2 Pruebas manuales de [SPEC §13](SPEC.md#hu-34-scrum-57) con dos cuentas registradas que entran por `/login`; capturas sin el token.
- [ ] 8.3 `docs/documento-proyecto.md` §4.1 y §6 ([plan.md](plan.md#documento-del-proyecto)); commit `docs`.
- [ ] 8.4 Marcar en SPEC §13 y en esta lista solo lo que se validó; commit `docs`.

### Etapa 9 — Revisiones y QA

- [ ] 9.1 Volver a revisar el número de la migración contra `develop` y renombrar si hace falta.
- [ ] 9.2 `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` (lo mismo que corre el CI).
- [ ] 9.3 Subagentes `code-reviewer`, `security-reviewer` y `qa-checker`; corregir en commits `fix(SCRUM-57): …`.
- [ ] 9.4 Completar la descripción del PR con la plantilla (en inglés), pasos de prueba y evidencia; pasar a `waiting qa` y mover la tarjeta de Jira en el mismo momento.
- [ ] 9.5 Merge solo con `qa accepted` puesto por otra persona.

### Coordinación con otras historias

- [ ] SCRUM-49 (`SessionGuard`, Esteban; ya en `develop`, apagado por defecto): acordar qué pasa con `/invitacion/<token>` cuando se encienda (no está en `PUBLIC_ROUTES` y la lista no admite rutas dinámicas). Propuesta en [plan.md](plan.md#riesgos-y-deuda-conocida).
- [ ] E2E (Playwright, SCRUM-129): decidir con el equipo si SCRUM-57 lleva E2E; hoy necesitaría cuentas registradas de prueba en la base compartida. Propuesta en [plan.md](plan.md#pruebas).
- [ ] SCRUM-45 (login, Esteban): proponer el retorno al enlace después del login como mejora aparte.
- [ ] QA: confirmar el número final de la migración cuando se resuelva la renumeración de la `011`.

### Fuera de esta historia

- [ ] Salir de la familia (HU-34c, SCRUM-58).
- [ ] Decidir qué pasa con la lista personal al unirse (HU-34b, SCRUM-59).
- [ ] Vista previa del nombre de la familia antes de aceptar.
