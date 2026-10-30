# Feature: Household — crear familia, enlace de invitación, unirse y salir

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-56 / HU-33](https://tacha.atlassian.net/browse/SCRUM-56): crear link de invitación al household. Sprint 2, mergeada.
- [SCRUM-57 / HU-34](https://tacha.atlassian.net/browse/SCRUM-57): unirse a un household por link. Sprint 2, mergeada.
- [SCRUM-58 / HU-34c](https://tacha.atlassian.net/browse/SCRUM-58): salir de mi household. En curso.
- [SCRUM-59 / HU-34b](https://tacha.atlassian.net/browse/SCRUM-59): decidir qué hacer con la lista personal al unirse o crear un household. Sprint 4, implementada en la rama; falta aplicar la migración `024`, correr su prueba SQL y el QA manual (ver [§2](#2-alcance): la separación de una parte en otro ticket sigue pendiente del equipo).
- [SCRUM-60 / HU-35](https://tacha.atlassian.net/browse/SCRUM-60): consultar familiares del household. Sprint 4, mergeada (#68, 2026-10-19).
- [SCRUM-61 / HU-36](https://tacha.atlassian.net/browse/SCRUM-61): eliminar a un familiar del household. Sprint 4, en implementación (PR #69).

El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md).

Terminología: en el código, la base y la ruta se usa `household`; en la interfaz, en español, se muestra **"familia"** y **"enlace"** (el texto de las historias dice "household" y "link").

## 1. Objetivo

### SCRUM-56

Que el administrador de una familia (household) genere un enlace de invitación persistente y con vencimiento, para que otras personas se unan sin invitarlas una por una por correo. El enlace se guarda en la base, sigue disponible al recargar la página, se puede copiar y regenerar, y al regenerarlo el anterior deja de existir.

Como ninguna otra historia crea households y sin uno no hay administrador, esta historia incluye la **creación mínima de la familia**: un usuario registrado sin familia escribe un nombre y queda como administrador.

### SCRUM-57

Que una persona con cuenta registrada use el enlace (o el código) que le compartió el administrador para entrar a esa familia como miembro, sin más pasos que confirmar con un botón. Si el enlace venció, ya no existe o la persona ya tiene familia, se le explica qué pasó y no se toca ninguna membresía.

### SCRUM-58

Que cualquier integrante pueda salir de su familia cuando quiera, para volver a usar Tacha por su cuenta o unirse a otra. La familia nunca queda sin administrador: si sale el administrador y hay otros miembros, antes elige a quién le pasa el rol; si es el único, la familia se elimina junto con su enlace de invitación.

### SCRUM-59

Que una persona que ya usaba Tacha por su cuenta y crea una familia o se une a una decida, **una sola vez**, si su lista personal sigue siendo solo suya o pasa a la familia, para no perder lo que ya tenía ni compartir algo que prefiere privado. Las listas que cree después se comparten con la familia sin volver a preguntar.

### SCRUM-60

Que cualquier integrante de una familia vea quiénes la forman: el nombre de cada persona, quién administra la familia y cuál es su propia fila. Cuando la familia es grande, encontrar a alguien por su nombre sin cargar a todos de una vez.

### SCRUM-61

Que el administrador pueda quitar a alguien de su familia, para decidir quién tiene acceso a la lista y a lo que comparte la familia. La persona eliminada deja de ver los datos de la familia en ese momento, pero no pierde nada propio: conserva su lista personal, sus recetas, sus planes y sus compras.


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

### SCRUM-58

- En `/household` ("Mi familia", que cumple el papel de "Perfil/Household" mientras no exista la pantalla de Perfil, HU-30): una sección **"Salir de la familia"** para miembro y administrador, con confirmación explícita en un diálogo (`Modal`).
- **Miembro:** confirma y sale.
- **Administrador con otros miembros:** en el mismo diálogo elige al nuevo administrador entre los miembros (radios nativos) y confirma. Pasar el rol y salir ocurren juntos.
- **Administrador único miembro:** el diálogo avisa que la familia y su enlace se eliminan; al confirmar, se eliminan.
- Después de salir, `/household` muestra el estado sin familia ("Crea tu familia" y "Unirme con una invitación") y un aviso de confirmación.
- Backend: una migración nueva (número en [plan.md](plan.md#número-de-la-migración-1)) con dos RPC, `get_household_members()` (solo el administrador, para elegir) y `leave_household(new_admin_user_id)`, y su prueba SQL en `supabase/tests/`.

### SCRUM-59

> **Alcance sujeto a aprobación del equipo.** Hoy no existen listas compartidas: todas las políticas de `lists`, `list_items` y `list_item_recipe_requirements` son de la dueña ([§12](#12-contratos-externos)). Cumplir CA-04 y CA-05 exige construir antes ese modelo. Se propone separarlo en dos partes; **dividir la historia o crear un ticket nuevo en Jira lo decide el equipo**, no esta spec.

**Parte A: habilitador "lista general de la familia"** (propuesta de ticket aparte, pendiente de aprobación):

- Una sola lista general por familia (D2).
- Acceso a esa lista, sus ítems y sus requisitos de receta **por ser miembro de la familia**, no por ser la dueña. Quien sale de la familia pierde el acceso (D6).
- Los flujos normales de agregar a la lista general (producto suelto, receta, semana del plan) usan la lista de la familia cuando la persona pertenece a una (D3, CA-05), y `/lista` la muestra.
- Las listas privadas nunca se asocian a la familia (D3).

**Parte B: HU-34b propiamente** (depende de la parte A):

- La pregunta "¿Qué quieres hacer con tu lista actual?" justo después de crear la familia (`/household`) o de unirse (`/invitacion/<token>`), con dos opciones igual de visibles (CA-01).
- Solo a cuentas registradas (D9) y solo si la persona tiene una lista general personal con contenido (D1).
- La decisión se guarda asociada a su membresía y aplica de una vez a todas sus listas personales (CA-02, D5).
- **Mantenerla:** la lista no cambia (CA-03) y se sigue viendo en una sección personal claramente separada (D4).
- **Compartirla:** los ítems pasan a la lista de la familia en una sola operación atómica, sin duplicar variantes (CA-04, D2). Las reglas exactas están pendientes ([§5](#5-reglas-de-negocio), T1).

Hoy solo existe la lista **general**: las sublistas por fecha y las listas privadas no están implementadas, así que "todas las listas personales" (CA-02) es, en la práctica, la lista general. Cuando existan las sublistas, la decisión se extiende a ellas.

### SCRUM-60

- En `/household`, para miembro y administrador: una sección **"Integrantes de la familia"** con la lista de los miembros de **su** familia.
- Cada fila: un avatar con las **iniciales** del nombre (o un ícono genérico si no hay nombre), el nombre o "Miembro sin nombre", la etiqueta **"Administrador"** en la fila del admin y **"Tú"** en la fila de quien consulta (CA-01, CA-03).
- **Búsqueda por nombre** automática mientras se escribe, con debounce, sin distinguir mayúsculas (CA-02).
- **Paginación:** 20 miembros por página y la acción **"Cargar más"** mientras haya más (CA-02).
- Estados de carga, sin resultados, error y reintento.
- Backend: una migración nueva, `025_household_members_page.sql`, con una RPC paginada para cualquier miembro, y su prueba SQL en `supabase/tests/`. `get_household_members()` (`023`) no cambia: la sigue usando el diálogo de salir (SCRUM-58).

### SCRUM-61

- En la sección "Integrantes de la familia" de `/household` (SCRUM-60), el administrador ve un botón **"Eliminar integrante"** en cada fila, salvo en la suya (CA-01). Un miembro no lo ve.
- "Eliminar integrante" abre un diálogo (`Modal`) que pide confirmación explícita. Solo el botón "Eliminar" del diálogo ejecuta la acción (CA-02).
- Al confirmar, la base borra la membresía de esa persona en una sola operación: pierde el acceso a la lista y a los datos de la familia en ese momento, y sus datos personales no se tocan (CA-03).
- Después aparece un aviso de confirmación y la lista de integrantes se vuelve a cargar (CA-04).
- No se envían notificaciones a la persona eliminada (D2) y el enlace de invitación de la familia no cambia (D1).
- Backend: una migración nueva (número en [plan.md](plan.md#scrum-61-eliminar-a-un-integrante-de-la-familia)) con la RPC `remove_household_member(member_user_id)` y su prueba SQL en `supabase/tests/`.


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

### SCRUM-58

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión registrada | `boolean` | `hasRegisteredSession()` (reutilizado) |
| Membresía y rol | `HouseholdMembership` | `getHouseholdMembership()` (reutilizado) |
| `onLeaveRequest` | `() => void` | Botón "Salir de la familia" |
| Miembros de la familia | lista de `{ userId, displayName, role, isCurrentUser }` | `get_household_members()`, solo si quien abre el diálogo es administrador |
| Nuevo administrador elegido | `string` (un `userId` de esa lista) | Radio del diálogo |
| `onLeaveConfirm` / `onLeaveCancel` | `() => void` | Botones del diálogo |
| Resultado | `HouseholdLeaveResultType` | `leave_household(new_admin_user_id)` ([§12](#12-contratos-externos)) |

### SCRUM-59

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión registrada | `boolean` | `hasRegisteredSession()` (reutilizado; nunca `ensureSession()` en este flujo) |
| Familia recién creada o unida | resultado de `create_household` / `accept_household_invite` (`joined`) | Flujos de SCRUM-56 y SCRUM-57 |
| ¿Tiene lista general personal con contenido? | `boolean` | A definir en el plan (lectura de su lista general con `household_id` nulo) |
| ¿Ya decidió en esta membresía? | `boolean` | A definir en el plan (D5; nombre de columna o tabla sin decidir) |
| Opción elegida | "mantener" o "compartir" | Botones de la pregunta |

### SCRUM-60

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión registrada | `boolean` | `hasRegisteredSession()` (reutilizado; nunca `ensureSession()`) |
| Membresía | `HouseholdMembership` | `getHouseholdMembership()` (reutilizado): la sección solo existe si pertenece a una familia |
| Texto de búsqueda | `string` | Campo "Buscar por nombre" |
| Página | número de miembros ya cargados | "Cargar más" |
| Miembros de la página | lista de `{ userId, displayName, role, isCurrentUser }` (modelo `HouseholdMember` existente) y si hay más | La RPC nueva ([§12](#12-contratos-externos)) |

### SCRUM-61

| Entrada | Tipo | De dónde |
|---|---|---|
| Membresía y rol | `HouseholdMembership` | `getHouseholdMembership()` (reutilizado): solo el administrador ve "Eliminar integrante" |
| Integrantes | `HouseholdMember[]` (`userId`, `displayName`, `role`, `isCurrentUser`) | `useHouseholdMembers` (SCRUM-60) |
| `onRemoveRequest` | `() => void`, uno por fila | Botón "Eliminar integrante" de la fila |
| `onRemoveConfirm` / `onRemoveCancel` | `() => void` | Botones del diálogo |
| Resultado | `HouseholdRemoveMemberResultType` | `remove_household_member(member_user_id)` ([§12](#12-contratos-externos)) |


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

### SCRUM-58

- Llama a `get_household_members()` solo cuando un administrador abre el diálogo de salir.
- Llama a `leave_household(new_admin_user_id)` solo al confirmar. `new_admin_user_id` va solo cuando el administrador tiene otros miembros; en los demás casos va `null`.
- Según el resultado, la base borra la membresía de quien sale, pasa el rol de administrador al elegido o elimina la familia (con su enlace por la cascada de la `011`).
- Vuelve a leer la membresía y muestra el estado que corresponde (normalmente "sin familia") con un aviso de confirmación.
- Nunca muestra correos: solo el nombre de los miembros, o "Miembro sin nombre".

### SCRUM-59

- Muestra la pregunta en el momento que fija CA-01, solo si se cumplen D1 y D9.
- Guarda la decisión en la base, asociada a la membresía (D5).
- **Mantener:** no cambia ninguna lista; `/lista` muestra la personal en su propia sección (D4).
- **Compartir:** los ítems de la lista personal quedan en la lista de la familia y el resto de los miembros los ve y edita de inmediato (CA-04).
- Desde la decisión, agregar productos, recetas o la semana del plan va a la lista de la familia (CA-05, parte A).

### SCRUM-60

- Llama a la RPC nueva al mostrar la sección, al cambiar la búsqueda (después del debounce) y al pulsar "Cargar más".
- No modifica nada: es solo lectura.
- Nunca muestra correos ni otros datos de Auth: solo el nombre del registro, el rol y si es quien consulta.

### SCRUM-61

- Llama a `remove_household_member(member_user_id)` solo al confirmar en el diálogo. El `userId` de la persona viaja solo en esa llamada; nunca se dibuja en el HTML (mismo criterio que SCRUM-60).
- Según el resultado, la base borra la fila de esa persona en `household_members`. No toca nada más: tampoco el enlace de invitación (D1).
- Muestra el aviso en la zona `role="status"` de la pantalla y vuelve a cargar la lista de integrantes.
- Nunca muestra correos ni ids.


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
3. **Validez del enlace:** el token tiene que existir en `household_invite_links` y su `expires_at` tiene que ser posterior a `clock_timestamp()` de la base (la hora real del momento). El reloj del navegador no decide nada.
4. **Formato:** un token que no tiene formato de UUID es `invalid`, sin consultar la tabla. La página lo detecta antes de mostrar "Unirme" y la RPC lo vuelve a comprobar (no confía en el cliente).
5. **Enlace regenerado:** el token anterior ya no existe en la base (SCRUM-56, regla de regenerar), así que da `invalid`. Esto cierra lo que SCRUM-56 dejó para HU-34 en su CA-04.
6. **El enlace sirve para varias personas** mientras esté vigente: aceptarlo no lo consume ni lo cambia.
7. **Una familia por usuario (CA-05):** si quien acepta ya es de **esa** familia, el resultado es `already_member` y no se inserta nada; si es de **otra**, el resultado es `in_other_household` y no se inserta nada. La garantía final es la clave primaria `household_members.user_id`, no la interfaz.
8. **Atómico:** validar el enlace, revisar la membresía e insertar ocurren en una sola llamada a la base (una transacción). La fila del enlace se bloquea mientras tanto (`for share`), así que una regeneración simultánea espera a que termine la aceptación.
9. **Doble clic o dos pestañas:** el botón se deshabilita mientras se procesa y la página ignora un segundo clic; si igual llegan dos llamadas, la segunda encuentra la membresía creada por la primera y responde `already_member`. Nunca se crean dos filas.
10. **Confirmar antes de unirse:** abrir `/invitacion/<token>` no llama a la RPC; solo el botón "Unirme" lo hace.
11. **Sin vista previa:** la página no muestra el nombre de la familia antes de aceptar (no hay RPC de preview en esta historia).
12. **Formulario de `/household`:** acepta el enlace completo (`<origen>/invitacion/<token>`, con o sin barra final, query o fragmento) o solo el código. Si el texto está vacío o no contiene un token con formato de UUID, muestra el error en el campo y no navega.

### SCRUM-58

1. **Solo cuentas registradas.** Las dos RPC rechazan sin `auth.uid()` o con `is_anonymous` en el JWT (`42501`). La pantalla sigue usando `getSession()`, nunca `ensureSession()`.
2. **La base decide quién sale y con qué rol.** El usuario sale de `auth.uid()`; su familia y su rol, de su fila en `household_members`. El único dato que manda el cliente es el `user_id` del nuevo administrador, y la base valida que sea miembro de **la misma** familia y distinto de quien llama. El cliente nunca manda `household_id` ni un rol.
3. **Miembro:** se borra su fila. Resultado `left`.
4. **Administrador con otros miembros:**
   - sin elegir a nadie → `transfer_required`, sin cambios;
   - elegido que no es miembro de esa familia, o que es él mismo → `invalid_new_admin`, sin cambios;
   - elegido válido → en la misma transacción el elegido pasa a `admin` y la fila del administrador anterior se borra → `left`. Ninguna otra transacción puede ver la familia sin administrador ni con dos.
5. **Administrador único miembro:** se borra la fila de `households`; la cascada de la `011` borra su membresía y su enlace de invitación, y `purchase_sessions.household_id` queda en `null` (`016`). Resultado `household_deleted`.
6. **Sin familia:** `not_member`, sin cambios.
7. **Atomicidad y concurrencia:** cada salida es una sola llamada a la base, y todo lo que hace (pasar el rol, borrar la fila propia o eliminar la familia) ocurre o no ocurre entero.
   - Antes de contar o modificar miembros, la función bloquea **siempre en el mismo orden**, sea miembro o administrador: primero la fila del enlace de esa familia (si existe) y después la de `households`. Es el mismo orden que usa `accept_household_invite`, así dos salidas, una transferencia y una unión por enlace sobre la misma familia se ejecutan una después de otra.
   - Con el bloqueo tomado vuelve a leer la membresía, porque pudo cambiar mientras esperaba. La cantidad de miembros y la validez del elegido se revisan con el bloqueo tomado.
   - Si la base aborta la llamada (por ejemplo, porque Postgres detecta un interbloqueo), se deshace entera: nunca queda una transferencia sin la salida ni una familia a medio borrar. La pantalla muestra "No se pudo salir de tu familia" y se puede reintentar. El detalle está en [plan.md](plan.md#concurrencia).
8. **Listas:** salir no modifica `lists`, `recipes` ni `meal_plans`. Hoy todas son personales (`household_id` siempre `null`), así que el usuario conserva su lista general y sus listas privadas. Qué pasa con las listas **compartidas** con la familia es un contrato pendiente de HU-34b ([§15](#15-notas-de-implementación)).
9. **Ver miembros:** solo el administrador, y solo los de su familia. Por cada miembro devuelve el nombre guardado en los metadatos de Supabase Auth, o `null` si no hay (la interfaz muestra "Miembro sin nombre"). Nunca el correo.
10. **Confirmación explícita:** abrir la sección o el diálogo no modifica nada; solo el botón "Salir" del diálogo llama a `leave_household`.
11. **Doble clic:** el botón se deshabilita y una guarda `useRef` ignora el segundo clic. Si igual llega una segunda llamada, la base responde `not_member` sin cambios.

### SCRUM-59

**Decididas por la dueña de la historia** (2026-10-10):

1. **D1. Cuándo se pregunta:** solo si existe una lista general personal con contenido que requiera decidir. Sin lista o con la lista vacía, no se pregunta.
2. **D2. Una lista general por familia:** compartir incorpora los ítems personales a esa lista sin duplicar ítems de la misma variante. Antes de implementar se documenta cómo se resuelven cantidades, duplicados y conflictos (T1).
3. **D3. Flujos normales:** agregar productos usa la lista de la familia cuando corresponde. Las listas privadas nunca se asocian a la familia.
4. **D4. Mantener:** la persona conserva su lista y la ve en una sección personal claramente separada.
5. **D5. Guardar la decisión:** explícitamente, asociada a la membresía. Falta analizar cómo se limpia al salir y al unirse a otra familia; nombres de columnas y migraciones se deciden después de revisar el diseño.
6. **D6. Al salir:** la lista compartida se queda en la familia; quien sale pierde el acceso a ella y conserva sus listas personales. Falta definir cómo obtiene una lista general personal propia y qué ítems conserva, coordinado con SCRUM-58.
7. **D7. Separación:** se evalúa separar el habilitador (parte A) de HU-34b (parte B). Cambiar el alcance oficial en Jira necesita aprobación del equipo.
8. **D8. Textos aprobados:** "¿Qué quieres hacer con tu lista actual?", "Mantenerla solo para mí" y "Compartirla con mi familia".
9. **D9. Anónimos:** la pregunta no se muestra a usuarios anónimos. Conservar la lista de una sesión anónima al registrarse es otro ticket (SCRUM-49 lo dejó como "Migrar o descartar los datos de las sesiones anónimas: ticket aparte").

**Requisitos de recetas de otros miembros (decidido 2026-10-11):** siguen visibles para los miembros de la misma familia (`recipe_id` y cantidades, nunca el nombre de la receta). Hacen falta para que agregar una receta a la lista de la familia descuente lo que ya pidieron las recetas de los demás (regla 20 de recetas).

**Reglas de seguridad (no negociables):**

10. Quién decide, sobre qué listas y en qué familia lo resuelve la base a partir de `auth.uid()` y de su membresía: el cliente nunca manda `household_id`, `owner_id` ni ids de listas ajenas.
11. Una persona de otra familia, alguien que ya salió o un usuario anónimo no puede leer ni escribir la lista de una familia.
12. Nadie puede asociar una lista a una familia ajena desde el cliente.
13. Compartir es atómico: o pasan todos los ítems según las reglas de T1, o no cambia nada.
14. La pregunta se responde una sola vez por membresía: un doble clic o una segunda pestaña no comparten dos veces.

**Cómo se resolvieron T1 a T4 en la implementación** (2026-10-11). Son decisiones de implementación tomadas con las propuestas de la planificación; la dueña de la historia las confirma o corrige al revisar el PR:

- **T1. Reglas para compartir** (`decide_personal_lists`, migración `024`):
  - pasan solo los ítems **pendientes** de la lista general personal;
  - si la lista de la familia ya tiene esa variante, se suman en esa fila con la misma regla que agregar un producto (`add_units_to_list_item`, `015`): una fila pendiente suma la cantidad (en `bigint`, con tope en el máximo de `integer`: compartir nunca falla por desborde; no hay un tope de producto acordado); una tachada **sin** compra se reabre con la cantidad nueva;
  - si la fila de destino está tachada **dentro de una compra** (`purchase_session_id`), no se toca: reabrirla borraría lo que compró otra persona. Hasta la migración 035 ese pendiente se quedaba en la lista personal (opción A, 2026-10-11) y el resultado podía ser `shared_partially` o `nothing_shared` (2026-10-12). **Desde SCRUM-156 (035)** lo tachado ya nunca se reabre: el pendiente entra como fila pendiente nueva junto a la comprada y el resultado es `shared`;
  - los requisitos de receta de cada pendiente pasan a la fila de destino; si ya había uno de la misma receta y unidad, se suman, con el tope de la tabla;
  - lo tachado se queda en la lista personal (son compras personales, HU-38).
- **T2. Lista personal después de "Mantener":** en `/lista` se muestra como sección **de solo lectura** "Mi lista personal" (sus pendientes). Lo que se agrega va a la lista de la familia (CA-05). La base sigue dejando a la dueña editarla (sus políticas no cambiaron); poder hacerlo desde la interfaz queda para otra historia.
- **T3. Familia eliminada:**
  - su lista general se borra con ella (FK `lists.household_id` con `on delete cascade`), **con lo tachado: se pierde el detalle de compras de esa lista** (las compras quedan con su total). Está anotado como deuda en el plan. Antes de crear la FK, la migración comprueba que no haya listas con un `household_id` inválido y se detiene si las hay, sin borrar ni corregir nada;
  - las recetas y los planes que la nombraban quedan personales (`household_id` en nulo) por un trigger. Un plan de la familia que choca con un espacio personal del mismo dueño, día y comida se borra (gana el personal), y de varios planes de la familia en el mismo espacio queda el más antiguo; así ninguno queda con el `household_id` de la familia borrada (aprobado el 2026-10-11). No llevan FK porque la prueba SQL de la `019` inserta planes con un `household_id` inventado para probar sus políticas;
  - así se resuelve el hallazgo de QA de SCRUM-58: ningún dato queda con el `household_id` de una familia que ya no existe. La prueba SQL de la `023` se actualizó a este comportamiento.
- **T4. Modo compra:** funciona sobre la lista de la familia sin cambios. Cada miembro tacha dentro de **su** compra personal (las políticas de `purchase_sessions` no cambian) y la RLS de `list_items` ya le deja tocar los productos de la familia. Atribuir el gasto a la familia es HU-38.
- **T5. Separación A/B:** **sigue pendiente.** Por indicación de la dueña de la historia, las partes A y B se implementaron en esta rama. Si se separa la parte A en otro ticket, o se registra el aumento de alcance en Jira, lo decide el equipo; esta rama no cambia Jira.

### SCRUM-60

**Decididas por la dueña de la historia (2026-10-17):**

1. **Foto:** se muestran las iniciales del nombre; si no hay nombre, un ícono genérico. La foto real queda para cuando exista el perfil de usuario (HU-30).
2. **Visibilidad:** cualquier miembro autenticado de una familia consulta a los integrantes de **su propia** familia, y solo a ellos. Esto amplía la regla 9 de SCRUM-58 solo para la función nueva: `get_household_members()` sigue siendo solo del administrador (la usa el diálogo de salir).
3. **Paginación:** 20 miembros por página, con "Cargar más".
4. **Búsqueda:** automática mientras se escribe, con debounce.
5. **Usuario actual:** etiqueta "Tú" en su fila.

**Reglas:**

6. **Solo cuentas registradas:** sin sesión o con sesión anónima, la base rechaza (`42501`).
7. **La familia la decide la base**, a partir de `auth.uid()` y de la membresía de quien llama. El cliente nunca manda `household_id`.
8. **Orden estable:** primero el administrador, después por antigüedad en la familia (`created_at`) y, a igual antigüedad, por `user_id`. Así ninguna página repite ni salta a nadie.
9. **Búsqueda:** sin distinguir mayúsculas, sobre el nombre sin espacios al inicio ni al final. `%` y `_` se buscan como texto. Con la búsqueda vacía se listan todos. Un miembro sin nombre no coincide con ninguna búsqueda.
10. **Límites:** texto de búsqueda de hasta 60 caracteres; tamaño de página entre 1 y 50 (la interfaz usa 20); el desplazamiento no puede ser negativo. Valores fuera de rango: error `22023`.
11. **Respuestas viejas:** si la búsqueda cambia mientras llega una página, esa respuesta se descarta; una búsqueda nueva empieza desde la primera página.

### SCRUM-61

**Decididas por la dueña de la historia** (2026-10-18):

1. **D1. Enlace de invitación:** invalidar el enlace asociado a la persona eliminada, si existe y el modelo actual lo permite de forma segura, sin invalidar enlaces compartidos que afecten a otros usuarios. **El modelo actual no lo permite** (verificado el 2026-10-18 en la `011` y la `014`):
   - hay **un solo enlace por familia** (`household_invite_links.household_id` es la clave primaria), no uno por persona;
   - unirse (`accept_household_invite`) no guarda qué enlace usó cada quien ni quién lo generó;
   - borrar o regenerar ese enlace dejaría sin acceso a cualquier otra persona a quien el administrador ya se lo mandó.

   Por eso **eliminar a alguien no toca el enlace**. **Limitación aceptada:** mientras el enlace de la familia siga vigente (7 días desde que se generó), la persona eliminada puede volver a unirse con él si lo conserva. El administrador puede cortarlo cuando quiera con "Generar enlace nuevo" (SCRUM-56), que reemplaza el token. Un enlace por persona o una lista de bloqueados quedan fuera de esta historia ([§14](#14-casos-fuera-de-alcance)).
2. **D2. Sin notificaciones** a la persona eliminada. La próxima vez que abra `/household` ve el estado sin familia, y `/lista` le muestra su lista personal.
3. **D3. Textos aprobados:** "Eliminar integrante", "¿Eliminar a este integrante?", "Esta persona perderá acceso a los datos compartidos de este household. Sus datos personales no se eliminarán", "Cancelar", "Eliminar", "Integrante eliminado correctamente" y "No se pudo eliminar al integrante. Inténtalo de nuevo" (ver [§7](#7-errores) y [§8](#8-ui-esperada)). Se usan tal cual, incluida la palabra "household" que pidió la dueña de la historia.

**Reglas:**

4. **Solo cuentas registradas.** Sin `auth.uid()` o con `is_anonymous` en el JWT: `42501`.
5. **Solo el administrador, solo en su familia.** La base deriva la familia y el rol de quien llama desde `auth.uid()`. El cliente manda únicamente el `user_id` de la persona a eliminar; nunca `household_id` ni un rol. Quien no es administrador recibe `not_admin`, sin cambios (la interfaz ni siquiera le muestra el botón).
6. **Nunca a sí mismo** (CA-01): `cannot_remove_self`, sin cambios. Para irse está "Salir de la familia" (SCRUM-58), que exige pasar el rol.
7. **Solo a un miembro de la misma familia.** Si la persona no está en la familia de quien llama (es de otra familia, no tiene familia, ya fue eliminada o ya salió): `member_not_found`, sin cambios. La respuesta es la misma en todos esos casos, para no revelar si un `user_id` existe ni a qué familia pertenece.
8. **Confirmación explícita** (CA-02): abrir el diálogo o cancelarlo no llama a la base.
9. **Acceso inmediato** (CA-03): todo el acceso a los datos de la familia se resuelve por membresía, en la RLS (la familia en la `011`, la lista y sus ítems en la `024`) y dentro de las RPC. Al borrarse la fila, la siguiente consulta de esa persona ya no ve nada de la familia, y Realtime deja de enviarle cambios de `list_items` (aplica la RLS a cada evento). El JWT no guarda la membresía, así que no hay permisos en caché.
10. **Conservación de datos** (CA-03). Es lo mismo que pasa cuando un miembro sale (SCRUM-58 y D6 de SCRUM-59):
    - **Se queda con la persona:** su lista general personal (`household_id` nulo), con lo que haya dejado en ella al elegir "Mantener"; sus recetas y sus planes (hoy siempre personales); sus compras (`purchase_sessions`).
    - **Se queda en la familia:** la lista general de la familia con todo lo que la persona agregó o tachó, y los requisitos de sus recetas en esos ítems (`recipe_id` y cantidades, nunca el nombre de la receta); los productos de "Mis productos" creados para la familia (`product_catalog.household_id`: son de la familia y no tienen dueño).
    - **Se borra:** solo su fila de `household_members`, con su decisión de listas (`personal_lists_decision`). Si se une a una familia otra vez, se le vuelve a preguntar.
11. **Atomicidad y concurrencia:** una sola llamada y una sola transacción. Bloquea en el mismo orden que `leave_household` y `accept_household_invite` (enlace → familia) y, con el bloqueo tomado, vuelve a leer el rol de quien llama y la membresía de la persona. Así una eliminación no se cruza con una salida, una transferencia del rol o una unión por enlace en la misma familia (detalle en [plan.md](plan.md#scrum-61-eliminar-a-un-integrante-de-la-familia)).
12. **Doble clic:** el botón se deshabilita y una guarda `useRef` ignora el segundo clic. Si igual llega una segunda llamada, la base responde `member_not_found` sin cambios.


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

### SCRUM-58

Flujo de salir (`HOUSEHOLD_LEAVE_STATUS`), una unión de estados:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `idle` | Diálogo cerrado | La sección "Salir de la familia" con su botón |
| `loadingMembers` | El administrador abrió el diálogo y se piden los miembros | Spinner dentro del diálogo |
| `membersLoadFailed` | Falló `get_household_members()` | Error y "Cancelar" |
| `confirming` | Diálogo abierto y listo | Texto según el caso, radios si corresponde, "Salir" y "Cancelar" |
| `leaving` | Esperando `leave_household` | "Saliendo…", botones deshabilitados |
| `failed` | Error de red o de la base al salir | Error en el diálogo; se puede reintentar o cancelar |

Al salir bien (`left` o `household_deleted`), el diálogo se cierra y la pantalla vuelve a leer la membresía: queda en el estado `noHousehold` de SCRUM-56 con el aviso de confirmación.

### SCRUM-59

Implementado con `HOUSEHOLD_LISTS_DECISION_STATUS` (`hooks/usePersonalListsDecision.ts`):

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `hidden` | Sin familia, sin pendientes en la lista personal, ya decidió, la consulta falló o todavía no respondió | La pantalla normal |
| `asking` | La base responde `pending` | La pregunta con sus dos opciones |
| `saving` | Esperando a `decide_personal_lists` | Opciones deshabilitadas (`aria-busy`) |
| `failed` | Error de red o de la base al guardar | La pregunta con el error; cualquiera de las dos opciones reintenta |

La consulta de si corresponde preguntar corre en segundo plano, sin spinner: la pregunta aparece cuando responde.

### SCRUM-60

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `loading` | Primera carga o búsqueda nueva | Spinner en la sección |
| `ready` | Hay miembros | La lista y, si hay más, "Cargar más" |
| `noResults` | La búsqueda no coincide con nadie | "Nadie de tu familia coincide con esa búsqueda." (texto propuesto) |
| `loadingMore` | Esperando la página siguiente | La lista actual y "Cargar más" deshabilitado |
| `failed` | Falló la primera carga o la búsqueda | Error y "Reintentar" |
| `loadMoreFailed` | Falló "Cargar más" | La lista actual, el error y "Cargar más" disponible para reintentar |

La lista sin búsqueda nunca está vacía: quien consulta siempre aparece.

### SCRUM-61

Flujo de eliminar (`HOUSEHOLD_REMOVE_MEMBER_STATUS`, propuesto):

| Estado | Cuándo | Qué se ve |
|---|---|---|
| `idle` | Diálogo cerrado | La lista con "Eliminar integrante" en cada fila ajena (solo el administrador) |
| `confirming` | Eligió a alguien | El diálogo con su nombre, "Cancelar" y "Eliminar" |
| `removing` | Esperando a la base | Botones deshabilitados (`aria-busy`); el diálogo no se puede cerrar |
| `failed` | Error de red o de la base | El error en el diálogo; se reintenta o se cancela |

Con `removed`, el diálogo se cierra, aparece el aviso y la lista se recarga. Con `member_not_found` o `not_admin` también se cierra y se recarga lo que corresponda ([§7](#7-errores)).


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

### SCRUM-58

Textos propuestos (se confirman al escribir las constantes):

| Situación | Mensaje visible |
|---|---|
| No se pudieron cargar los miembros | "No se pudieron cargar los miembros de tu familia. Intenta de nuevo." |
| Administrador con otros miembros sin elegir (o `transfer_required`) | "Elige a quién le pasas la administración antes de salir." |
| `invalid_new_admin` | "Esa persona ya no es parte de tu familia. Elige a otra." (se vuelven a cargar los miembros) |
| Falló la salida (red o base) | "No se pudo salir de tu familia. Intenta de nuevo." |
| `not_member` | Sin error: se vuelve a leer la membresía y se muestra el estado real |

- Los errores de Supabase no se muestran crudos.
- "Falló la salida" se reintenta con el mismo botón "Salir"; si la primera llamada sí llegó a la base, el reintento responde `not_member` y la pantalla muestra el estado real.

### SCRUM-59

- Si no se puede guardar la decisión: "No se pudo guardar tu decisión. Intenta de nuevo." (texto propuesto) y la pregunta sigue. Si el primer intento sí llegó a la base, el reintento responde `already_decided` y la pregunta desaparece sin aviso.
- Si la consulta inicial falla, no se muestra nada ni se bloquea la pantalla: se vuelve a consultar la próxima vez que se abre.
- Si "Mi lista personal" no se puede cargar en `/lista`, la sección no aparece; la lista principal no depende de ella.
- Los errores de Supabase no se muestran crudos ni con ids.

### SCRUM-60

Textos propuestos, se confirman al escribir las constantes:

| Situación | Mensaje visible |
|---|---|
| Falló la carga o la búsqueda | "No se pudieron cargar los integrantes de tu familia." y el botón "Reintentar" |
| Falló "Cargar más" | "No se pudieron cargar más integrantes. Intenta de nuevo." |
| Búsqueda sin resultados | "Nadie de tu familia coincide con esa búsqueda." (no es un error) |

Los errores de Supabase no se muestran crudos ni con ids.

### SCRUM-61

Textos aprobados (D3):

| Situación | Qué se ve |
|---|---|
| Falló la eliminación (red o base) | "No se pudo eliminar al integrante. Inténtalo de nuevo" en el diálogo (`role="alert"`); "Eliminar" reintenta |
| `cannot_remove_self` | No debería pasar (la fila propia no tiene el botón): el mismo error |
| `member_not_found` | La persona ya no estaba (salió, o la eliminó otra pestaña): el diálogo se cierra y la lista se recarga, sin mensaje. D3 no define un texto para este caso |
| `not_admin` | Sin mensaje: se vuelve a leer la membresía y se muestra el estado real |

- Los errores de Supabase no se muestran crudos ni con ids.


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

### SCRUM-58

En `/household`, para miembro y administrador:

- Sección **"Salir de la familia"** con un texto corto y el botón **"Salir de la familia"** (variante secundaria).

Diálogo (`Modal`), con título **"¿Salir de {nombre de la familia}?"**:

- **Miembro:** "Vas a dejar de ver lo que comparte esta familia." Botones **"Salir"** (variante destructiva; "Saliendo…" mientras procesa) y **"Cancelar"**.
- **Administrador único:** "Eres la única persona en esta familia. Si sales, la familia y su enlace de invitación se eliminan."
- **Administrador con otros miembros:** "Antes de salir, elige quién va a administrar la familia." y un grupo de radios con el nombre de cada miembro ("Miembro sin nombre" si no tiene). No aparece el administrador que sale.

Avisos después de salir (en la zona `role="status"` de la pantalla):

- `left`: "Saliste de la familia."
- `household_deleted`: "Saliste y la familia se eliminó."

Componentes compartidos: `Button`, `Modal` y `Spinner` de `@/components/ui`. Los radios son `<input type="radio">` nativos dentro del diálogo, con estilos `tacha-*`.

### SCRUM-59

Según DESIGN.md §7.15, paso agregado el 2026-08-19:

- Una pantalla corta (o un paso dentro del flujo) con la pregunta **"¿Qué quieres hacer con tu lista actual?"** y dos opciones igual de visibles, como tarjetas grandes tocables: **"Mantenerla solo para mí"** y **"Compartirla con mi familia"**.
- El texto breve (propuesto): "Tu decisión aplica a todo lo pendiente de tu lista personal y no se vuelve a preguntar."
- Las dos opciones son botones con la misma variante, uno al lado del otro. La pregunta aparece arriba en `/household` (después de crear la familia, o al volver sin haber decidido) y en `/invitacion/<token>` justo después de "Unirme".
- Avisos al decidir (propuestos, en la zona `role="status"`): "Tu lista personal sigue siendo solo tuya.", "Lo pendiente de tu lista ahora está en la lista de tu familia."; si se compartió una parte porque la familia ya había comprado el resto (`shared_partially`), "Compartiste tu lista. Lo que tu familia ya había comprado se quedó en tu lista personal."; y si no se compartió nada porque la familia ya había comprado todo (`nothing_shared`), "No se compartió nada: tu familia ya había comprado todo lo que tenías pendiente."
- En `/lista`, si eligió mantenerla: la sección de solo lectura **"Mi lista personal"** debajo de la lista de la familia, con "Solo tú la ves. Lo que agregues ahora va a la lista de tu familia." (texto propuesto).

Los textos de la historia usan voseo ("querés") y "household"; se adaptan al tono de la app (tú, "familia"), como aprobó la dueña de la historia (D8).

### SCRUM-60

En `/household`, para miembro y administrador, una sección **"Integrantes de la familia"** con:

- un campo **"Buscar por nombre"**;
- la lista de filas: avatar circular con las iniciales (hasta dos letras, de las dos primeras palabras del nombre) o un ícono genérico, el nombre o "Miembro sin nombre", y las etiquetas **"Administrador"** (con `Chip`) y **"Tú"**;
- el botón **"Cargar más"** (variante secundaria) debajo de la lista, mientras haya más.

Componentes compartidos: `Input`, `Chip`, `Button` y `Spinner` de `@/components/ui`. El debounce reutiliza el criterio de la búsqueda de productos (`PRODUCT_SEARCH.DEBOUNCE_MS`, 300 ms) o una constante propia con el mismo valor (se decide en el plan).

### SCRUM-61

En la sección "Integrantes de la familia" (SCRUM-60), solo para el administrador:

- En cada fila que no es la suya, un botón **"Eliminar integrante"** (variante secundaria) al final de la fila.
- Diálogo (`Modal`) con el título **"¿Eliminar a este integrante?"**, el nombre de la persona ("Miembro sin nombre" si no tiene) para que quede claro a quién se elimina, y el mensaje **"Esta persona perderá acceso a los datos compartidos de este household. Sus datos personales no se eliminarán"**. Botones **"Cancelar"** y **"Eliminar"** (variante destructiva).
- Aviso después de eliminar, en la zona `role="status"`: **"Integrante eliminado correctamente"**.
- Error, dentro del diálogo: **"No se pudo eliminar al integrante. Inténtalo de nuevo"**.

Componentes compartidos: `Button` y `Modal` de `@/components/ui`. Los textos son los aprobados (D3).


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

### SCRUM-58

- Los radios van dentro de un `<fieldset>` con `<legend>` ("¿Quién va a administrar la familia?") y cada uno con su `<label>`.
- El diálogo usa el `Modal` compartido: se cierra con "Cancelar" o Escape, salvo mientras sale (`leaving`).
- "Salir" se deshabilita mientras procesa y, con otros miembros, mientras no haya nadie elegido.
- La confirmación final se anuncia en la zona `role="status"` siempre montada de `Household.tsx`; los errores, en `role="alert"`.
- Todo el flujo se puede hacer solo con teclado.

### SCRUM-59

- Las dos opciones son botones o tarjetas con nombre accesible y el mismo peso visual; ninguna está preseleccionada.
- Se puede elegir solo con teclado. Mientras guarda, las opciones quedan deshabilitadas y el estado se anuncia.
- El error se anuncia con `role="alert"` y la confirmación final en una zona `role="status"`.

### SCRUM-60

- La lista es un `<ul>` con una fila por miembro; el avatar es decorativo (`aria-hidden`) porque el nombre ya está en texto.
- El campo de búsqueda tiene su `label`.
- La cantidad de resultados y "sin resultados" se anuncian en una zona `role="status"`; los errores, con `role="alert"`.
- "Cargar más" no mueve el foco: los miembros nuevos se agregan al final de la lista.
- Todo se puede hacer con teclado.

### SCRUM-61

- Todos los botones dicen "Eliminar integrante". Para que el lector de pantalla los distinga, su nombre accesible empieza con ese texto visible y agrega el nombre de la persona (por ejemplo, "Eliminar integrante Ana"), como pide WCAG 2.5.3.
- El diálogo usa el `Modal` compartido: se cierra con "Cancelar" o Escape, salvo mientras elimina (`removing`).
- Al cerrarse después de eliminar, la fila ya no existe: el foco tiene que quedar en un lugar estable (por ejemplo, el título de la sección). Se verifica con el `Modal` actual al implementar.
- El aviso va en la zona `role="status"` siempre montada de `Household.tsx`; los errores, en `role="alert"`.
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
- La ruta `app/invitacion/[token]/page.tsx` es delgada: lee `params` (en Next 16 llega como `Promise`, como `app/(app)/recetas/[id]/editar/page.tsx`), declara la metadata y renderiza la pantalla de la feature. Sin lógica.
- La ruta se mantiene en `/invitacion/<token>`: los enlaces ya generados por SCRUM-56 apuntan ahí.
- La pantalla, su ViewModel y el formulario viven en `features/household/`; no se crea otra feature (la página usa el mismo servicio, las mismas constantes y la misma ruta que SCRUM-56).
- La página es de cliente porque la sesión de Supabase vive en el navegador; la seguridad real está en la RPC.
- La metadata de la página fija `referrer: "no-referrer"`, para que el token de la URL no viaje en la cabecera `Referer` si la página carga algo externo o se sale de ella con un enlace.
- La extracción del token es una función pura en `features/household/utils/`, con el patrón de UUID como constante.
- Sin cambios en el login (SCRUM-45) ni parámetro `next` de retorno.
- La migración nueva no toca la `011` ni ninguna otra existente.
- Tests automáticos con Vitest (`npm test`, ya en `develop` desde SCRUM-128), en `features/household/tests/`: como mínimo el camino feliz y un caso negativo o límite (CONTRIBUTING §7), con Page Object para la UI (unit-testing-standards). Detalle en [plan.md](plan.md#pruebas).

### SCRUM-58

- Todo lo de SCRUM-56 y SCRUM-57 aplica igual.
- La lógica del flujo vive en un hook propio (`useHouseholdLeave`) que compone `useHouseholdViewModel`, como `useHouseholdInvite` y `useHouseholdJoinForm`.
- Los radios son nativos y locales al diálogo: no se crea un componente compartido mientras no haya un segundo uso.
- Las RPC son `security definer` con `set search_path = ''`, `revoke execute` de `public` y `anon` y `grant` a `authenticated`. No se agregan políticas ni permisos de tabla.
- La migración sigue el procedimiento de `supabase/README.md`: número libre revisado antes de crearla y antes del merge, se aplica en una sola transacción **junto con su fila** en `supabase_migrations.schema_migrations`, y no se edita una vez aplicada.
- Tests automáticos obligatorios (CONTRIBUTING §7) y prueba SQL de la migración en `supabase/tests/`, con el formato de las existentes (transacción con `assert` que termina en `rollback`).

### SCRUM-59

- **Supabase:** cualquier cambio de datos va en migraciones nuevas, con su prueba SQL en `supabase/tests/` y el procedimiento de `supabase/README.md`. Nunca se edita una migración aplicada. Número provisional `024`, a verificar ([plan.md](plan.md#scrum-59-decidir-qué-hacer-con-la-lista-personal)).
- **Funciones de lista que hoy buscan la lista general por `owner_id` y `household_id is null`** (parte A): `add_item_to_general_list` (`004`, reescrita en `015`), `add_recipe_to_general_list` (`013`, `015`), `get_recipe_coverage` (`017`), y `add_week_to_general_list` y `add_week_ingredients_to_list` (`022`). Todas son `security invoker`, así que la RLS decide.
- **Cliente:** el servicio de `/lista` (`getGeneralList()` en `features/shopping-list/services/shopping-list.service.ts`) usa `ensureSession()` y filtra `household_id` nulo. La pregunta usa `hasRegisteredSession()`.
- La lista general se sigue creando al agregar el primer producto, no al abrir la pantalla.

### SCRUM-60

- **Supabase:** una migración nueva, `supabase/migrations/025_household_members_page.sql`, con su prueba SQL y el procedimiento de `supabase/README.md`. Al 2026-10-17 `develop` llega a la `024` y ninguna rama usa la `025`; se vuelve a revisar antes de crearla y antes del merge.
- **La RPC es `security definer`** (`household_members` solo deja leer la fila propia), con `set search_path = ''`, nombres calificados, `revoke … from public, anon` y `grant … to authenticated`.
- El nombre sale de `auth.users.raw_user_meta_data ->> 'name'`, como en `get_household_members()`. No hay tabla de perfiles.
- La pantalla usa `getSession()`, nunca `ensureSession()`.
- Los textos, el tamaño de página y el debounce van en constantes.

### SCRUM-61

- Todo lo de SCRUM-58 y SCRUM-60 aplica igual.
- La lógica del flujo vive en un hook propio (`useHouseholdMemberRemoval`) que compone `useHouseholdViewModel`, como `useHouseholdLeave`.
- La RPC es `security definer` con `set search_path = ''`, nombres calificados, `revoke execute` de `public` y `anon` y `grant` a `authenticated`. No se agregan políticas ni permisos de tabla: `household_members` sigue sin `delete` para el cliente.
- Migración nueva con el procedimiento de `supabase/README.md`. No se modifican la `023`, la `024` ni la `025`.
- Tests automáticos obligatorios (CONTRIBUTING §7) y prueba SQL de la migración en `supabase/tests/`.


## 11. Dependencias

### SCRUM-56

- `app/(app)/household/page.tsx` — ruta delgada.
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

### SCRUM-58

- Todo lo de SCRUM-56 y SCRUM-57, en especial `household.service.ts`, `useHouseholdViewModel` y `Household.tsx`.
- Nuevos: `components/HouseholdLeaveDialog.tsx` y sus props, `hooks/useHouseholdLeave.ts`, `models/HouseholdMember.interface.ts`, la migración nueva y su prueba SQL.
- `Modal` de `@/components/ui`.
- El detalle de archivos está en [plan.md](plan.md#scrum-58-salir-de-la-familia).

### SCRUM-59

| Dependencia | Estado (2026-10-10) | Efecto |
|---|---|---|
| SCRUM-56 y SCRUM-57 | Mergeadas en `develop` | Los dos flujos donde aparece la pregunta |
| SCRUM-58 (HU-34c, salir) | PR #63 sin mergear, QA manual sin completar | D6 y T3. Con acceso por membresía, salir quita el acceso sin cambiar `leave_household`. Las dos historias modifican `Household.tsx`, `useHouseholdViewModel.ts` y los specs de `features/household/` |
| Feature `shopping-list` (SCRUM-62, 66, 67 y otras) | En `develop` | La parte A cambia su servicio, sus RPC y sus políticas; el E2E de `/lista` es regresión obligatoria |
| Recetas y plan (SCRUM-97, 100, 101) | En `develop` | Sus funciones que agregan a la lista general cambian de destino |
| SCRUM-49 (anónimos) | En `develop` | D9: migrar los datos anónimos es otro ticket |
| Aprobación del equipo (D7, T5) | Pendiente | Define si la parte A es un ticket aparte |

### SCRUM-60

| Dependencia | Estado (2026-10-17) | Efecto |
|---|---|---|
| SCRUM-56, 57, 58 y 59 | Mergeadas en `develop` | La pantalla `/household`, la membresía y el modelo `HouseholdMember` |
| `get_household_members()` (`023`) | En `develop` | No se modifica: la usa el diálogo de salir |
| HU-30 (perfil) | No existe | La foto real queda para esa historia |
| HU-36 (eliminar miembros) | No empezada | Fuera de esta historia |

### SCRUM-61

| Dependencia | Estado (2026-10-18) | Efecto |
|---|---|---|
| SCRUM-60 (HU-35, ver integrantes) | Mergeada en `develop` (#68, 2026-10-19) y traída a esta rama | La acción vive en su lista (`HouseholdMembersSection`, `useHouseholdMembers`, migración `025`) |
| SCRUM-58 (salir) | En `develop` | Mismo orden de bloqueos y mismo criterio de datos. `leave_household` no cambia |
| SCRUM-59 (lista de la familia) | En `develop` | Su acceso por membresía (`024`) es lo que hace que perder la fila quite el acceso |
| SCRUM-56 (enlace) | En `develop` | D1: un solo enlace por familia; eliminar no lo toca. "Generar enlace nuevo" es la forma de cortarlo |


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
| `expired` | El enlace existe pero `expires_at <= clock_timestamp()` | No |
| `invalid` | El token no tiene formato de UUID o no existe (incluye un enlace reemplazado al regenerar) | No |

- No se agregan políticas ni permisos de tabla: `household_members` sigue sin `insert` para el cliente y `household_invite_links` sigue cerrada. La única puerta para unirse es la RPC.
- Tablas usadas: `household_invite_links` (lectura del token, con bloqueo `for share`) y `household_members` (lectura de la membresía propia e inserción).

### SCRUM-58

RPC nuevas, en una migración nueva (número en [plan.md](plan.md#número-de-la-migración-1)):

```
get_household_members() returns table (user_id uuid, display_name text, role text, is_current_user boolean)
leave_household(new_admin_user_id uuid default null) returns text
```

- Las dos: `security definer`, `set search_path = ''`, nombres calificados, `revoke execute … from public, anon`, `grant execute … to authenticated`. Sin cuenta registrada: `42501`.
- `get_household_members()`: solo si quien llama es `admin`; devuelve los miembros de **su** familia. `display_name` sale de `auth.users.raw_user_meta_data ->> 'name'` (vacío o sin valor → `null`). No devuelve correos. Si quien llama no es administrador: `42501`.
- `leave_household(new_admin_user_id)` devuelve:

| Valor | Significado | ¿Cambia algo? |
|---|---|---|
| `left` | Salió (miembro, o administrador que pasó el rol) | Sí |
| `household_deleted` | Era el administrador y único miembro: la familia y su enlace se eliminaron | Sí |
| `transfer_required` | Administrador con otros miembros que no eligió a nadie | No |
| `invalid_new_admin` | El elegido no es miembro de esa familia, o es él mismo | No |
| `not_member` | Quien llama no pertenece a ninguna familia | No |

- Tablas usadas: `households` (bloqueo `for update` y borrado), `household_members` (lectura, actualización del rol del elegido y borrado de la fila propia). `household_invite_links` se borra solo por la cascada.

### SCRUM-59

**Lo que existe hoy** (verificado el 2026-10-10 en `develop`, `58d7a6a`):

- **`public.lists`** (`004`): `id`, `owner_id` (por defecto `auth.uid()`), `household_id` sin FK, `type` (`general`, `date` o `private`), `status` y `created_at`.
  - Índice único `lists_one_general_per_owner (owner_id) where type = 'general' and household_id is null`.
  - Políticas `"owner reads own lists"` y `"owner creates own lists"`; esta última exige `household_id is null` y `type = 'general'`.
- **`public.list_items`:** único por (`list_id`, `product_catalog_variant_id`), `quantity_requested`, `checked_at` y `checked_by` (`015`), `purchase_session_id` y `quantity_bought` (`016`). Políticas de lectura, inserción, actualización y borrado solo para la dueña de la lista (`004`, `012`).
- **`public.list_item_recipe_requirements`** (`013`): único por (`list_item_id`, `recipe_id`, `quantity_unit`); políticas solo de la dueña.
- **`public.purchase_sessions`** (`016`): `household_id` (FK `on delete set null`) y `list_id`. La política para iniciar exige que los dos sean nulos.
- **`public.household_members`** (`011`): no tiene dónde guardar la decisión.

**Contratos nuevos** (migración `supabase/migrations/024_household_lists.sql`, sin aplicar todavía):

- `lists.household_id` → `households` (`on delete cascade`); check `type <> 'private' or household_id is null`; índice único `lists_one_general_per_household (household_id) where type = 'general' and household_id is not null`.
- Trigger `households_release_personal_data` (`after delete on households`): deja `recipes.household_id` y `meal_plans.household_id` en nulo. Antes borra los planes de la familia que chocarían: los que tienen un espacio personal del mismo dueño, día y comida, y los duplicados de la familia en el mismo espacio (queda el más antiguo).
- **RLS:**
  - `lists`: la ve su dueña si `household_id` es nulo, o un miembro de esa familia si no lo es (`"owner or household member reads lists"`). `"owner creates own lists"` (`004`) no cambia.
  - `list_items`: se lee, agrega, cambia y borra si su lista se ve (cuatro políticas nuevas).
  - `list_item_recipe_requirements`: se lee si su ítem se ve; se escribe si su ítem se ve y la receta es propia.
- `find_general_list_id() returns uuid` (`security invoker`) y `ensure_general_list_id() returns uuid` (`security definer`, la crea si falta): la lista general de la familia si quien llama es miembro, si no la personal.
- `add_item_to_general_list`, `add_recipe_to_general_list`, `add_week_to_general_list` y `get_recipe_coverage`: su última versión, con la búsqueda de la lista reemplazada por esas dos funciones.
- `household_members.personal_lists_decision text` (`'keep'`, `'share'` o nulo).
- `get_personal_lists_decision_state() returns text`: `pending`, `nothing_to_decide`, `decided` o `not_member`. Sin cuenta registrada: `42501`.
- `decide_personal_lists(lists_choice text) returns text`: `kept`, `shared` (pasaron todos los pendientes, o no había ninguno), `shared_partially` y `nothing_shared` (ya no se devuelven desde la migración 035, SCRUM-156: un pendiente nunca se queda en la lista personal por una compra de la familia), `already_decided` o `not_member`. Una opción inválida: `22023`. Sin cuenta registrada: `42501`.
- Todas las funciones nuevas: `set search_path = ''`, nombres calificados, `revoke … from public, anon` y `grant … to authenticated`.

### SCRUM-60

RPC nueva, en la migración `025_household_members_page.sql` (se escribe en la etapa de la migración; la firma puede ajustarse en la revisión):

```
get_household_members_page(search_query text default null,
                           page_size integer default 20,
                           page_offset integer default 0)
returns table (user_id uuid, display_name text, role text, is_current_user boolean)
```

- `security definer`, `set search_path = ''`, nombres calificados.
- Sin sesión o con sesión anónima: `42501`. Quien no pertenece a ninguna familia: ninguna fila.
- Solo filas de la familia de quien llama. Sin correo ni otros datos de `auth.users` además del nombre.
- Parámetros fuera de los límites de la regla 10: `22023`.
- `revoke execute … from public, anon`; `grant execute … to authenticated`.
- El cliente pide `page_size + 1` filas para saber si hay más, sin contar el total.

### SCRUM-61

RPC nueva, en una migración nueva (número provisional `026`, ver [plan.md](plan.md#scrum-61-eliminar-a-un-integrante-de-la-familia)):

```
remove_household_member(member_user_id uuid) returns text
```

- `security definer`, `set search_path = ''`, nombres calificados, `revoke execute … from public, anon`, `grant execute … to authenticated`. Sin cuenta registrada: `42501`. `member_user_id` nulo: `22023`.
- Devuelve:

| Valor | Significado | ¿Cambia algo? |
|---|---|---|
| `removed` | La persona ya no es miembro de la familia | Sí |
| `member_not_found` | La persona no es miembro de la familia de quien llama | No |
| `cannot_remove_self` | Quien llama intentó eliminarse a sí mismo | No |
| `not_admin` | Quien llama no es administrador de ninguna familia | No |

- Tablas usadas: `household_invite_links` (solo bloqueo, para respetar el orden de [plan.md](plan.md#scrum-61-eliminar-a-un-integrante-de-la-familia); nunca se modifica, D1), `households` (bloqueo) y `household_members` (lectura y borrado de la fila de la persona). No toca `lists`, `list_items`, `list_item_recipe_requirements`, `recipes`, `meal_plans`, `purchase_sessions` ni `product_catalog`.

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

Validados después de aplicar la migración `014` en la base compartida, con tres evidencias distintas (entre paréntesis en cada caso):

- **manual:** pruebas en `http://localhost:3000` hechas por la dueña de la historia, con capturas, usando cuentas registradas de prueba (una administradora con enlace vigente, otra sin familia y otra con su propia familia). Las sesiones se cargaron en el navegador sin pasar por `/login` ([§15](#15-notas-de-implementación));
- **base:** verificación de la función y pruebas en el SQL Editor simulando usuarios, dentro de una transacción con `rollback`;
- **test:** tests automáticos de `features/household/tests/`.

Criterios de la historia:

- [x] **CA-01:** al abrir un enlace vigente, o pegarlo (enlace o código) en "Unirme con una invitación", se comprueba que sea válido y no haya vencido. La comprobación de vencimiento la hace la base con su reloj. (manual, base, test)
- [x] **CA-02:** con un enlace válido, "Unirme" agrega al usuario como `member` de esa familia (una fila en `household_members` con su `user_id`, el `household_id` del enlace y `role = 'member'`). (manual, base, test)
- [x] **CA-03:** con un enlace vencido o no válido se muestra el mensaje que corresponde y no se crea ninguna membresía. (manual, base, test)
- [x] **CA-04:** después de unirse se muestra la confirmación y "Ir a mi familia" lleva a `/household`, donde se ve la familia como miembro. (manual, test)
- [x] **CA-05:** con una cuenta que ya es de otra familia, el resultado es `in_other_household`, se muestra el mensaje de salir primero y no cambia ninguna membresía. (manual, base, test)

Casos de cada flujo:

- [x] **Enlace reemplazado:** después de que la administradora regenera, el enlace anterior da `invalid`. (manual, base)
- [x] **Ya es de esa familia:** la administradora (o un miembro) abre su propio enlace y pulsa "Unirme": aviso `already_member`, sin filas nuevas. (base, test)
- [x] **Sin sesión:** aviso, botón "Iniciar sesión" a `/login`, y no se llama a la RPC. (manual, test)
- [x] **Sesión anónima:** igual que sin sesión; la página usa `hasRegisteredSession()` y nunca `ensureSession()`, así que abrirla no crea otro usuario anónimo, y la base rechaza a los anónimos con `42501`. (base, test)
- [x] **Doble clic en "Unirme":** una sola membresía; la interfaz termina en `joined`. (test: una sola llamada; base: `on conflict (user_id)`)
- [x] **Dos pestañas a la vez:** una termina en `joined` y la otra en `already_member`; una sola fila. (base: segunda llamada del mismo usuario → `already_member`)
- [x] **Token con formato inválido en la URL:** `invalid` sin llamar a la RPC. (test)
- [x] **Falla de red al unirse:** mensaje de error, "Unirme" disponible para reintentar. (test)
- [x] **Formulario de `/household`:** con el enlace completo navega a `/invitacion/<token>`; con solo el código, también; vacío o sin token válido, error en el campo sin navegar. (test)
- [x] **Seguridad en la base:** anónimo y sin sesión rechazados con `42501`; ningún parámetro permite elegir familia, usuario ni rol; `select` directo a `household_invite_links` sigue sin acceso; `insert` directo en `household_members` sigue sin permiso. (base; la función además pasó dos revisiones de `security-reviewer`)
- [x] El token no aparece en la página ni en la consola. (test; la página no lo dibuja y el servicio no lo incluye en sus errores)
- [x] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite, según [plan.md](plan.md#pruebas): 41 tests en `features/household/tests/`.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

No probado: entrar a `/invitacion/<token>` pasando por el login real (`/login`), porque en el entorno local falta la clave de reCAPTCHA de SCRUM-45 ([§15](#15-notas-de-implementación)).

### HU-34c (SCRUM-58)

Ninguno validado todavía.

Criterios de la historia:

- [ ] **CA-01:** desde "Mi familia" (`/household`) hay una opción "Salir de la familia" con confirmación explícita antes de ejecutarla.
- [ ] **CA-02:** si sale el administrador y hay otros miembros, tiene que elegir a quién pasarle el rol antes de salir; el elegido queda como `admin` y el anterior sale, en una sola operación.
- [ ] **CA-03:** si el administrador es el único miembro, al salir la familia se elimina por completo, junto con su enlace de invitación.
- [ ] **CA-04:** después de salir, el usuario vuelve al estado "sin familia" y conserva su lista general y sus listas privadas.

Casos de cada flujo:

- [ ] **Resultados de negocio:** `left`, `household_deleted`, `transfer_required`, `invalid_new_admin` y `not_member` en la prueba SQL y en el servicio.
- [ ] **Permisos:** sin sesión y anónimo → `42501` en las dos RPC; un miembro que no es administrador no puede listar miembros; `delete` y `update` directos sobre `household_members` siguen rechazados.
- [ ] **Transferencia:** a un miembro válido (queda un único `admin`); a alguien de otra familia o a sí mismo → `invalid_new_admin` sin cambios; sin elegir → `transfer_required` sin cambios.
- [ ] **Eliminar la última familia:** desaparecen la familia, la membresía y el enlace; una `purchase_session` de esa familia queda con `household_id` en `null`; el enlace viejo ya no sirve para unirse.
- [ ] **Conservación de listas:** después de salir, las filas de `lists`, `recipes` y `meal_plans` del usuario siguen iguales.
- [ ] **Concurrencia:** nunca queda una familia sin administrador ni con dos al terminar (dos salidas seguidas, transferir a alguien que ya salió).
- [ ] **Doble clic en "Salir":** una sola llamada; una segunda llamada a la base responde `not_member` sin cambios.
- [ ] **Cancelar:** cerrar el diálogo no llama a `leave_household`.
- [ ] **Nombres:** un miembro sin nombre aparece como "Miembro sin nombre"; ningún correo en la página.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

### HU-34b (SCRUM-59)

Ninguno validado todavía: la implementación está en la rama, pero falta aplicar la `024`, correr `supabase/tests/024_household_lists.test.sql` y el QA manual. Los tests automáticos (Vitest) pasan; por sí solos no validan ningún CA, porque reemplazan la base por un mock. Evidencia esperada: manual (cuentas registradas de prueba, con capturas), base (prueba SQL) y test.

Criterios de la historia:

- [ ] **CA-01:** justo después de unirse o crear la familia se pregunta "¿Qué quieres hacer con tu lista actual?" con "Mantenerla solo para mí" y "Compartirla con mi familia", igual de visibles (si se cumplen D1 y D9).
- [ ] **CA-02:** la pregunta aparece una sola vez y aplica a todas las listas personales que tenía en ese momento.
- [ ] **CA-03:** si elige mantenerla, sigue siendo personal y sin cambios.
- [ ] **CA-04:** si elige compartirla, el resto de la familia la ve y colabora de inmediato.
- [ ] **CA-05:** las listas nuevas que crea después siguen las reglas de la familia (se comparten automáticamente) sin volver a preguntar.

Casos de cada flujo:

- [ ] **Sin pregunta:** anónimo, sin lista personal, con la lista vacía, o con la decisión ya tomada en esta membresía.
- [ ] **Seguridad y RLS:** un miembro de otra familia, alguien que ya salió y un anónimo no leen ni escriben la lista de la familia; nadie asocia una lista a una familia ajena desde el cliente; las listas privadas nunca quedan en la familia.
- [ ] **Compartir atómico:** todos los ítems pasan según T1 o no cambia nada; sin variantes duplicadas; requisitos de receta combinados.
- [ ] **Una sola vez:** doble clic y dos pestañas dan un solo traspaso.
- [ ] **Concurrencia:** dos miembros que comparten a la vez, o compartir mientras otro agrega, terminan con una sola fila por variante.
- [ ] **Salir (D6, con SCRUM-58):** quien sale ya no ve la lista de la familia y conserva sus listas personales.
- [ ] **Regresión:** agregar producto, receta y semana, tachar, cantidades, eliminar y modo compra siguen funcionando, con y sin familia. Pasa el E2E de `/lista`.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

### HU-35 (SCRUM-60)

Ninguno validado todavía. Evidencia esperada: manual (cuentas registradas de prueba, con capturas), base (prueba SQL con `rollback`) y test (Vitest).

Criterios de la historia:

- [ ] **CA-01:** la vista de la familia muestra a los miembros con su nombre, su foto (por ahora, las iniciales o un ícono genérico) y si son administradores.
- [ ] **CA-02:** la lista se puede buscar por nombre y se carga por partes (20 por página, "Cargar más") en vez de traer a todos de una vez.
- [ ] **CA-03:** se identifica claramente quién es el administrador.

Casos de cada flujo:

- [ ] **Visibilidad:** un miembro y el administrador ven solo a su familia; alguien de otra familia o sin familia no ve a nadie; sin sesión y con sesión anónima: `42501`; `anon` no ejecuta la función.
- [ ] **Datos:** ninguna fila trae el correo; "Miembro sin nombre" e ícono genérico cuando no hay nombre; "Tú" en la fila propia.
- [ ] **Orden y páginas:** el administrador primero; la primera página más la segunda dan todos los miembros, sin repetidos.
- [ ] **Búsqueda:** sin distinguir mayúsculas; `%` y `_` como texto; sin resultados muestra el aviso; una búsqueda nueva vuelve a la primera página y descarta respuestas viejas.
- [ ] **Errores:** falla de carga con "Reintentar"; falla de "Cargar más" sin perder la lista.
- [ ] **Límites:** búsqueda de más de 60 caracteres, tamaño de página fuera de 1 a 50 y desplazamiento negativo se rechazan.
- [ ] Tests automáticos (Vitest) del camino feliz y de al menos un caso negativo o límite.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` pasan.

### HU-36 (SCRUM-61)

Validado el 2026-10-19 con la prueba SQL de la `026` (corrida completa en la base con `plpgsql.check_asserts` en `on`, terminó en `ok`) y con los tests automáticos (Vitest: 865 tests en 93 archivos). Prueba manual de la dueña de la historia con cuentas registradas (2026-10-19): CA-01, CA-02 y CA-04 con captura; CA-03 comprobado sin captura.

Criterios de la historia:

- [x] **CA-01:** solo el administrador de la familia ve la acción "Eliminar integrante" junto a cada miembro, excepto sobre sí mismo.
  - Manual, con captura: el admin ve el botón en las filas de B y C, y no en la suya.
  - Que un miembro no lo ve lo cubren los tests de pantalla; no se probó a mano.
- [x] **CA-02:** al eliminar, se pide confirmación explícita antes de ejecutar la acción.
  - Manual, con captura: «Cancelar» cierra el diálogo sin eliminar al integrante.
  - Escape y el clic afuera los cubren los tests; no se probaron a mano.
- [x] **CA-03:** al confirmar, el miembro pierde el acceso inmediato a las listas y los datos de la familia; sus listas y productos personales no se eliminan.
  - Manual, **sin captura**: B desaparece de la familia, pierde el acceso y conserva sus datos personales.
  - En la base lo comprueba la prueba SQL de la `026`.
- [x] **CA-04:** se muestra un mensaje de confirmación después de eliminar. Manual, con captura: aparece «Integrante eliminado correctamente».

Casos de cada flujo:

- [x] **Resultados:** `removed`, `member_not_found`, `cannot_remove_self` y `not_admin` en la prueba SQL y en el servicio.
- [x] **Permisos:** sin sesión y anónimo → `42501`; un miembro que no es administrador recibe `not_admin` sin cambios; un administrador no puede eliminar a alguien de otra familia; `delete` directo sobre `household_members` sigue rechazado (prueba SQL).
- [x] **Acceso:** después de eliminarla, la persona no ve la familia, ni su lista general ni sus ítems; los demás miembros siguen viéndolos (prueba SQL).
- [x] **Conservación:** la lista personal, las recetas, los planes y las compras de la persona siguen iguales; la lista de la familia conserva lo que agregó (prueba SQL).
- [ ] **Enlace (D1):** eliminar a alguien no cambia el enlace de la familia (mismo token y vencimiento); "Generar enlace nuevo" sigue funcionando. Comprobado por la prueba SQL que el token y el vencimiento no cambian; falta comprobar «Generar enlace nuevo» a mano.
- [x] **Sin notificaciones (D2)** y **textos de D3** exactamente como se aprobaron (no hay ningún envío; los textos están en `HOUSEHOLD_REMOVE_MEMBER_TEXT` y los usan los tests de pantalla).
- [ ] **Concurrencia:** eliminar a alguien que está saliendo, o a quien el administrador le pasa el rol al mismo tiempo, nunca deja la familia sin administrador ni con dos.
- [x] **Doble clic y cancelar:** una sola llamada; cerrar el diálogo no llama a la base (tests del hook y de la pantalla; en la base, la segunda llamada responde `member_not_found`).
- [x] **Nombres:** "Miembro sin nombre" si no tiene; ningún correo ni id en la página (tests del hook y de la pantalla).


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

### SCRUM-58

- **Listas compartidas (HU-34b, SCRUM-59):** no se implementa ni se decide qué pasa con listas compartidas al salir.
- **Ver a todos los miembros (HU-35, SCRUM-60):** `get_household_members()` es solo para el administrador y solo para elegir; la pantalla de miembros es HU-35.
- **Eliminar a otro miembro (HU-36)**, transferir el rol sin salir, renombrar o eliminar la familia a propósito.
- **La pantalla de Perfil (HU-30):** la opción vive en `/household`.
- **Borrar la cuenta:** el caso "el único administrador borra su cuenta" (deuda M1) sigue fuera.
- Cambios en el login, el `SessionGuard` o las migraciones existentes.

### SCRUM-59

- Implementar la parte A dentro de esta historia sin aprobación del equipo, o cambiar el alcance en Jira por cuenta propia.
- Conservar la lista de una sesión anónima al registrarse (D9; ticket aparte según SCRUM-49).
- Sublistas por fecha y listas privadas: no existen todavía; la decisión se extenderá a ellas cuando existan.
- Ver a todos los miembros (HU-35), eliminar miembros (HU-36) y gastos por familia (HU-38).
- El onboarding de DESIGN.md §7.7: la pregunta vive en los flujos de `/household` y `/invitacion/<token>`.

### SCRUM-60

- La foto real del perfil y editarla (HU-30).
- Eliminar a un miembro (HU-36) o cambiar su rol.
- Mostrar correos, fecha de unión u otros datos de la cuenta.
- Ordenar o filtrar por otro criterio que no sea el nombre.
- Cambiar `get_household_members()` o el diálogo de salir (SCRUM-58).

### SCRUM-61

- Notificar a la persona eliminada (D2).
- Invalidar un enlace "de la persona eliminada" (D1): el modelo tiene un solo enlace por familia. Haría falta un enlace por persona o registrar qué enlace usó cada quien.
- Impedir que vuelva a unirse, con el enlace vigente o con uno nuevo (lista de bloqueados).
- Transferir el rol sin salir, tener varios administradores, renombrar o eliminar la familia.
- Eliminar a varias personas a la vez.
- Mover a la lista personal de la persona lo que agregó a la lista de la familia.
- La foto de perfil (HU-30).

## 15. Notas de implementación

- **Número de la migración (SCRUM-56):** es la `011` porque la `009` (SCRUM-123, `009_close_store_preferences_writes.sql`) y la `010` (SCRUM-96, `010_delete_recipes.sql`) ya existen en `develop`. Se escribió primero como `010` y se renombró al sincronizar la rama con `develop` el 2026-10-03. En la base compartida ya estaba aplicada: el nombre del archivo no cambia nada ahí.
- **Cómo se obtuvo la sesión de prueba (SCRUM-56):** cuando se probó (2026-10-01 y 2026-10-02), el login (SCRUM-45) todavía no estaba en la rama de SCRUM-56. Se creó un usuario confirmado en Supabase Auth y su sesión se cargó en el navegador. El login (`/login`) entró con la sincronización del 2026-10-03; probar `/household` entrando por ahí queda pendiente.
- **Límite de otra historia (detectado el 2026-09-29):** `/registro/verificado` no guardaba la sesión del usuario que verifica su correo. Ya no impide llegar con una cuenta registrada: desde la sincronización del 2026-10-03 existe el login (`/login`, SCRUM-45).
- **Deuda para HU-34/HU-34c (M1):** si se borra la cuenta del único administrador, su membresía se borra pero la familia y su enlace quedan. Con SCRUM-57, alguien podría unirse a esa familia sin administrador mientras el enlace siga vigente; se resuelve con HU-34c.
- **Tests automáticos:** cuando se hizo SCRUM-56 el proyecto no tenía runner de tests, así que sus casos se validaron a mano y sus tests quedaron pendientes. Vitest llegó a `develop` con SCRUM-128 (PR #36) y la Definition of Done ahora exige tests (CONTRIBUTING §7): SCRUM-57 los incluye ([plan.md](plan.md#pruebas)). Los de SCRUM-56 siguen pendientes y no son parte de esta historia.
- **E2E (Playwright, SCRUM-129):** SCRUM-57 no lleva E2E (decisión de la dueña de la historia). El soporte de `e2e/` usa usuarios anónimos y este flujo necesita cuentas registradas en la base compartida; queda cubierto por tests automáticos, pruebas en la base y pruebas manuales. Ver [plan.md](plan.md#pruebas).
- **Cómo se obtuvo la sesión de prueba (SCRUM-57):** en el entorno local `/login` no permite entrar porque falta `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` en `.env.local` (configuración de SCRUM-45, no de esta historia): sin esa clave el widget de reCAPTCHA no aparece y el botón queda deshabilitado. Las sesiones de las cuentas de prueba se cargaron en el navegador desde la consola, sin cambiar código ni Supabase. Probar el flujo entrando por `/login` queda pendiente.
- **Riesgo aceptado:** el token viaja en la URL (`/invitacion/<token>`), así que queda en el historial del navegador y en los logs de acceso del hosting. Es propio de un "link de invitación"; lo mitigan el vencimiento de 7 días, la regeneración y `referrer: "no-referrer"`.
- **Spec reorganizada en SCRUM-57** con una subsección por historia en cada sección, como `features/recipes/specs/SPEC.md`. El contenido de SCRUM-56 no cambió, solo se ubicó bajo su subsección.
- **Contrato pendiente para HU-34b (SCRUM-59):** HU-34c no modifica ninguna lista al salir. Hoy no hay listas compartidas con una familia (`household_id` siempre `null` en `lists`, `recipes` y `meal_plans`), así que el usuario conserva todo. Cuando HU-34b permita compartir listas, tiene que decidir qué pasa con ellas cuando su dueño sale de la familia (quedan en la familia o vuelven a ser personales) y ajustar `leave_household` en una migración nueva.
- **Nombres de los miembros (SCRUM-58):** no hay tabla de perfiles; el nombre está en los metadatos de Supabase Auth (`name`, guardado por el registro). Las cuentas creadas desde el panel de Supabase pueden no tenerlo: se muestran como "Miembro sin nombre". Decisión de la dueña de la historia (2026-10-10): nunca mostrar correos, ni enmascarados.
- **Deuda M1 sigue abierta:** si el único administrador borra su cuenta (no sale con `leave_household`), la familia queda sin administrador. HU-34c cubre la salida voluntaria, no el borrado de cuentas.
- **SCRUM-59, specs (2026-10-10):** las subsecciones de SCRUM-59 se agregan sobre `develop`, que no tiene las de SCRUM-58. Cuando se mergee la #63 y se traiga `develop` a esta rama, los tres specs de `features/household/` van a tener conflictos en los mismos lugares: se resuelven conservando las subsecciones de las dos historias.
- **SCRUM-59, textos:** los de la historia usan voseo y "household"; la app usa tú y "familia" (D8).
- **SCRUM-59, alcance:** la parte A (lista general de la familia) cambia el control de acceso de toda la lista general. Necesita `security-reviewer` antes de aplicarse y la aprobación del equipo antes de empezar.
- **SCRUM-60, decisiones (2026-10-17):** iniciales o ícono genérico en vez de foto (HU-30), cualquier miembro consulta solo su familia, 20 por página con "Cargar más", búsqueda automática con debounce y la etiqueta "Tú". Se agrega una función nueva en vez de cambiar `get_household_members()`, porque esa la usa el diálogo de salir (SCRUM-58) y es solo del administrador.
- **SCRUM-61, specs (2026-10-18):** las subsecciones de SCRUM-61 se escriben sobre `develop`, que todavía no tiene las de SCRUM-60 (#68). Cuando se mergee la #68 y se traiga `develop` a esta rama, los tres specs de `features/household/` van a tener conflictos en los mismos lugares: se resuelven conservando las subsecciones de las dos historias.
- **SCRUM-61, número de la migración:** `026`, verificada libre el 2026-10-19: `develop` tiene la `025` (SCRUM-60) y la `028` (SCRUM-28), y la `027` es de SCRUM-69 (#70). Se revisa otra vez antes del merge.
- **SCRUM-61, sin E2E:** por la misma razón que SCRUM-57: el soporte de `e2e/` usa usuarios anónimos y este flujo necesita tres cuentas registradas reales. Queda cubierto por la prueba SQL de la `026` (en la base), los tests automáticos y las pruebas manuales.
- **SCRUM-61, concurrencia:** eliminar a alguien mientras sale, o mientras el admin le pasa el rol, no se puede reproducir en una sola transacción. Queda cubierto por el diseño (mismo orden de bloqueos que salir y unirse, y relectura del rol con el bloqueo tomado) y por la revisión de seguridad; el caso de §13 sigue sin marcar.
- **SCRUM-61, merge de `develop` (2026-10-19):** se trajo `develop` con SCRUM-60 a esta rama (`e5dd9c4`). Los tres specs conservan las subsecciones de las dos historias y no quedaron marcas de conflicto.

