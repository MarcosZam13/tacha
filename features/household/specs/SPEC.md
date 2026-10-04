# Feature: Household — crear familia y enlace de invitación

Historia: [SCRUM-56 / HU-33](https://tacha.atlassian.net/browse/SCRUM-56) (crear link de invitación al household). La historia que **usa** el enlace es [SCRUM-57 / HU-34](https://tacha.atlassian.net/browse/SCRUM-57) (unirse a un household por link), fuera de esta entrega. El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md).

Terminología: en el código, la base y la ruta se usa `household`; en la interfaz, en español, se muestra **"familia"** y **"enlace"** (el texto de la historia dice "household" y "link").

## 1. Objetivo

Que el administrador de una familia (household) genere un enlace de invitación persistente y con vencimiento, para que otras personas se unan sin invitarlas una por una por correo. El enlace se guarda en la base, sigue disponible al recargar la página, se puede copiar y regenerar, y al regenerarlo el anterior deja de existir.

Como ninguna otra historia crea households y sin uno no hay administrador, esta historia incluye la **creación mínima de la familia**: un usuario registrado sin familia escribe un nombre y queda como administrador.

## 2. Alcance

Qué sí incluye:

- La pantalla "Mi familia" en la ruta `/household`.
- Crear la familia con un nombre: la RPC `create_household(household_name)` crea el registro en `households` y la membresía `admin` de quien la crea, en una sola transacción.
- Generar el enlace de invitación (`create_household_invite()`), mostrarlo con su fecha de vencimiento, copiarlo y regenerarlo.
- Recuperar el enlace guardado al volver a la pantalla (`get_household_invite()`), también si ya venció.
- Mostrar el enlace vencido como "Expirado" y ofrecer generar uno nuevo.
- Persistencia y control de acceso en Supabase: tablas, RLS, permisos y las tres RPC de `supabase/migrations/011_create_households_and_invites.sql`.

Qué no incluye: ver §14.

## 3. Entradas

- Sesión del navegador: `getSupabaseClient().auth.getSession()`. Solo cuenta como cuenta registrada si hay sesión y `session.user.is_anonymous` no es `true`.
- Nombre de la familia: `string`, escrito en el formulario.
- Acciones del usuario:
  - `onCreateSubmit: (event: FormEvent<HTMLFormElement>) => void` — crear la familia.
  - `onGenerate: () => void` — generar o regenerar el enlace.
  - `onCopy: () => void` — copiar el enlace.
- Respuestas de Supabase:
  - membresía propia: `household_members` con `role` y `households(name)`;
  - `create_household_invite()` y `get_household_invite()`: filas con `token` (uuid) y `expires_at` (timestamptz).

## 4. Salidas

- Llama a `create_household(household_name)`, `create_household_invite()` y `get_household_invite()`. Ninguna recibe `household_id` ni `user_id`.
- Muestra el estado de la pantalla según la sesión y la membresía (§6).
- Muestra el enlace como `<origen>/invitacion/<token>`, su estado ("Activo" / "Expirado") y la fecha de vencimiento en formato `es-CR` (por ejemplo, "8 de octubre de 2026 a las 10:01 p. m.").
- Copia el enlace al portapapeles con `navigator.clipboard.writeText`.
- Muestra mensajes de confirmación en una zona `role="status"` y errores en `role="alert"`.

## 5. Reglas de negocio

- Solo un usuario con sesión registrada (no anónima) puede crear o administrar una familia. La pantalla lo decide con `getSession()` y nunca llama a `ensureSession()`, así que abrirla no crea usuarios anónimos. Las RPC rechazan igual a quien no tenga `auth.uid()` o sea anónimo.
- Un usuario pertenece como máximo a una familia: `household_members.user_id` es la clave primaria.
- El nombre de la familia es obligatorio y tiene como máximo 60 caracteres, medido sin los espacios de los bordes. El formulario lo valida antes de enviar y la base lo garantiza con `households_name_check`.
- Quien crea la familia queda con `role = 'admin'`, en la misma transacción que crea la familia.
- Solo el administrador puede generar o ver el enlace: `create_household_invite()` y `get_household_invite()` verifican `role = 'admin'` dentro de la función.
- Hay un solo enlace por familia: `household_invite_links.household_id` es la clave primaria.
- El token lo genera la base con `gen_random_uuid()` y el vencimiento es `now() + interval '7 days'`. El cliente no envía ni el token ni la fecha.
- Regenerar reemplaza la fila de la familia en una sola operación (`insert … on conflict (household_id) do update`): el token anterior deja de existir y la fecha vuelve a ser 7 días desde ese momento.
- `get_household_invite()` devuelve el enlace aunque esté vencido, para poder mostrar "Expirado". No filtra por `expires_at`.
- "Activo" o "Expirado" se calcula en el navegador comparando `expires_at` con la hora actual, solo para mostrarlo. La validez real del token al usarlo es de HU-34.
- Si llegan dos respuestas de generación fuera de orden, solo se guarda la del último pedido (contador en `useRef`).
- Si una generación falla, no se da por bueno el enlace anterior: se vuelve a leer el enlace vigente con `get_household_invite()`. Si la base tiene uno nuevo, la generación sí ocurrió y no se muestra error; si tiene el mismo o ninguno, se muestra el error; si la lectura también falla, no se muestra ningún enlace como válido.
- No se puede copiar un enlace vencido ni mientras se genera uno nuevo.

## 6. Estados

Estados de la pantalla (`HOUSEHOLD_SCREEN_STATUS`):

- `loading`: se está leyendo la sesión y la membresía.
- `loadFailed`: no se pudo leer la membresía. Se muestra el error con la indicación de recargar la página; no hay botón de reintento.
- `noAccount`: sin sesión o con sesión anónima.
- `noHousehold`: usuario registrado sin familia; se muestra el formulario.
- `creating`: se está creando la familia.
- `member`: pertenece a una familia sin ser administrador.
- `admin`: es el administrador; se muestra la sección de invitación.

Estados del enlace (`HOUSEHOLD_INVITE_STATUS`), solo para el administrador:

- `loading`, `loadFailed`, `empty` (todavía no hay enlace), `generating` (conserva el enlace anterior mientras llega el nuevo) y `ready` (hay enlace).
- `loadFailed` también se alcanza si falla una generación y además falla la relectura del enlace vigente. En ese estado no se muestra ningún enlace ni botón: el mensaje indica recargar la página.
- Con `ready`, "Activo" o "Expirado" es un valor derivado del vencimiento, no un estado guardado.

Estado de la copia (`HOUSEHOLD_INVITE_COPY_STATUS`): `idle`, `copied` (vuelve a `idle` a los 2 s) y `failed`.

## 7. Errores

| Situación | Mensaje visible |
|---|---|
| No se pudo leer la familia | "No se pudo cargar tu familia. Recarga la página para intentarlo de nuevo." |
| Nombre vacío | "Escribe el nombre de tu familia." |
| Nombre de más de 60 caracteres | "El nombre puede tener hasta 60 caracteres." |
| Falló la creación (incluido un segundo intento si ya tiene familia) | "No se pudo crear tu familia. Intenta de nuevo." |
| No se pudo leer el enlace (al entrar, o al releerlo después de una generación fallida) | "No se pudo cargar el enlace de invitación. Recarga la página para intentarlo de nuevo." |
| Falló la generación | "No se pudo generar el enlace. Intenta de nuevo." |
| El navegador no permitió copiar | "No se pudo copiar. Selecciona el enlace y cópialo manualmente." |

Los errores de Supabase no se muestran crudos: se traducen a estos textos. El error de creación se borra al escribir en el campo o al volver a intentar.

Los errores de carga no tienen botón de reintento: el mensaje indica recargar la página. Los de crear y generar sí se reintentan con el mismo botón del formulario o de la tarjeta.

## 8. UI esperada

- Título "Mi familia" y, si pertenece a una, el nombre de la familia debajo.
- Sin cuenta: "Necesitas una cuenta registrada para crear o administrar tu familia."
- Sin familia: sección "Crea tu familia" con el texto "Crea tu familia en Tacha para compartir tus listas. Vas a quedar como administrador.", el campo "Nombre de la familia" (ejemplo "Ej. Familia Alpízar") y el botón "Crear mi familia" ("Creando…" mientras crea).
- Miembro: "Solo el administrador de la familia puede invitar a otras personas."
- Administrador: sección "Invitar a mi familia" con el texto "Genera un enlace para que tu familia se una sin invitar a cada persona por correo." y:
  - sin enlace: botón "Generar enlace de invitación" ("Generando…" mientras genera);
  - con enlace: tarjeta "Enlace de invitación" con el chip "Activo" o "Expirado", el enlace completo, "Vence" o "Venció" con la fecha, el botón "Copiar enlace" (solo si está activo) y el botón "Generar nuevo enlace" (principal si está expirado).
- Confirmaciones: "¡Copiado!" y "Generaste un enlace nuevo. El anterior dejó de funcionar."
- Componentes compartidos: `Button`, `Chip`, `Input` y `Spinner` de `@/components/ui`, con los tokens `tacha-*`.

## 9. Accesibilidad

- Jerarquía de títulos: `h1` "Mi familia", `h2` por sección y `h3` en la tarjeta del enlace.
- El campo del nombre tiene su `label` visible ("Nombre de la familia") y muestra el error debajo.
- La zona `role="status"` con `aria-live="polite"` está siempre montada en `Household.tsx`, para que el lector de pantalla anuncie "¡Copiado!" y el aviso de reemplazo aunque la tarjeta cambie. Los errores van en `role="alert"`.
- El estado del enlace se lee como texto ("Activo" / "Expirado"), no depende solo del color.
- El enlace se muestra como texto seleccionable de un click (`select-all`), para copiarlo a mano si falla el portapapeles.
- Los botones son nativos (`Button`), con textos claros, y se deshabilitan mientras crean o generan.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind con los tokens `tacha-*`; sin colores hex nuevos.
- Patrón ViewModel: los `.tsx` solo presentan; la lógica vive en `useHouseholdViewModel` (pantalla, sesión, membresía, formulario) y `useHouseholdInvite` (enlace, vencimiento, copia).
- Sin textos sueltos: todos los textos y nombres de RPC y tablas están en `features/household/constants/household.constants.ts`.
- Sin dependencias nuevas, sin Edge Functions, sin cron y sin seeds.
- Acceso a datos solo con el cliente de `services/supabase.client.ts`, usando `getSession()` y no `ensureSession()`.
- `types/database.types.ts` tiene las entradas de la migración 011 escritas a mano y verificadas contra la base real (columnas, tipos, `NOT NULL`, defaults y firmas de las tres RPC).
- La membresía se lee filtrando por el usuario de la sesión, además de lo que permite RLS.

## 11. Dependencias

- `app/household/page.tsx` — ruta delgada.
- `features/household/Household.tsx` — pantalla.
- `features/household/components/HouseholdCreateForm.tsx` y `HouseholdInviteLinkCard.tsx`, con sus props en `components/models/`.
- `features/household/hooks/useHouseholdViewModel.ts` y `useHouseholdInvite.ts`.
- `features/household/services/household.service.ts`.
- `features/household/models/HouseholdInvite.interface.ts` y `HouseholdMembership.interface.ts`.
- `features/household/constants/household.constants.ts`.
- `@/components/ui` (`Button`, `Chip`, `Input`, `Spinner`), `@/constants` (`BUTTON_VARIANT`, `CHIP_TONE`), `services/supabase.client.ts` y `types/database.types.ts`.

## 12. Contratos externos

Supabase, migración `supabase/migrations/011_create_households_and_invites.sql`:

- `public.households`: `id` uuid PK, `name` text (1–60 caracteres), `created_at`.
- `public.household_members`: `user_id` uuid PK → `auth.users` (cascade), `household_id` → `households` (cascade), `role` `'admin'` o `'member'`, `created_at`.
- `public.household_invite_links`: `household_id` uuid PK → `households` (cascade), `token` uuid único, `expires_at`, `created_at`.
- RLS activado en las tres tablas. Políticas: `"user reads own membership"` (cada usuario lee su fila) y `"member reads own household"` (lee el household al que pertenece). Ninguna política en `household_invite_links`.
- Permisos: `revoke all` a `public`, `anon` y `authenticated` en las tres tablas; después, solo `select` a `authenticated` en `households` y `household_members`.
- RPC, todas `security definer` con `set search_path = ''`, ejecutables solo por `authenticated`:
  - `create_household(household_name text) returns uuid`;
  - `create_household_invite() returns table (token uuid, expires_at timestamptz)`;
  - `get_household_invite() returns table (token uuid, expires_at timestamptz)`.
- Ruta futura del enlace: `/invitacion/<token>`. Esta historia solo arma el texto del enlace; la página es de HU-34.

## 13. Casos de aceptación

Validados a mano en `http://localhost:3000/household`, con la migración aplicada en la base compartida y una sesión de un usuario de prueba de Supabase Auth, en dos rondas:

- **2026-10-01:** sin sesión, crear la familia y CA-01 a CA-05, **antes** de pasar los textos de la interfaz al español.
- **2026-10-02:** se repitió el camino feliz con los textos actuales en español: la interfaz muestra "familia" y "enlace", aparece la fecha de vencimiento, "Copiar enlace" muestra "¡Copiado!", "Generar nuevo enlace" genera uno nuevo, el enlace se mantiene al recargar y un enlace expirado se muestra "Expirado" y permite generar uno nuevo. Después de regenerar se comprobó directamente en la base que el token anterior ya no existe y que queda una sola fila de invitación para la familia.

Los casos borde, los negativos, los de otros roles y la entrada con el login real (`/login`) no se probaron todavía (ver [tasks.md](tasks.md#pruebas-manuales-npm-run-dev-httplocalhost3000household)).

- [x] **Sin sesión:** la pantalla indica que se necesita una cuenta registrada.
- [x] **Crear la familia:** con un nombre válido se crea la familia y quien la crea pasa a ser administrador; aparece la sección de invitación.
- [x] **CA-01:** el administrador tiene la opción para invitar a su familia y generar el enlace de invitación. Se accede desde `/household`: la pantalla de Perfil (HU-30) no existe todavía, así que enlazarla desde ahí queda pendiente.
- [x] **CA-02:** el enlace generado aparece "Activo" con su fecha de vencimiento, 7 días después de generarlo.
- [x] **CA-03:** el enlace se muestra listo para copiar; "Copiar enlace" lo copia y aparece la confirmación "¡Copiado!".
- [x] **CA-04:** "Generar nuevo enlace" genera uno nuevo y avisa que el anterior dejó de funcionar; al recargar la página se recupera el nuevo, no el anterior. En la base queda una sola fila de invitación y el token anterior ya no existe (comprobado el 2026-10-02). Que el token anterior sea rechazado cuando alguien intente usarlo lo implementa HU-34.
- [x] **CA-05:** con el vencimiento del enlace de prueba movido al pasado en la base, la pantalla lo muestra "Expirado" con la opción de generar uno nuevo; al generarlo vuelve a "Activo" y sigue así después de recargar.

## 14. Casos fuera de alcance

- HU-34 (SCRUM-57): abrir o pegar el enlace, la ruta `/invitacion/[token]`, aceptar la invitación, validar el token al usarlo, agregar miembros mediante el enlace, confirmación de unión y onboarding del miembro.
- HU-34b, HU-34c, HU-35 y HU-36: decidir qué pasa con la lista personal, salir de la familia o transferir el rol de administrador, ver o eliminar miembros.
- Editar, renombrar o eliminar una familia.
- Invitaciones por correo, historial de invitaciones y más de un enlace activo por familia.
- La pantalla de Perfil (HU-30), el sidebar y el onboarding.
- Login (SCRUM-45) y `/registro/verificado`: no se modifican.
- Integrar households con `lists`, `recipes` y `household_store_preferences`.
- Seeds, cron, Edge Functions y dependencias nuevas.

## 15. Notas de implementación

- **Número de la migración:** es la `011` porque la `009` (SCRUM-123, `009_close_store_preferences_writes.sql`) y la `010` (SCRUM-96, `010_delete_recipes.sql`) ya existen en `develop`. Se escribió primero como `010` y se renombró al sincronizar la rama con `develop` el 2026-10-03. En la base compartida ya estaba aplicada: el nombre del archivo no cambia nada ahí.
- **Cómo se obtuvo la sesión de prueba:** cuando se probó (2026-10-01 y 2026-10-02), el login (SCRUM-45) todavía no estaba en la rama de SCRUM-56. Se creó un usuario confirmado en Supabase Auth y su sesión se cargó en el navegador. El login (`/login`) entró con la sincronización del 2026-10-03; probar `/household` entrando por ahí queda pendiente.
- **Límite de otra historia (detectado el 2026-09-29):** `/registro/verificado` no guardaba la sesión del usuario que verifica su correo. Ya no impide llegar con una cuenta registrada: desde la sincronización del 2026-10-03 existe el login (`/login`, SCRUM-45).
- **Deuda para HU-34/HU-34c (M1):** si se borra la cuenta del único administrador, su membresía se borra pero la familia y su enlace quedan.
- **Tests automáticos:** el proyecto no tiene runner de tests; los casos de §13 se validaron a mano.
