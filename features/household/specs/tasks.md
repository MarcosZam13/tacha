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

- [ ] Tests del Facade y de `useHouseholdInvite` (crear household, generar, regenerar, respuestas fuera de orden, fallo con relectura del enlace vigente, expirar, copiar con éxito y con fallo) y Page Object de `Household`, según unit-testing-standards.
