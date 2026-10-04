# Feature: Household — crear familia, enlace de invitación y unirse

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-56 / HU-33](https://tacha.atlassian.net/browse/SCRUM-56): crear link de invitación al household. Sprint 2, mergeada.
- [SCRUM-57 / HU-34](https://tacha.atlassian.net/browse/SCRUM-57): unirse a un household por link. Sprint 2, en curso.

El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md).

Terminología: en el código, la base y la ruta se usa `household`; en la interfaz, en español, se muestra **"familia"** y **"enlace"** (el texto de las historias dice "household" y "link").

## 1. Objetivo

### SCRUM-56

Que el administrador de una familia (household) genere un enlace de invitación persistente y con vencimiento, para que otras personas se unan sin invitarlas una por una por correo. El enlace se guarda en la base, sigue disponible al recargar la página, se puede copiar y regenerar, y al regenerarlo el anterior deja de existir.

Como ninguna otra historia crea households y sin uno no hay administrador, esta historia incluye la **creación mínima de la familia**: un usuario registrado sin familia escribe un nombre y queda como administrador.

### SCRUM-57

Que una persona con cuenta registrada use el enlace (o el código) que le compartió el administrador para entrar a esa familia como miembro, sin más pasos que confirmar con un botón. Si el enlace venció, ya no existe o la persona ya tiene familia, se le explica qué pasó y no se toca ninguna membresía.

## 2. Alcance

### SCRUM-56

Qué sí incluye:

- La pantalla "Mi familia" en la ruta `/household`.
- Crear la familia con un nombre: la RPC `create_household(household_name)` crea el registro en `households` y la membresía `admin` de quien la crea, en una sola transacción.
- Generar el enlace de invitación (`create_household_invite()`), mostrarlo con su fecha de vencimiento, copiarlo y regenerarlo.
- Recuperar el enlace guardado al volver a la pantalla (`get_household_invite()`), también si ya venció.
- Mostrar el enlace vencido como "Expirado" y ofrecer generar uno nuevo.
- Persistencia y control de acceso en Supabase: tablas, RLS, permisos y las tres RPC de `supabase/migrations/011_create_households_and_invites.sql`.

### SCRUM-57

- La página de invitación en la ruta `/invitacion/<token>`, que es la que ya arman los enlaces de SCRUM-56 (`HOUSEHOLD_ROUTE.INVITATION`).
- Al abrirla **no** se une a nadie automáticamente: muestra que hay una invitación y un botón **"Unirme"**.
- Al confirmar, una RPC nueva (`accept_household_invite`, [§12](#12-contratos-externos)) valida el token y su vencimiento con el reloj de la base y, si corresponde, agrega a quien llama como `member` de la familia del enlace.
- Mensajes claros para cada resultado: se unió, ya era de esa familia, ya tiene otra familia, el enlace venció o no es válido.
- Sin cuenta registrada (sin sesión o con sesión anónima): mensaje, botón a `/login` y la indicación de volver a abrir el enlace después de iniciar sesión.
- Después de unirse: confirmación y botón **"Ir a mi familia"** a `/household` (sin redirección automática).
- En `/household`, cuando el usuario no tiene familia: la opción **"Unirme con una invitación"**, junto a "Crea tu familia" (DESIGN.md §7.15). Acepta el enlace completo o solo el código, extrae el token y navega a `/invitacion/<token>`: la unión ocurre en un solo lugar.

Lo que no incluye ninguna de las dos está en la [sección 14](#14-casos-fuera-de-alcance).

## 3. Entradas

### SCRUM-56

- Sesión del navegador: `getSupabaseClient().auth.getSession()`. Solo cuenta como cuenta registrada si hay sesión y `session.user.is_anonymous` no es `true`.
- Nombre de la familia: `string`, escrito en el formulario.
- Acciones del usuario:
  - `onCreateSubmit: (event: FormEvent<HTMLFormElement>) => void` — crear la familia.
  - `onGenerate: () => void` — generar o regenerar el enlace.
  - `onCopy: () => void` — copiar el enlace.
- Respuestas de Supabase:
  - membresía propia: `household_members` con `role` y `households(name)`;
  - `create_household_invite()` y `get_household_invite()`: filas con `token` (uuid) y `expires_at` (timestamptz).

### SCRUM-57

| Entrada | Tipo | De dónde |
|---|---|---|
| `token` | `string` | Segmento dinámico de `/invitacion/[token]` (`params` de la ruta) |
| Sesión registrada | `boolean` | `hasRegisteredSession()` del servicio de household (reutilizado de SCRUM-56) |
| `onJoin` | `() => void` | Botón "Unirme" de la página de invitación |
| Texto pegado | `string` | Campo "Enlace o código de invitación" en `/household` |
| `onJoinSubmit` | `(event: FormEvent<HTMLFormElement>) => void` | Formulario "Unirme con una invitación" |
| Resultado de la RPC | `HouseholdJoinResultType` | `accept_household_invite(invite_token)` ([§12](#12-contratos-externos)) |

## 4. Salidas

### SCRUM-56

- Llama a `create_household(household_name)`, `create_household_invite()` y `get_household_invite()`. Ninguna recibe `household_id` ni `user_id`.
- Muestra el estado de la pantalla según la sesión y la membresía (§6).
- Muestra el enlace como `<origen>/invitacion/<token>`, su estado ("Activo" / "Expirado") y la fecha de vencimiento en formato `es-CR` (por ejemplo, "8 de octubre de 2026 a las 10:01 p. m.").
- Copia el enlace al portapapeles con `navigator.clipboard.writeText`.
- Muestra mensajes de confirmación en una zona `role="status"` y errores en `role="alert"`.

### SCRUM-57

- Llama a `accept_household_invite(invite_token)` **solo** cuando el usuario con cuenta registrada pulsa "Unirme". Lo único que manda el cliente es el token.
- Si el resultado es `joined`, la base tiene una fila nueva en `household_members` con `user_id = auth.uid()`, el `household_id` del enlace y `role = 'member'`. Con cualquier otro resultado, no cambia ninguna membresía.
- Muestra el mensaje del resultado ([§7](#7-errores) y [§8](#8-ui-esperada)).
- Desde `/household`, navega a `/invitacion/<token>` con el token extraído del texto pegado.
- Nunca muestra el token en pantalla ni lo escribe en la consola.

## 5. Reglas de negocio

### SCRUM-56

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

### SCRUM-57

1. **Solo cuentas registradas.** La página decide con `hasRegisteredSession()` (usa `getSession()`, nunca `ensureSession()`): abrir el enlace no crea usuarios anónimos. Una sesión anónima cuenta igual que no tener sesión. La RPC rechaza igual a quien no tenga `auth.uid()` o tenga `is_anonymous` en el JWT.
2. **El cliente solo manda el token.** `user_id` sale de `auth.uid()`, `household_id` sale de la fila del enlace y `role` es siempre `'member'`. Ningún valor de esos tres llega desde el cliente.
3. **Validez del enlace:** el token tiene que existir en `household_invite_links` y su `expires_at` tiene que ser posterior a `now()` de la base. El reloj del navegador no decide nada.
4. **Formato:** un token que no tiene formato de UUID es `invalid`, sin consultar la tabla. La página lo detecta antes de mostrar "Unirme" y la RPC lo vuelve a comprobar (no confía en el cliente).
5. **Enlace regenerado:** el token anterior ya no existe en la base (SCRUM-56, regla de regenerar), así que da `invalid`. Esto cierra lo que SCRUM-56 dejó para HU-34 en su CA-04.
6. **El enlace sirve para varias personas** mientras esté vigente: aceptarlo no lo consume ni lo cambia.
7. **Una familia por usuario (CA-05):** si quien acepta ya es de **esa** familia, el resultado es `already_member` y no se inserta nada; si es de **otra**, el resultado es `in_other_household` y no se inserta nada. La garantía final es la clave primaria `household_members.user_id`, no la interfaz.
8. **Atómico:** validar el enlace, revisar la membresía e insertar ocurren en una sola llamada a la base (una transacción). La fila del enlace se bloquea mientras tanto (`for share`), así que una regeneración simultánea espera a que termine la aceptación.
9. **Doble clic o dos pestañas:** el botón se deshabilita mientras se procesa y la página ignora un segundo clic; si igual llegan dos llamadas, la segunda encuentra la membresía creada por la primera y responde `already_member`. Nunca se crean dos filas.
10. **Confirmar antes de unirse:** abrir `/invitacion/<token>` no llama a la RPC; solo el botón "Unirme" lo hace.
11. **Sin vista previa:** la página no muestra el nombre de la familia antes de aceptar (no hay RPC de preview en esta historia).
12. **Formulario de `/household`:** acepta el enlace completo (`<origen>/invitacion/<token>`, con o sin barra final, query o fragmento) o solo el código. Si el texto está vacío o no contiene un token con formato de UUID, muestra el error en el campo y no navega.

## 6. Estados

### SCRUM-56

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

### SCRUM-57

Página de invitación (`HOUSEHOLD_JOIN_STATUS`), una unión derivada de constantes, no varios booleanos:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `checking` | Leyendo la sesión al abrir | Spinner |
| `loadFailed` | No se pudo leer la sesión | Error con la indicación de recargar |
| `noAccount` | Sin sesión o sesión anónima | Aviso + botón a `/login` |
| `ready` | Cuenta registrada y token con formato válido | Texto de invitación + "Unirme" |
| `joining` | Esperando la RPC | "Uniéndote…", botón deshabilitado |
| `joined` | RPC → `joined` | Confirmación + "Ir a mi familia" |
| `alreadyMember` | RPC → `already_member` | Aviso + "Ir a mi familia" |
| `inOtherHousehold` | RPC → `in_other_household` | Aviso de salir primero + "Ir a mi familia" |
| `expired` | RPC → `expired` | Aviso de enlace vencido |
| `invalid` | Token sin formato de UUID, o RPC → `invalid` | Aviso de enlace no válido |
| `failed` | Error de red o de la base al aceptar | Error + "Unirme" para reintentar |

Un token sin formato válido va directo a `invalid`, antes de mirar la sesión: no hay nada que aceptar.

Formulario "Unirme con una invitación": solo el error del campo (`NullableUndefined<string>`); al ser válido, navega.

## 7. Errores

### SCRUM-56

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

### SCRUM-57

Textos propuestos (se confirman al escribir las constantes; viven en `household.constants.ts`):

| Situación | Mensaje visible |
|---|---|
| No se pudo leer la sesión | "No se pudo comprobar tu sesión. Recarga la página para intentarlo de nuevo." |
| Sin cuenta registrada | "Necesitas una cuenta registrada para unirte a una familia. Inicia sesión y después vuelve a abrir este enlace." |
| Enlace vencido | "Este enlace de invitación venció. Pídele uno nuevo a quien te invitó." |
| Enlace no válido (no existe, fue reemplazado o está mal copiado) | "Este enlace de invitación no es válido. Revisa que esté completo o pide uno nuevo." |
| Ya es de otra familia | "Ya perteneces a una familia. Para unirte a otra, primero tienes que salir de la tuya." |
| Falló la unión (red o base) | "No se pudo completar la unión. Intenta de nuevo." |
| Formulario vacío | "Pega el enlace o el código de invitación." |
| Formulario sin token válido | "Ese enlace o código no es válido. Revisa que esté completo." |

- Los errores de Supabase no se muestran crudos.
- "Falló la unión" se reintenta con el mismo botón "Unirme"; si la primera llamada sí llegó a la base, el reintento responde `already_member` y la página lo muestra como tal.
- La carga de la sesión no tiene botón de reintento, igual que SCRUM-56: el mensaje indica recargar.
- "Ya es de esa familia" no es un error: se muestra como aviso informativo ([§8](#8-ui-esperada)).

## 8. UI esperada

### SCRUM-56

- Título "Mi familia" y, si pertenece a una, el nombre de la familia debajo.
- Sin cuenta: "Necesitas una cuenta registrada para crear o administrar tu familia."
- Sin familia: sección "Crea tu familia" con el texto "Crea tu familia en Tacha para compartir tus listas. Vas a quedar como administrador.", el campo "Nombre de la familia" (ejemplo "Ej. Familia Alpízar") y el botón "Crear mi familia" ("Creando…" mientras crea).
- Miembro: "Solo el administrador de la familia puede invitar a otras personas."
- Administrador: sección "Invitar a mi familia" con el texto "Genera un enlace para que tu familia se una sin invitar a cada persona por correo." y:
  - sin enlace: botón "Generar enlace de invitación" ("Generando…" mientras genera);
  - con enlace: tarjeta "Enlace de invitación" con el chip "Activo" o "Expirado", el enlace completo, "Vence" o "Venció" con la fecha, el botón "Copiar enlace" (solo si está activo) y el botón "Generar nuevo enlace" (principal si está expirado).
- Confirmaciones: "¡Copiado!" y "Generaste un enlace nuevo. El anterior dejó de funcionar."
- Componentes compartidos: `Button`, `Chip`, `Input` y `Spinner` de `@/components/ui`, con los tokens `tacha-*`.

### SCRUM-57

Página `/invitacion/<token>` (textos propuestos):

- Título "Invitación a una familia".
- `ready`: "Te invitaron a unirte a una familia en Tacha. Al unirte vas a compartir listas con ella." y el botón **"Unirme"** ("Uniéndote…" mientras procesa).
- `noAccount`: el aviso de §7 y un enlace con estilo de botón **"Iniciar sesión"** a `/login`.
- `joined`: "¡Listo! Ya eres parte de la familia." y un enlace con estilo de botón **"Ir a mi familia"** a `/household`.
- `alreadyMember`: "Ya eres parte de esta familia." e "Ir a mi familia".
- `inOtherHousehold`: el aviso de §7 e "Ir a mi familia" (allí está la familia actual; salir es HU-34c).
- `expired` / `invalid` / `failed` / `loadFailed`: el mensaje de §7.
- El token no aparece en ninguna parte de la página.

`/household`, estado `noHousehold` (DESIGN.md §7.15, dos acciones igual de visibles):

- La sección "Crea tu familia" de SCRUM-56, sin cambios.
- Una sección **"Unirme con una invitación"** con el texto "Pega el enlace o el código que te compartieron.", el campo "Enlace o código de invitación" y el botón "Continuar".

Componentes compartidos: `Button`, `Input` y `Spinner` de `@/components/ui`; la navegación con `Link` de `next/link` con las clases del botón (como `RecipeCard`). Tokens `tacha-*`.

## 9. Accesibilidad

### SCRUM-56

- Jerarquía de títulos: `h1` "Mi familia", `h2` por sección y `h3` en la tarjeta del enlace.
- El campo del nombre tiene su `label` visible ("Nombre de la familia") y muestra el error debajo.
- La zona `role="status"` con `aria-live="polite"` está siempre montada en `Household.tsx`, para que el lector de pantalla anuncie "¡Copiado!" y el aviso de reemplazo aunque la tarjeta cambie. Los errores van en `role="alert"`.
- El estado del enlace se lee como texto ("Activo" / "Expirado"), no depende solo del color.
- El enlace se muestra como texto seleccionable de un click (`select-all`), para copiarlo a mano si falla el portapapeles.
- Los botones son nativos (`Button`), con textos claros, y se deshabilitan mientras crean o generan.

### SCRUM-57

- `h1` "Invitación a una familia" en la página; en `/household`, `h2` "Unirme con una invitación", al mismo nivel que "Crea tu familia".
- El resultado de la unión se anuncia en una zona `role="status"` siempre montada (mismo criterio que SCRUM-56: una región que nace junto con su mensaje puede no anunciarse); los errores en `role="alert"`.
- El campo "Enlace o código de invitación" tiene `label` visible y muestra el error debajo.
- "Unirme" se deshabilita mientras procesa y cambia su texto a "Uniéndote…".
- "Iniciar sesión" e "Ir a mi familia" son enlaces (`Link`), porque navegan; "Unirme" y "Continuar" son botones, porque ejecutan una acción.
- Todo el flujo se puede hacer solo con teclado.

## 10. Restricciones técnicas

### SCRUM-56

- TypeScript estricto, sin `any`.
- Tailwind con los tokens `tacha-*`; sin colores hex nuevos.
- Patrón ViewModel: los `.tsx` solo presentan; la lógica vive en `useHouseholdViewModel` (pantalla, sesión, membresía, formulario) y `useHouseholdInvite` (enlace, vencimiento, copia).
- Sin textos sueltos: todos los textos y nombres de RPC y tablas están en `features/household/constants/household.constants.ts`.
- Sin dependencias nuevas, sin Edge Functions, sin cron y sin seeds.
- Acceso a datos solo con el cliente de `services/supabase.client.ts`, usando `getSession()` y no `ensureSession()`.
- `types/database.types.ts` tiene las entradas de la migración 011 escritas a mano y verificadas contra la base real (columnas, tipos, `NOT NULL`, defaults y firmas de las tres RPC).
- La membresía se lee filtrando por el usuario de la sesión, además de lo que permite RLS.

### SCRUM-57

- Todo lo de SCRUM-56 aplica igual.
- La ruta `app/invitacion/[token]/page.tsx` es delgada: lee `params` (en Next 16 llega como `Promise`, como `app/recetas/[id]/editar/page.tsx`), declara la metadata y renderiza la pantalla de la feature. Sin lógica.
- La ruta se mantiene en `/invitacion/<token>`: los enlaces ya generados por SCRUM-56 apuntan ahí.
- La pantalla, su ViewModel y el formulario viven en `features/household/`; no se crea otra feature (la página usa el mismo servicio, las mismas constantes y la misma ruta que SCRUM-56).
- La página es de cliente porque la sesión de Supabase vive en el navegador; la seguridad real está en la RPC.
- La metadata de la página fija `referrer: "no-referrer"`, para que el token de la URL no viaje en la cabecera `Referer` si la página carga algo externo o se sale de ella con un enlace.
- La extracción del token es una función pura en `features/household/utils/`, con el patrón de UUID como constante.
- Sin cambios en el login (SCRUM-45) ni parámetro `next` de retorno.
- La migración nueva no toca la `011` ni ninguna otra existente.
- Tests automáticos con Vitest (`npm test`, ya en `develop` desde SCRUM-128), en `features/household/tests/`: como mínimo el camino feliz y un caso negativo o límite (CONTRIBUTING §7), con Page Object para la UI (unit-testing-standards). Detalle en [plan.md](plan.md#pruebas).

## 11. Dependencias

### SCRUM-56

- `app/household/page.tsx` — ruta delgada.
- `features/household/Household.tsx` — pantalla.
- `features/household/components/HouseholdCreateForm.tsx` y `HouseholdInviteLinkCard.tsx`, con sus props en `components/models/`.
- `features/household/hooks/useHouseholdViewModel.ts` y `useHouseholdInvite.ts`.
- `features/household/services/household.service.ts`.
- `features/household/models/HouseholdInvite.interface.ts` y `HouseholdMembership.interface.ts`.
- `features/household/constants/household.constants.ts`.
- `@/components/ui` (`Button`, `Chip`, `Input`, `Spinner`), `@/constants` (`BUTTON_VARIANT`, `CHIP_TONE`), `services/supabase.client.ts` y `types/database.types.ts`.

### SCRUM-57

- Todo lo de SCRUM-56, en especial `hasRegisteredSession()`, `HOUSEHOLD_ROUTE.INVITATION` y la tabla `household_invite_links`.
- `app/invitacion/[token]/page.tsx` (nueva) y `HouseholdInvitation.tsx` con `hooks/useHouseholdInvitationViewModel.ts` (nuevos).
- Formulario de `/household`: `components/HouseholdJoinForm.tsx` (nuevo) y su hook `hooks/useHouseholdJoinForm.ts`, compuesto por `useHouseholdViewModel`.
- `utils/extractInviteToken.ts` (nuevo).
- `next/link` y `useRouter` de `next/navigation`.
- La migración nueva de la RPC y su entrada en `types/database.types.ts`.
- El detalle de archivos está en [plan.md](plan.md#scrum-57-unirse-a-una-familia-con-el-enlace).

## 12. Contratos externos

### SCRUM-56

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

### SCRUM-57

RPC nueva, en una migración nueva (número a confirmar al crearla, ver [plan.md](plan.md#número-de-la-migración)):

```
accept_household_invite(invite_token text) returns text
```

- `security definer`, `set search_path = ''`, nombres calificados con `public.`.
- `revoke execute … from public, anon` y `grant execute … to authenticated`, igual que las tres de SCRUM-56.
- Sin sesión o con sesión anónima: excepción con `errcode = '42501'` (mismo criterio que la `011`).
- Resultados de negocio (el valor devuelto; constantes `HOUSEHOLD_JOIN_RESULT` en el cliente):

| Valor | Significado | ¿Inserta? |
|---|---|---|
| `joined` | Se agregó a quien llama como `member` de la familia del enlace | Sí, una fila |
| `already_member` | Quien llama ya es de esa misma familia (doble clic, otra pestaña, o el admin abriendo su propio enlace) | No |
| `in_other_household` | Quien llama ya es de otra familia (CA-05) | No |
| `expired` | El enlace existe pero `expires_at <= now()` | No |
| `invalid` | El token no tiene formato de UUID o no existe (incluye un enlace reemplazado al regenerar) | No |

- No se agregan políticas ni permisos de tabla: `household_members` sigue sin `insert` para el cliente y `household_invite_links` sigue cerrada. La única puerta para unirse es la RPC.
- Tablas usadas: `household_invite_links` (lectura del token, con bloqueo `for share`) y `household_members` (lectura de la membresía propia e inserción).

## 13. Casos de aceptación

### HU-33 (SCRUM-56)

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

### HU-34 (SCRUM-57)

Ninguno validado todavía. Se prueban con dos cuentas registradas que entran por `/login`: una administradora con enlace vigente y otra sin familia.

Criterios de la historia:

- [ ] **CA-01:** al abrir un enlace vigente, o pegarlo (enlace o código) en "Unirme con una invitación", se comprueba que sea válido y no haya vencido. La comprobación de vencimiento la hace la base con su reloj.
- [ ] **CA-02:** con un enlace válido, "Unirme" agrega al usuario como `member` de esa familia (una fila en `household_members` con su `user_id`, el `household_id` del enlace y `role = 'member'`).
- [ ] **CA-03:** con un enlace vencido o no válido se muestra el mensaje que corresponde y no se crea ninguna membresía.
- [ ] **CA-04:** después de unirse se muestra la confirmación y "Ir a mi familia" lleva a `/household`, donde se ve la familia como miembro.
- [ ] **CA-05:** con una cuenta que ya es de otra familia, el resultado es `in_other_household`, se muestra el mensaje de salir primero y no cambia ninguna membresía.

Casos de cada flujo:

- [ ] **Enlace reemplazado:** después de que la administradora regenera, el enlace anterior da `invalid`.
- [ ] **Ya es de esa familia:** la administradora (o un miembro) abre su propio enlace y pulsa "Unirme": aviso `already_member`, sin filas nuevas.
- [ ] **Sin sesión:** aviso, botón "Iniciar sesión" a `/login`, y no se llama a la RPC.
- [ ] **Sesión anónima** (creada visitando `/lista` sin cuenta): igual que sin sesión, y abrir la página no crea otro usuario anónimo.
- [ ] **Doble clic en "Unirme":** una sola membresía; la interfaz termina en `joined`.
- [ ] **Dos pestañas a la vez:** una termina en `joined` y la otra en `already_member`; una sola fila.
- [ ] **Token con formato inválido en la URL:** `invalid` sin llamar a la RPC.
- [ ] **Falla de red al unirse:** mensaje de error, "Unirme" disponible para reintentar.
- [ ] **Formulario de `/household`:** con el enlace completo navega a `/invitacion/<token>`; con solo el código, también; vacío o sin token válido, error en el campo sin navegar.
- [ ] **Seguridad en la base** (SQL Editor, simulando usuarios, con `rollback`): anónimo y sin sesión rechazados con `42501`; ningún parámetro permite elegir familia, usuario ni rol; `select` directo a `household_invite_links` sigue sin acceso; `insert` directo en `household_members` sigue sin permiso.
- [ ] El token no aparece en la página ni en la consola.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite, según [plan.md](plan.md#pruebas).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

## 14. Casos fuera de alcance

### SCRUM-56

- HU-34 (SCRUM-57): abrir o pegar el enlace, la ruta `/invitacion/[token]`, aceptar la invitación, validar el token al usarlo, agregar miembros mediante el enlace, confirmación de unión y onboarding del miembro.
- HU-34b, HU-34c, HU-35 y HU-36: decidir qué pasa con la lista personal, salir de la familia o transferir el rol de administrador, ver o eliminar miembros.
- Editar, renombrar o eliminar una familia.
- Invitaciones por correo, historial de invitaciones y más de un enlace activo por familia.
- La pantalla de Perfil (HU-30), el sidebar y el onboarding.
- Login (SCRUM-45) y `/registro/verificado`: no se modifican.
- Integrar households con `lists`, `recipes` y `household_store_preferences`.
- Seeds, cron, Edge Functions y dependencias nuevas.

### SCRUM-57

- **Salir de la familia (HU-34c, SCRUM-58):** esta historia solo bloquea la unión y explica que hay que salir primero.
- **Decidir qué pasa con la lista personal al unirse (HU-34b, SCRUM-59):** la pregunta "¿Qué querés hacer con tu lista actual?" no se muestra acá.
- **Ver a los demás miembros (HU-35):** después de unirse, `/household` muestra la vista de miembro que ya existe.
- **Vista previa con el nombre de la familia** antes de aceptar: necesitaría otra RPC; decidido no hacerla en esta historia.
- **Unirse automáticamente al abrir el enlace:** decidido confirmar con "Unirme".
- **Volver al enlace después del login** (parámetro `next` en `/login`): toca SCRUM-45 y necesita validar que el destino sea interno; queda como mejora a coordinar con quien tiene el login.
- **Onboarding** ("Crear o unirme a un household" de DESIGN.md §7.7): la opción vive por ahora en `/household`.
- **Límite de miembros por familia, invitaciones de un solo uso o revocar un enlace sin regenerarlo:** ningún CA lo pide.
- **Rate limit propio de la RPC:** el token tiene 122 bits aleatorios; ver [plan.md](plan.md#seguridad).
- Cambios en la migración `011`, en las RPC de SCRUM-56 o en el login.

## 15. Notas de implementación

- **Número de la migración (SCRUM-56):** es la `011` porque la `009` (SCRUM-123, `009_close_store_preferences_writes.sql`) y la `010` (SCRUM-96, `010_delete_recipes.sql`) ya existen en `develop`. Se escribió primero como `010` y se renombró al sincronizar la rama con `develop` el 2026-10-03. En la base compartida ya estaba aplicada: el nombre del archivo no cambia nada ahí.
- **Cómo se obtuvo la sesión de prueba (SCRUM-56):** cuando se probó (2026-10-01 y 2026-10-02), el login (SCRUM-45) todavía no estaba en la rama de SCRUM-56. Se creó un usuario confirmado en Supabase Auth y su sesión se cargó en el navegador. El login (`/login`) entró con la sincronización del 2026-10-03; probar `/household` entrando por ahí queda pendiente.
- **Límite de otra historia (detectado el 2026-09-29):** `/registro/verificado` no guardaba la sesión del usuario que verifica su correo. Ya no impide llegar con una cuenta registrada: desde la sincronización del 2026-10-03 existe el login (`/login`, SCRUM-45).
- **Deuda para HU-34/HU-34c (M1):** si se borra la cuenta del único administrador, su membresía se borra pero la familia y su enlace quedan. Con SCRUM-57, alguien podría unirse a esa familia sin administrador mientras el enlace siga vigente; se resuelve con HU-34c.
- **Tests automáticos:** cuando se hizo SCRUM-56 el proyecto no tenía runner de tests, así que sus casos se validaron a mano y sus tests quedaron pendientes. Vitest llegó a `develop` con SCRUM-128 (PR #36) y la Definition of Done ahora exige tests (CONTRIBUTING §7): SCRUM-57 los incluye ([plan.md](plan.md#pruebas)). Los de SCRUM-56 siguen pendientes y no son parte de esta historia.
- **E2E (Playwright, SCRUM-129):** decisión pendiente para SCRUM-57; ver [plan.md](plan.md#pruebas).
- **Spec reorganizada en SCRUM-57** con una subsección por historia en cada sección, como `features/recipes/specs/SPEC.md`. El contenido de SCRUM-56 no cambió, solo se ubicó bajo su subsección.
