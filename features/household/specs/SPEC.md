# Feature: Household — crear familia, enlace de invitación y unirse

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-56 / HU-33](https://tacha.atlassian.net/browse/SCRUM-56): crear link de invitación al household. Sprint 2, mergeada.
- [SCRUM-57 / HU-34](https://tacha.atlassian.net/browse/SCRUM-57): unirse a un household por link. Sprint 2, en curso.
- [SCRUM-59 / HU-34b](https://tacha.atlassian.net/browse/SCRUM-59): decidir qué hacer con la lista personal al unirse o crear un household. Sprint 4, en planificación (ver [§2](#2-alcance), con una parte que necesita aprobación del equipo).

El cómo está en [plan.md](plan.md) y los pasos en [tasks.md](tasks.md).

Terminología: en el código, la base y la ruta se usa `household`; en la interfaz, en español, se muestra **"familia"** y **"enlace"** (el texto de las historias dice "household" y "link").

## 1. Objetivo

### SCRUM-56

Que el administrador de una familia (household) genere un enlace de invitación persistente y con vencimiento, para que otras personas se unan sin invitarlas una por una por correo. El enlace se guarda en la base, sigue disponible al recargar la página, se puede copiar y regenerar, y al regenerarlo el anterior deja de existir.

Como ninguna otra historia crea households y sin uno no hay administrador, esta historia incluye la **creación mínima de la familia**: un usuario registrado sin familia escribe un nombre y queda como administrador.

### SCRUM-57

Que una persona con cuenta registrada use el enlace (o el código) que le compartió el administrador para entrar a esa familia como miembro, sin más pasos que confirmar con un botón. Si el enlace venció, ya no existe o la persona ya tiene familia, se le explica qué pasó y no se toca ninguna membresía.

### SCRUM-59

Que una persona que ya usaba Tacha por su cuenta y crea una familia o se une a una decida, **una sola vez**, si su lista personal sigue siendo solo suya o pasa a la familia, para no perder lo que ya tenía ni compartir algo que prefiere privado. Las listas que cree después se comparten con la familia sin volver a preguntar.

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

### SCRUM-59

| Entrada | Tipo | De dónde |
|---|---|---|
| Sesión registrada | `boolean` | `hasRegisteredSession()` (reutilizado; nunca `ensureSession()` en este flujo) |
| Familia recién creada o unida | resultado de `create_household` / `accept_household_invite` (`joined`) | Flujos de SCRUM-56 y SCRUM-57 |
| ¿Tiene lista general personal con contenido? | `boolean` | A definir en el plan (lectura de su lista general con `household_id` nulo) |
| ¿Ya decidió en esta membresía? | `boolean` | A definir en el plan (D5; nombre de columna o tabla sin decidir) |
| Opción elegida | "mantener" o "compartir" | Botones de la pregunta |

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

### SCRUM-59

- Muestra la pregunta en el momento que fija CA-01, solo si se cumplen D1 y D9.
- Guarda la decisión en la base, asociada a la membresía (D5).
- **Mantener:** no cambia ninguna lista; `/lista` muestra la personal en su propia sección (D4).
- **Compartir:** los ítems de la lista personal quedan en la lista de la familia y el resto de los miembros los ve y edita de inmediato (CA-04).
- Desde la decisión, agregar productos, recetas o la semana del plan va a la lista de la familia (CA-05, parte A).

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

**Reglas de seguridad (no negociables):**

10. Quién decide, sobre qué listas y en qué familia lo resuelve la base a partir de `auth.uid()` y de su membresía: el cliente nunca manda `household_id`, `owner_id` ni ids de listas ajenas.
11. Una persona de otra familia, alguien que ya salió o un usuario anónimo no puede leer ni escribir la lista de una familia.
12. Nadie puede asociar una lista a una familia ajena desde el cliente.
13. Compartir es atómico: o pasan todos los ítems según las reglas de T1, o no cambia nada.
14. La pregunta se responde una sola vez por membresía: un doble clic o una segunda pestaña no comparten dos veces.

**Pendientes técnicos que bloquean la implementación** (propuestas, sin decidir):

- **T1. Reglas para compartir.** `list_items` tiene `quantity_requested`, `checked_at`, `checked_by`, `purchase_session_id` y `quantity_bought`, y es único por (`list_id`, variante). `list_item_recipe_requirements` es único por (`list_item_id`, `recipe_id`, `quantity_unit`). Propuesta:
  - pasan solo los ítems pendientes;
  - con la misma variante, se suman las cantidades pedidas en una sola fila;
  - los requisitos de receta se combinan sumando lo necesario y lo que falta;
  - lo tachado o ligado a una compra personal se queda en la lista personal como historial, para no mezclar gastos personales con los de la familia (HU-38).
- **T2. Lista personal después de "Mantener":** ¿se le pueden seguir agregando productos, o solo tachar, cambiar cantidades y eliminar? Agregar obliga a elegir lista desde el catálogo, las recetas y el plan.
- **T3. Lista de la familia cuando la familia se elimina** (sale el admin único, SCRUM-58):
  - borrarla en cascada exige actualizar la prueba SQL de SCRUM-58, que hoy comprueba que esas listas sobreviven;
  - dejarla con `household_id` en nulo puede chocar con el índice de una lista general personal por dueña y hacer fallar `leave_household`.
- **T4. Modo compra sobre la lista de la familia:** hoy una compra solo puede ser personal (`household_id` y `list_id` nulos). ¿Entra en la parte A?
- **T5. Cómo se propone y registra la separación A/B** (ticket, tamaño, sprint y responsable).

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

### SCRUM-59

Propuesta, a confirmar en el plan de implementación:

| Estado | Cuándo | Qué se ve |
|---|---|---|
| sin pregunta | Anónimo, sin lista personal con contenido o ya decidió | La pantalla normal de la familia |
| comprobando | Después de crear o unirse, mientras se revisa si corresponde preguntar | Spinner |
| preguntando | Corresponde decidir | La pregunta con sus dos opciones |
| guardando | Esperando a la base | Opciones deshabilitadas |
| falló | Error de red o de la base | Mensaje de error; se puede reintentar |

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

### SCRUM-59

- Si no se puede guardar la decisión, mensaje de error y reintento (texto a confirmar, por ejemplo "No se pudo guardar tu decisión. Intenta de nuevo.").
- Si la comprobación inicial falla, no se bloquea el uso de la familia: la pregunta se vuelve a ofrecer más tarde (detalle en el plan).
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

### SCRUM-59

Según DESIGN.md §7.15, paso agregado el 2026-08-19:

- Una pantalla corta (o un paso dentro del flujo) con la pregunta **"¿Qué quieres hacer con tu lista actual?"** y dos opciones igual de visibles, como tarjetas grandes tocables: **"Mantenerla solo para mí"** y **"Compartirla con mi familia"**.
- Un texto breve que aclare que la decisión aplica a todas sus listas personales de una vez y no se vuelve a preguntar (texto exacto a confirmar).
- En `/lista`, si eligió mantenerla: una sección personal claramente separada de la lista de la familia (D4; diseño a definir).

Los textos de la historia usan voseo ("querés") y "household"; se adaptan al tono de la app (tú, "familia"), como aprobó la dueña de la historia (D8).

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

### SCRUM-59

- Las dos opciones son botones o tarjetas con nombre accesible y el mismo peso visual; ninguna está preseleccionada.
- Se puede elegir solo con teclado. Mientras guarda, las opciones quedan deshabilitadas y el estado se anuncia.
- El error se anuncia con `role="alert"` y la confirmación final en una zona `role="status"`.

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

### SCRUM-59

- **Supabase:** cualquier cambio de datos va en migraciones nuevas, con su prueba SQL en `supabase/tests/` y el procedimiento de `supabase/README.md`. Nunca se edita una migración aplicada. Número provisional `024`, a verificar ([plan.md](plan.md#scrum-59-decidir-qué-hacer-con-la-lista-personal)).
- **Funciones de lista que hoy buscan la lista general por `owner_id` y `household_id is null`** (parte A): `add_item_to_general_list` (`004`, reescrita en `015`), `add_recipe_to_general_list` (`013`, `015`), `get_recipe_coverage` (`017`), y `add_week_to_general_list` y `add_week_ingredients_to_list` (`022`). Todas son `security invoker`, así que la RLS decide.
- **Cliente:** el servicio de `/lista` (`getGeneralList()` en `features/shopping-list/services/shopping-list.service.ts`) usa `ensureSession()` y filtra `household_id` nulo. La pregunta usa `hasRegisteredSession()`.
- La lista general se sigue creando al agregar el primer producto, no al abrir la pantalla.

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

### SCRUM-59

| Dependencia | Estado (2026-10-10) | Efecto |
|---|---|---|
| SCRUM-56 y SCRUM-57 | Mergeadas en `develop` | Los dos flujos donde aparece la pregunta |
| SCRUM-58 (HU-34c, salir) | PR #63 sin mergear, QA manual sin completar | D6 y T3. Con acceso por membresía, salir quita el acceso sin cambiar `leave_household`. Las dos historias modifican `Household.tsx`, `useHouseholdViewModel.ts` y los specs de `features/household/` |
| Feature `shopping-list` (SCRUM-62, 66, 67 y otras) | En `develop` | La parte A cambia su servicio, sus RPC y sus políticas; el E2E de `/lista` es regresión obligatoria |
| Recetas y plan (SCRUM-97, 100, 101) | En `develop` | Sus funciones que agregan a la lista general cambian de destino |
| SCRUM-49 (anónimos) | En `develop` | D9: migrar los datos anónimos es otro ticket |
| Aprobación del equipo (D7, T5) | Pendiente | Define si la parte A es un ticket aparte |

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

### SCRUM-59

**Lo que existe hoy** (verificado el 2026-10-10 en `develop`, `58d7a6a`):

- **`public.lists`** (`004`): `id`, `owner_id` (por defecto `auth.uid()`), `household_id` sin FK, `type` (`general`, `date` o `private`), `status` y `created_at`.
  - Índice único `lists_one_general_per_owner (owner_id) where type = 'general' and household_id is null`.
  - Políticas `"owner reads own lists"` y `"owner creates own lists"`; esta última exige `household_id is null` y `type = 'general'`.
- **`public.list_items`:** único por (`list_id`, `product_catalog_variant_id`), `quantity_requested`, `checked_at` y `checked_by` (`015`), `purchase_session_id` y `quantity_bought` (`016`). Políticas de lectura, inserción, actualización y borrado solo para la dueña de la lista (`004`, `012`).
- **`public.list_item_recipe_requirements`** (`013`): único por (`list_item_id`, `recipe_id`, `quantity_unit`); políticas solo de la dueña.
- **`public.purchase_sessions`** (`016`): `household_id` (FK `on delete set null`) y `list_id`. La política para iniciar exige que los dos sean nulos.
- **`public.household_members`** (`011`): no tiene dónde guardar la decisión.

**Contratos nuevos:** a definir en el plan, después de resolver T1 a T5. Esta spec no fija nombres de tablas, columnas ni RPC (D5).

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

### HU-34b (SCRUM-59)

Ninguno validado todavía. Evidencia esperada: manual (cuentas registradas de prueba, con capturas), base (pruebas SQL con `rollback`) y test (Vitest).

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

### SCRUM-59

- Implementar la parte A dentro de esta historia sin aprobación del equipo, o cambiar el alcance en Jira por cuenta propia.
- Conservar la lista de una sesión anónima al registrarse (D9; ticket aparte según SCRUM-49).
- Sublistas por fecha y listas privadas: no existen todavía; la decisión se extenderá a ellas cuando existan.
- Ver a todos los miembros (HU-35), eliminar miembros (HU-36) y gastos por familia (HU-38).
- El onboarding de DESIGN.md §7.7: la pregunta vive en los flujos de `/household` y `/invitacion/<token>`.

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
- **SCRUM-59, specs (2026-10-10):** las subsecciones de SCRUM-59 se agregan sobre `develop`, que no tiene las de SCRUM-58. Cuando se mergee la #63 y se traiga `develop` a esta rama, los tres specs de `features/household/` van a tener conflictos en los mismos lugares: se resuelven conservando las subsecciones de las dos historias.
- **SCRUM-59, textos:** los de la historia usan voseo y "household"; la app usa tú y "familia" (D8).
- **SCRUM-59, alcance:** la parte A (lista general de la familia) cambia el control de acceso de toda la lista general. Necesita `security-reviewer` antes de aplicarse y la aprobación del equipo antes de empezar.
