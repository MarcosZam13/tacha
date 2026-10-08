# Plan técnico: household

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md). Las secciones de arriba son de SCRUM-56 (crear household y link de invitación); la de SCRUM-57 está al final: [unirse a una familia con el enlace](#scrum-57-unirse-a-una-familia-con-el-enlace).

> **Verificado el 2026-09-29** contra el repo (rama al día con `develop` en `f4eae2f`): no existen `households`, `household_members`, `household_invite_links`, un rol admin, ni ninguna ruta de perfil o household. Migraciones existentes: `001` a `008`. `gen_random_uuid()` ya se usa en `004` y `006`. El único precedente de `security definer` es `003`.

**Cada etapa se revisa y se aprueba antes de empezar la siguiente.** Ninguna etapa se da por terminada sin que la persona dueña de la historia la haya revisado.

## Archivos

```
app/household/page.tsx                    ruta delgada: metadata + <Household />

features/household/
  Household.tsx                           pantalla ("use client"): estados, formulario o tarjeta,
                                          zonas role="status" y role="alert". Solo presentación
  components/
    HouseholdCreateForm.tsx               nombre + "Crear mi familia". Solo presentación
    HouseholdInviteLinkCard.tsx           Chip Activo/Expirado, link, vencimiento, botones (los mensajes viven en Household.tsx)
    models/HouseholdCreateFormProps.interface.ts
    models/HouseholdInviteLinkCardProps.interface.ts
  hooks/
    useHouseholdViewModel.ts              Facade de la pantalla: sesión, membresía, rol, crear household
                                          (estado + validación del nombre); usa useHouseholdInvite y le
                                          entrega a la pantalla solo la sección del link (props de la
                                          tarjeta ya armadas en `invite.card`)
    useHouseholdInvite.ts                 link: cargar, generar, regenerar, expiración, copiar, mensajes,
                                          respuestas fuera de orden, conservar el link si falla
  models/
    HouseholdInvite.interface.ts          { expiresAt, url }
    HouseholdMembership.interface.ts      { householdName, role }
  services/
    household.service.ts                  sesión, membresía, create_household, get/create_household_invite
  constants/
    household.constants.ts                nombres de RPC/tablas, roles, límite del nombre, estados, textos,
                                          ruta del link, formato de fecha, tiempo de "¡Copiado!"
  specs/  SPEC.md · plan.md · tasks.md

supabase/migrations/011_create_households_and_invites.sql
types/database.types.ts                   entradas de la 011 escritas a mano (como hizo SCRUM-94) y verificadas
                                          contra la base real con consultas de solo lectura
docs/documento-proyecto.md                §4.1 y §6
```

### Punto de partida

La versión anterior de esta historia era una vista previa local (token generado en el navegador, sin base). De esos archivos:

| Archivo actual | Qué pasa |
|---|---|
| `components/HouseholdInviteLinkCard.tsx` y sus props | Se mantienen. Se quita la zona `role="status"` y la prop `feedbackMessage`: pasan a `Household.tsx`, que siempre está montada (la tarjeta se desmonta al regenerar y el aviso no se anunciaría) |
| `models/HouseholdInvite.interface.ts` | Queda `{ expiresAt, url }`: sin `token` (va dentro de `url`) ni `createdAt` (no se muestra) |
| `constants/household-invite.constants.ts` | Se renombra a `household.constants.ts`. Se quitan `TIME_MS.DURATION` (la duración vive en la base) y `TEXT.PREVIEW_NOTICE`. Se agregan `HOUSEHOLD_DB`, `HOUSEHOLD_ROLE`, `HOUSEHOLD_FORM_LIMIT`, estados y textos nuevos |
| `hooks/useHouseholdInviteViewModel.ts` | Se renombra a `useHouseholdInvite.ts` (hook de dominio, como `useRecipeEditor` y `useShoppingList`). Se conservan expiración y copia; se agregan la carga del link, las respuestas fuera de orden y conservar el link si falla |
| `services/household-invite.service.ts` | Se renombra a `household.service.ts` y se reescribe: deja de ser un mock |

## Datos

Todo en `supabase/migrations/011_create_households_and_invites.sql`, con el formato de `004`, `006` y `007` (encabezado con el ticket, `public.` explícito, RLS activado al crear, `revoke` para `anon`). **El SQL se escribe en la etapa 2 y se revisa antes de crearlo.**

### Tablas

**`households`**
| Columna | Tipo / restricción | Para qué |
|---|---|---|
| `id` | `uuid` PK, `default gen_random_uuid()` | Identifica el household |
| `name` | `text not null`, `check` de largo (recortado ≥ 1 y total ≤ límite; mismo estilo que `recipes_name_check` en `008`) | Nombre visible |
| `created_at` | `timestamptz not null default now()` | Convención del repo |

**`household_members`**
| Columna | Tipo / restricción | Para qué |
|---|---|---|
| `user_id` | `uuid` **PK**, → `auth.users (id) on delete cascade` | Quién. Que sea la PK garantiza **un household por usuario** |
| `household_id` | `uuid not null`, → `households (id) on delete cascade` | A qué household pertenece |
| `role` | `text not null check (role in ('admin', 'member'))` | Rol dentro del household. `member` se usará desde HU-34 |
| `created_at` | `timestamptz not null default now()` | Convención |

**`household_invite_links`**
| Columna | Tipo / restricción | Para qué |
|---|---|---|
| `household_id` | `uuid` **PK**, → `households (id) on delete cascade` | **Un solo link por household**. El cascade borra el link junto con su household (HU-34c) |
| `token` | `uuid not null unique` | El link. Único para que HU-34 pueda buscarlo |
| `expires_at` | `timestamptz not null` | Vencimiento, fijado por la RPC |
| `created_at` | `timestamptz not null default now()` | Convención |

No se agregan: `created_by` (con un solo admin es redundante y ningún CA lo usa; se documenta la diferencia con documento-proyecto §6), un índice de "un solo admin por household" (lo necesita HU-34c al transferir el rol, no esta historia), historial de links ni `status`.

### RLS y permisos

- `households`: `select` para `authenticated` solo si existe una membresía propia en ese household. Sin políticas de escritura.
- `household_members`: `select` para `authenticated` solo de la fila propia (`user_id = (select auth.uid())`). Sin recursión (la política no consulta la misma tabla). Ver a los demás miembros es HU-35.
- `household_invite_links`: RLS activado y **ninguna política**.
- `revoke all ... from public, anon, authenticated` en las tres tablas (quita los permisos que Supabase da por defecto) y después `grant select` a `authenticated` solo en `households` y `household_members`. `household_invite_links` queda sin ningún permiso para el cliente. Solo las RPC escriben.

### RPC

Las tres: `security definer`, `set search_path = ''`, nombres completamente calificados, `revoke execute ... from public, anon`, `grant execute ... to authenticated`. Todas rechazan `auth.uid()` nulo y usuarios anónimos (`auth.jwt() ->> 'is_anonymous'`) con un error de permisos genérico. Ninguna recibe `household_id`.

| RPC | Qué hace | Devuelve |
|---|---|---|
| `create_household(household_name text)` | Inserta `households` y la fila de `household_members` con `role = 'admin'` para quien llama, en una transacción. Si ya tiene household, falla por la PK de `household_members` | El `id` del household (la UI no lo usa: vuelve a cargar la membresía) |
| `create_household_invite()` | Obtiene el household donde quien llama es `admin` (si no, error). Upsert en `household_invite_links` por `household_id`: token `gen_random_uuid()`, `expires_at = now() + interval '7 days'`, `created_at = now()` | `token`, `expires_at` |
| `get_household_invite()` | Mismo chequeo de admin. Lee el link del household, vigente o vencido | `token`, `expires_at`, o nada si no hay link |

Por qué `security definer`: las tablas no permiten escribir desde el cliente, y la de invitaciones ni siquiera se puede leer. Con `security invoker` habría que abrir políticas de `insert` en `household_members`, y un usuario podría insertarse como `admin` de cualquier household (escalamiento de privilegios, security-practices §3). La función es la única puerta y valida todo adentro. Precedente: `get_recent_staging` en `003` (con la diferencia de que aquí se usa `search_path = ''`, como `007`).

### Cómo se prueba la base antes de tener UI

En el SQL Editor, simulando un usuario dentro de una transacción (`set local role authenticated` + `set local request.jwt.claims` con un `sub` y `is_anonymous`), y con `rollback` al final para no dejar datos:

- anónimo → `create_household` y `create_household_invite` fallan;
- registrado sin household → `create_household` crea household + fila `admin`; un segundo intento falla;
- admin → `create_household_invite` devuelve token y `expires_at` ≈ `now()` + 7 días; regenerar deja una sola fila y el token anterior ya no existe;
- `member` (insertado a mano dentro de la transacción) → `create_household_invite` y `get_household_invite` fallan;
- `select` directo a `household_invite_links` como `authenticated` → sin filas / sin permiso.

## Flujo

1. **Entrar:** `app/household/page.tsx` → `Household.tsx` → `useHouseholdViewModel` → `hasRegisteredSession()` (`getSupabaseClient().auth.getSession()`; `false` si no hay sesión o `is_anonymous`). Si no: estado "sin cuenta". Si sí: `getHouseholdMembership()` (`household_members` con `households(name)`, filtrado por el `user_id` de la sesión y `maybeSingle()`; RLS además solo deja ver la fila propia) → sin household / member / admin. Carga con bandera de cancelación, como `useRecipeEditor`.
2. **Crear household:** `HouseholdCreateForm` → `onSubmit` del Facade → valida el nombre (vacío, largo) → `createHousehold(name)` → RPC → vuelve a cargar la membresía → admin.
3. **Cargar el link:** `useHouseholdInvite(isAdmin)` → si es admin, `getHouseholdInvite()` → `null` (botón "Generar enlace de invitación") o `HouseholdInvite`.
4. **Generar / regenerar:** `handleGenerate` → contador de pedido en `useRef` → estado `generating` (conserva el link anterior si había) → `createHouseholdInvite()` → si es la respuesta del último pedido: `ready` con el nuevo link (y aviso de reemplazo si había uno); si falla: `recoverAfterGenerateFailure` vuelve a leer el link con `getHouseholdInvite()` y muestra el vigente (sin error si es uno nuevo: la generación sí ocurrió; con error si es el mismo o no hay); si esa lectura también falla, estado `loadFailed` + error.
5. **Convertir la respuesta:** función privada en `household.service.ts`: `expiresAt = Date.parse(expires_at)`, `url = window.location.origin + HOUSEHOLD_ROUTE.INVITATION + '/' + token`.
6. **Expirar:** efecto en `useHouseholdInvite` que depende del link y de `expiryCheckedAt`: `setTimeout(expiresAt - Date.now())` (0 si ya pasó) → `setExpiryCheckedAt(Date.now())` → `isExpired = expiryCheckedAt >= expiresAt`. Solo para mostrar; la validez real está en la base.
7. **Copiar:** `handleCopy` → no hace nada sin link o con el link vencido → `navigator.clipboard.writeText(url)` → `copied` (se borra a los 2 s, un solo timer con cleanup) o `failed` (aviso con alternativa manual, se queda hasta el próximo intento).
8. **Mostrar mensajes:** `Household.tsx` tiene la zona `role="status" aria-live="polite"` siempre montada ("¡Copiado!" tapa el aviso de reemplazo mientras dura) y los `role="alert"` de errores.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Incluir la creación mínima del household en SCRUM-56 | Ticket aparte (SCRUM-56 quedaría en `on hold`) o un seed | Sin household no hay admin ni nada que invitar; el recorrido de historias-usuario.md asigna "Crear o unirme" a HU-33/HU-34 y DESIGN.md §7.15 tiene "Crear un household nuevo". Un seed dejaría la historia dependiendo de datos cargados a mano |
| Dos hooks: `useHouseholdViewModel` (Facade) + `useHouseholdInvite` | Un solo ViewModel | El hook del link ya tenía 186 líneas; con sesión, membresía y formulario pasaría de 250 (god ViewModel). Mismo patrón que `useRecipeEditorViewModel` + `useRecipeEditor` y `useShoppingListViewModel` + `useShoppingList`. Diferencia consciente: este Facade también guarda estado (membresía y formulario) y arma las props de la tarjeta; un tercer hook solo para la membresía sería sobrearquitectura |
| Formulario como mini (`HouseholdCreateForm`) | Escribirlo dentro de `Household.tsx` | Es una región visual distinta de la tarjeta (component-architecture §4), como `RecipeBasicsFields` en el editor de recetas. Estado y validación en el Facade, no en el componente (no se copia el patrón de `ReenvioCorreoForm`, que tiene su propio hook dentro de `components/`) |
| Sin `CreateHouseholdPayload` | Payload por operación | El repo usa Payload cuando la mutación recibe un objeto (`SaveRecipePayload`); con parámetros simples los pasa directos (`changeItemQuantity(itemId, quantityStep)`). Aquí es un string |
| Sin interfaces `Response` | Una por RPC | `create_household` no devuelve nada que la UI use (`Promise<void>`); las otras dos devuelven el modelo de dominio `HouseholdInvite`, como `addItemToGeneralList` devuelve `ShoppingListItem` |
| Sin `HouseholdContext.type.ts` | Unión exportada en `models/` | La unión de estados de la pantalla solo la usa el Facade: se declara ahí, como la unión de `useHouseholdInvite.ts`. Hacia afuera basta `HouseholdMembership` |
| Conversión privada en el servicio | `utils/toHouseholdInvite.ts` | Son dos líneas usadas por dos funciones del mismo archivo; `shopping-list.service.ts` convierte así. `utils/` queda para adaptadores con reglas propias (`toRecipeSummary`) |
| Token `uuid` con `gen_random_uuid()` | `gen_random_bytes(32)` | Ya se usa en `004` y `006`, sin extensiones; 122 bits aleatorios alcanzan para un link que vence en 7 días |
| Token en claro, tabla cerrada | Guardar solo su hash | Con hash el link no se puede volver a mostrar al recargar (rompe CA-03) y para copiarlo habría que regenerarlo, lo que invalida el que ya se compartió (choca con CA-04). La tabla no tiene políticas: solo el admin lo lee, vía RPC |
| `expires_at` en la base (`now()` + 7 días) | Calcularlo en el navegador | El reloj del cliente se puede cambiar; la duración queda en un solo lugar |
| Regenerar = upsert por `household_id` | Historial con `revoked_at` | El token viejo deja de existir en la misma operación; con dos clicks simultáneos queda una sola fila; ningún CA pide historial |
| Respuestas fuera de orden protegidas (contador en `useRef`) | Confiar en el orden | Con backend real, una respuesta vieja podría pisar a la nueva y mostrar un link que ya no existe |
| Si falla la regeneración, volver a leer el link vigente | Conservar el link anterior (primera versión) | La respuesta puede perderse después de que la base ya reemplazó el token: conservar el anterior mostraría como "Activo" un link que ya no existe (hallazgo B1 de `security-reviewer`, 2026-09-29). Mientras se regenera sí se sigue viendo el anterior |
| `role="status"` en `Household.tsx` | En la tarjeta | La tarjeta no existe mientras no hay link (y desaparece si la sección cambia de estado); una región que nace junto con su mensaje puede no anunciarse. En la pantalla está siempre montada |
| `getSession()` en vez de `ensureSession()` | `ensureSession()` como el resto del repo | `ensureSession()` crea un usuario anónimo si no hay sesión, y los anónimos no pueden tener household |
| Error genérico al crear el household | Distinguir el código de Postgres | El formulario solo aparece si el usuario no tiene household; el choque solo pasa con dos pestañas a la vez |
| Filtrar la membresía por el `user_id` de la sesión | Confiar solo en RLS | Cuando HU-35 deje ver a los demás miembros, `maybeSingle()` recibiría varias filas y la pantalla fallaría para todo el household (hallazgo M1 de la revisión final) |
| Errores de carga: indicar "Recarga la página para intentarlo de nuevo." | Botón de reintento | Mantiene la lógica simple; en esos estados no hay otra acción posible, y el texto anterior ("Intenta de nuevo") prometía una acción que la pantalla no ofrecía (hallazgo M2) |

## Etapas

Cada etapa termina con una revisión y la aprobación explícita antes de seguir.

1. **Specs:** reescribir SPEC, plan y tasks para la versión con base de datos.
2. **Migración 011 (diseño y revisión; escrita como 010 y renombrada al sincronizar con `develop`):** escribir el SQL de la sección [Datos](#datos); revisarlo con el subagente `security-reviewer` antes de aplicarlo.
3. **Aplicar y tipos:** la persona dueña de la historia aplica la migración en el SQL Editor (la base es compartida: avisar al equipo; desde SCRUM-134, con su fila del historial como dice [supabase/README.md#migraciones](../../../supabase/README.md#migraciones)), verifica los objetos y permisos, compara `types/database.types.ts` con la base real y prueba la base simulando usuarios ([ver arriba](#cómo-se-prueba-la-base-antes-de-tener-ui)).
4. **Constantes, modelos y servicio:** renombrar y ajustar constantes y servicio, ajustar `HouseholdInvite`, crear `HouseholdMembership`.
5. **Hooks:** renombrar y ajustar `useHouseholdInvite`; crear `useHouseholdViewModel`.
6. **Componentes, pantalla y ruta:** crear `HouseholdCreateForm` y sus props, ajustar la tarjeta, crear `Household.tsx` y `app/household/page.tsx`.
7. **Documentación:** `docs/documento-proyecto.md` §4.1 (creación del household en HU-33, anónimos) y §6 (columnas reales, token en claro con acceso cerrado, sin `created_by`).
8. **QA y revisiones:** pruebas manuales, `npx tsc --noEmit`, `npm run lint`, `npm run build`, subagentes `code-reviewer`, `security-reviewer` y `qa-checker`; marcar los CA en [SPEC.md](SPEC.md) según lo validado.

## Notas técnicas

- `setTimeout` acepta como máximo ~24,8 días (2^31 − 1 ms). Con 7 días no hay problema; si la base sube la duración por encima de eso, el timer vencería al instante.
- `navigator.clipboard` solo existe en contexto seguro (https o `localhost`); fuera de eso, copiar cae en el aviso con alternativa manual.
- `window.location.origin` se lee en el servicio, que solo se llama desde el navegador (nunca en el render del servidor).
- `getSession()` lee la sesión guardada sin validarla contra el servidor: solo decide qué mostrar. La validación real la hacen las RPC con `auth.uid()`.

## Deuda conocida

- **Sesión registrada desde la app:** mientras se construyó y probó SCRUM-56 no existía login (SCRUM-45), y `/registro/verificado` no guardaba la sesión del usuario verificado (borra el fragmento de la URL antes de que el cliente de Supabase lo lea; se le reportó a su responsable). Por eso las pruebas manuales de la pantalla usaron un usuario de prueba creado en Supabase Auth con su sesión cargada en el navegador. El login (`/login`) entró a esta rama al sincronizar con `develop` el 2026-10-03 y guarda la sesión con `auth.setSession`; falta probar `/household` entrando por ahí.
- **Resuelto:** migración 011 aplicada; objetos, permisos y firmas verificados en la base; `types/database.types.ts` comparado con la base real; sin sesión, crear la familia y CA-01 a CA-05 probados a mano en la pantalla el 2026-10-01 (antes de pasar los textos al español); el 2026-10-02 se repitió con los textos en español, con capturas, la parte del enlace (crear la familia no se repitió): fecha de vencimiento, copiar con confirmación, regenerar, el enlace se mantiene al recargar, enlace expirado y generar uno nuevo; y comprobado en la base que al regenerar queda una sola fila y el token anterior ya no existe; `tsc`, `lint` y `build` pasan.
- **Pendiente:**
  - base simulando usuarios: `member` (otro rol), anónimo, segundo household y lectura directa de `household_invite_links`;
  - casos borde y negativos de la pantalla: nombre vacío, nombre de 61 caracteres, doble click, falla del portapapeles, regeneración sin red;
  - copiar: pegar el enlace y compararlo con el mostrado, y que "¡Copiado!" desaparezca a los 2 s;
  - accesibilidad: todo el flujo solo con teclado y los anuncios del lector de pantalla;
  - entrar a `/household` con una sesión iniciada en `/login` (SCRUM-45).
- **El botón deshabilitado no es una garantía:** deshabilitar "Generar enlace de invitación" / "Generar nuevo enlace" durante la generación solo evita clicks repetidos en la UI. La garantía de un solo link por household es el upsert por la PK en la base.
- **Tests automáticos:** cuando se hizo SCRUM-56 no había runner en el repo. Vitest llegó con SCRUM-128 (PR #36, 2026-10-03), pero los tests de SCRUM-56 siguen pendientes. Ver [tasks.md](tasks.md#pendiente-cuando-el-proyecto-tenga-runner-de-tests).
- **Enlazar `/household`** desde el Perfil (HU-30), el sidebar y el onboarding cuando existan.
- **Integración con otras tablas:** FKs de `lists.household_id` y `recipes.household_id`, políticas de miembros en esas tablas, y la política de escritura por membresía en `household_store_preferences`: la migración `009` (SCRUM-123) ya cerró la escritura pública, pero dejó pendiente esa política (`docs/catalogo-scraping/TICKET-seguridad-household-store-preferences.md`). Ya es posible una vez aplicada la migración `011`, pero corresponde a sus historias o dueños: se avisa al equipo.

## SCRUM-57: unirse a una familia con el enlace

> **Verificado el 2026-10-03** contra `develop` en `1d85109` (con SCRUM-56 mergeada): existen `households`, `household_members` (PK `user_id`) y `household_invite_links` (PK `household_id`, `token uuid unique`), sin políticas ni permisos en la de invitaciones y sin `insert` para el cliente en `household_members`. No existe `app/invitacion/`. `HOUSEHOLD_ROUTE.INVITATION = "/invitacion"` y los enlaces generados apuntan a `/invitacion/<token>`. `/login` (SCRUM-45) guarda la sesión con `auth.setSession` y siempre vuelve a `/`. Migraciones en `develop`: `001` a `011`.
>
> **Revisado el 2026-10-04**, con la rama sincronizada con `develop` (`b6aaf68`, merge `c4f4245`): ya están en `develop` Vitest (SCRUM-128, PR #36), Playwright (SCRUM-129, PR #40), el `SessionGuard` (SCRUM-49, PR #42) y la migración `012_delete_list_items.sql` (SCRUM-65, PR #34). Nada de eso tocó `features/household`. Las secciones de abajo ya tienen esos cambios.

### Archivos

```
app/invitacion/[token]/page.tsx              nueva: ruta delgada. await params, metadata (título y
                                             referrer "no-referrer") y <HouseholdInvitation token={token} />

features/household/
  HouseholdInvitation.tsx                    nueva: pantalla de la invitación ("use client"). Solo presentación:
                                             título, texto, "Unirme", resultado, Link a /login o a /household,
                                             zonas role="status" y role="alert" siempre montadas
  Household.tsx                              + <HouseholdJoinForm> en el estado sin familia, junto al de crear
  components/
    HouseholdJoinForm.tsx                    nuevo: "Unirme con una invitación" (Input + "Continuar"). Solo presentación
    models/HouseholdJoinFormProps.interface.ts   nuevo
  hooks/
    useHouseholdInvitationViewModel.ts       nuevo: recibe el token; formato → sesión → ready/noAccount;
                                             onJoin con guarda de doble clic (useRef); traduce el resultado a estado
    useHouseholdJoinForm.ts                  nuevo: valor del campo, error, extraer el token y navegar
    useHouseholdViewModel.ts                 + compone useHouseholdJoinForm y entrega `join` con las props del formulario
  utils/
    extractInviteToken.ts                    nuevo: texto pegado o segmento de la URL → token o null (función pura)
  services/
    household.service.ts                     + acceptHouseholdInvite(inviteToken) → HouseholdJoinResultType
  constants/
    household.constants.ts                   + RPC ACCEPT_HOUSEHOLD_INVITE, HOUSEHOLD_JOIN_RESULT (+ tipo),
                                               HOUSEHOLD_JOIN_STATUS, HOUSEHOLD_JOIN_TEXT, HOUSEHOLD_JOIN_FORM_ERROR,
                                               patrón del token, HOUSEHOLD_ROUTE.HOUSEHOLD y LOGIN
  specs/  SPEC.md · plan.md · tasks.md       actualizados (esta sección)
  tests/                                     nueva carpeta (ver "Pruebas")
    extractInviteToken.test.ts               función pura, entorno Node
    household.service.test.ts                acceptHouseholdInvite con el cliente de Supabase mockeado
    useHouseholdInvitationViewModel.test.ts  hook con renderHook y el servicio mockeado
    HouseholdInvitation.page.ts              Page Object de la página de invitación
    HouseholdInvitation.test.tsx             componente (jsdom) a través del Page Object
    useHouseholdJoinForm.test.ts             validación del campo y navegación (router mockeado)

supabase/migrations/014_accept_household_invite.sql   nueva; número provisional (ver la sección siguiente)
types/database.types.ts                     + Functions.accept_household_invite (a mano, verificada contra la base)
docs/documento-proyecto.md                  §4.1 y §6 (ver "Documento del proyecto")
```

No cambian: la migración `011` y sus tres RPC, `HouseholdCreateForm`, `HouseholdInviteLinkCard`, `useHouseholdInvite`, el login (SCRUM-45) ni `services/supabase.client.ts`.

Los tipos de retorno de los hooks se declaran dentro de cada hook, como en `useHouseholdViewModel` y `useHouseholdInvite`: solo los usa ese hook y su pantalla.

### Número de la migración

- En `develop` (revisado el 2026-10-04): `001` a `012`. La `012_delete_list_items.sql` (SCRUM-65) se mergeó en el PR #34.
- En ramas abiertas de otras historias: `013_add_recipe_to_list.sql` (SCRUM-97). La rama de SCRUM-98 trae la misma `012` que ya está en `develop`.
- Quien hace QA anunció que va a corregir la numeración de la `011`; al 2026-10-04 todavía no hay rama con ese cambio.
- **Propuesta provisional: `014_accept_household_invite.sql`** (la `013` la usa SCRUM-97). Se vuelve a revisar `develop` y las ramas abiertas justo antes de crear el archivo (etapa 2) y otra vez antes del merge; si cambió, se renombra el archivo (como pasó con la `011`).
- El número del archivo no afecta a la base: la función se aplica a mano en el SQL Editor y se llama por su nombre. (Desde SCRUM-134 sí afecta: el número es la versión de la fila del historial, ver [supabase/README.md#migraciones](../../../supabase/README.md#migraciones).)

### Datos

**RPC `accept_household_invite(invite_token text) returns text`** (contrato en [SPEC §12](SPEC.md#12-contratos-externos)). Pasos, en una sola transacción:

1. Sin `auth.uid()` o con `is_anonymous` en el JWT → excepción `42501` (mismo bloque que las RPC de la `011`).
2. `invite_token` nulo o sin formato de UUID (regex) → `'invalid'`. Se compara con regex antes de convertir a `uuid`, así un texto cualquiera no lanza `22P02`.
3. `select household_id, expires_at from public.household_invite_links where token = invite_token::uuid for share` → sin fila: `'invalid'` (incluye el token reemplazado al regenerar).
4. `expires_at <= clock_timestamp()` (la hora real, aunque la llamada haya esperado el bloqueo del paso 3) → `'expired'`.
5. `insert into public.household_members (user_id, household_id, role) values (auth.uid(), <household del enlace>, 'member') on conflict (user_id) do nothing`.
6. Si insertó (`found`) → `'joined'`.
7. Si no insertó, ya tenía membresía: se lee su `household_id` → igual al del enlace: `'already_member'`; distinto: `'in_other_household'`.

Esbozo (el SQL final se escribe y se revisa en la etapa 2):

```sql
create or replace function public.accept_household_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invite_household_id uuid;
  invite_expires_at timestamptz;
  current_household_id uuid;
begin
  -- 1. cuenta registrada (igual que 011)
  -- 2. formato del token con regex → 'invalid'
  -- 3. select ... from public.household_invite_links invite
  --      where invite.token = invite_token::uuid for share → sin fila: 'invalid'
  -- 4. invite_expires_at <= clock_timestamp() → 'expired'
  -- 5. insert ... on conflict (user_id) do nothing
  -- 6. found → 'joined'
  -- 7. household actual = el del enlace → 'already_member'; si no → 'in_other_household'
end;
$$;

revoke execute on function public.accept_household_invite(text) from public, anon;
grant execute on function public.accept_household_invite(text) to authenticated;
```

**RLS y permisos:** no cambian. `household_members` sigue sin `insert` para el cliente y `household_invite_links` sigue sin permisos ni políticas: la RPC (dueña de las tablas, `security definer`) es la única forma de leer un token y de agregar un miembro.

**Tipos:** `Functions.accept_household_invite: { Args: { invite_token: string }; Returns: string }`, escrito a mano (como SCRUM-56) y verificado contra `pg_proc` después de aplicar la migración. `Returns: string` es lo que genera Supabase para `text`; el servicio lo acota a `HouseholdJoinResultType` con una comprobación contra `HOUSEHOLD_JOIN_RESULT` y lanza error si llega un valor desconocido.

### Cómo se prueba la RPC

En el SQL Editor, dentro de una transacción con `rollback` al final (`set local role authenticated` + `set local request.jwt.claims` con `sub` e `is_anonymous`), igual que el plan de SCRUM-56:

- sin `sub` y con `is_anonymous = true` → `42501`;
- token con formato inválido → `invalid`; UUID que no existe → `invalid`;
- token vigente con un usuario sin familia → `joined` y una fila `member` con el `household_id` del enlace;
- segunda llamada del mismo usuario → `already_member`, sigue habiendo una sola fila;
- usuario de otra familia → `in_other_household`, sin filas nuevas;
- `expires_at` movido al pasado (dentro de la transacción) → `expired`, sin filas nuevas;
- regenerar con el admin (`create_household_invite`) y usar el token viejo → `invalid`;
- como `authenticated`: `select` directo a `household_invite_links` e `insert` directo en `household_members` siguen rechazados.

Los UUID y tokens reales que se usen en estas pruebas no se commitean ni se pegan en el PR.

### Flujo

1. **Abrir el enlace:** `app/invitacion/[token]/page.tsx` → `<HouseholdInvitation token>` → `useHouseholdInvitationViewModel(token)`:
   - sin formato de UUID → `invalid` (no consulta nada);
   - si no, `hasRegisteredSession()` → `noAccount` (sin sesión o anónima) o `ready`; si la lectura falla → `loadFailed`. Con bandera de cancelación, como el resto de la feature.
2. **Unirse:** "Unirme" → `onJoin` → si ya hay un pedido en curso (`useRef`), se ignora → `joining` → `acceptHouseholdInvite(token)` → el resultado se traduce con un mapa de constantes (`joined` → `joined`, `already_member` → `alreadyMember`, etc.); error de red o de la base → `failed` ("Unirme" vuelve a estar disponible).
3. **Después:** `joined`, `alreadyMember` e `inOtherHousehold` muestran "Ir a mi familia" (`Link` a `/household`), donde `useHouseholdViewModel` vuelve a leer la membresía y muestra la vista que ya existe.
4. **Sin cuenta:** `noAccount` muestra "Iniciar sesión" (`Link` a `/login`) y el texto de volver a abrir el enlace. No se toca el login.
5. **Pegar en `/household`:** `HouseholdJoinForm` → `onJoinSubmit` de `useHouseholdJoinForm` → `extractInviteToken(texto)` → `null`: error en el campo; token: `router.push` a `HOUSEHOLD_ROUTE.INVITATION` + `/` + token → sigue el paso 1.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Una RPC `security definer` que valida y une | Política de `insert` en `household_members` | Con una política, el cliente mandaría `household_id` y `role`; habría que validar que el token corresponde a ese household dentro de la política, y alguien podría insertarse como `admin`. La función deriva todo de `auth.uid()` y del token (security-practices §3) |
| Devolver un texto con el resultado de negocio | Una excepción con un código distinto por caso | Inválido, vencido o "ya es de otra familia" no son fallas del sistema; con un valor fijo el servicio los traduce con un mapa de constantes, como el login traduce los `code` de su Edge Function (`LOGIN_API_CODE_RESULT`). Las excepciones quedan para "no tienes permiso" (`42501`), igual que en la `011` |
| `invite_token text` y regex adentro | Parámetro `uuid` | Con `uuid`, un texto mal pegado lo rechaza PostgREST antes de entrar a la función (`22P02`) y el cliente tendría que distinguir ese error; así la función siempre responde `invalid` |
| `insert … on conflict (user_id) do nothing` + `found` | Revisar la membresía con un `select` y después insertar | El `select` previo deja una ventana entre dos llamadas simultáneas; con `on conflict` la segunda espera a la primera y no inserta. La PK es la garantía, no la lectura |
| `for share` al leer el enlace | Leer sin bloqueo | Una regeneración simultánea espera a que termine la aceptación: nunca se acepta un token que en ese mismo instante deja de existir |
| Revisar el vencimiento antes que la membresía | Al revés | Con un enlace vencido no importa en qué familia esté el usuario: el enlace no sirve. Así el mensaje siempre dice lo primero que hay que resolver |
| Botón "Unirme" antes de llamar a la RPC | Unirse al abrir la página | Abrir un enlace no debería cambiar datos sin una acción explícita (decisión aprobada) |
| Sin vista previa del nombre de la familia | RPC de preview | Decidido fuera de esta historia: sería una segunda función que lee tokens y expone el nombre de la familia a quien tenga el enlace |
| Confirmación sin el nombre de la familia | Leer la membresía después de unirse para mostrar el nombre | Una petición menos y un estado de error menos; "Ir a mi familia" lleva a `/household`, que ya muestra el nombre |
| El formulario de `/household` navega a `/invitacion/<token>` | Aceptar desde el formulario | Un solo lugar para aceptar, un solo ViewModel con la lógica de resultados (decisión aprobada) |
| Comprobar el formato del token en el cliente además de en la base | Solo en la base | Un enlace mal copiado se informa sin pedir sesión ni llamar a la base; la base lo vuelve a comprobar porque el cliente no es confiable |
| Páginas en `features/household/` | Feature nueva `household-invitation` | Reusan el servicio, las constantes y la ruta de SCRUM-56; el repo ya tiene varias pantallas por feature (`registro-manual`, `recipes`) |
| Hook `useHouseholdJoinForm` compuesto por el Facade | Meter el formulario en `useHouseholdViewModel` | El Facade ya tiene 219 líneas; mismo criterio que `useHouseholdInvite` (component-architecture §5, Facade) |
| Guarda de doble clic con `useRef` | Solo deshabilitar el botón | Dos clics en el mismo ciclo de render ven el mismo estado `ready`; el `ref` cambia al instante. La base igual lo cubre (`already_member`) |
| `Link` con clases de botón para "Iniciar sesión" e "Ir a mi familia" | `Button` con `router.push` | Navegan: un enlace se puede abrir en otra pestaña y el lector de pantalla lo anuncia como enlace. Mismo patrón que `RecipeCard` |
| Rutas `/household` y `/login` como constantes de la feature | Importar `LOGIN_ROUTE` de `features/login` | Evita acoplar una feature a otra por una constante. Mismo criterio que `LANDING_ROUTE` en `features/landing` |
| `referrer: "no-referrer"` en la metadata de la página | Sin política | El token va en la ruta: así no sale en la cabecera `Referer` hacia otro origen |
| Sin parámetro `next` en el login | Volver al enlace después del login | Toca SCRUM-45 (otra persona) y exige validar que el destino sea interno para no abrir una redirección a cualquier sitio. Queda como mejora coordinada |

### Seguridad

- **Quién llega:** cualquiera con el enlace (visitante, anónimo o registrado). Solo un usuario registrado puede ejecutar la RPC; `anon` no tiene `execute` y los anónimos (`authenticated` con `is_anonymous`) se rechazan adentro.
- **Lo que decide la base:** `user_id` (`auth.uid()`), `household_id` (fila del enlace), `role` (`'member'` fijo), la validez y el vencimiento (`clock_timestamp()`).
- **Inyección:** el token es un parámetro, se compara con regex y se convierte a `uuid`; no se arma SQL con strings. `search_path = ''` y nombres calificados, como la `011`.
- **Acceso a los tokens:** sigue cerrado. La RPC no devuelve el token ni el `household_id`: solo el resultado. Tampoco hay forma de listar enlaces.
- **Una familia por usuario:** la PK `household_members.user_id` + `on conflict do nothing`. La interfaz solo informa.
- **Concurrencia:** doble clic y dos pestañas terminan en una sola fila; regenerar mientras alguien acepta espera por el `for share`.
- **Fuerza bruta:** el token tiene 122 bits aleatorios (`gen_random_uuid()`) y vence a los 7 días; adivinarlo no es viable. Distinguir `invalid` de `expired` solo revela que un token existió, lo que no sirve sin el token. No se agrega rate limit propio (Supabase no lo ofrece para RPC sin una Edge Function, y ningún CA lo pide); queda anotado.
- **Token en el navegador:** no se muestra, no se escribe en consola, no sale en `Referer`. Queda en el historial del navegador porque es la URL que se compartió; es el mismo riesgo que ya tiene el enlace en el chat donde se envió.
- **Revisión:** el SQL pasa por `security-reviewer` antes de aplicarse, y el cambio completo antes de `waiting qa`.

### Pruebas

- **Manuales** (con dos cuentas registradas que entran por `/login`): todos los casos de [SPEC §13](SPEC.md#13-casos-de-aceptación), con evidencia sin el token.
- **Base:** los casos de [Cómo se prueba la RPC](#cómo-se-prueba-la-rpc), con `rollback`.
- **Automáticas (obligatorias):** Vitest está en `develop` desde SCRUM-128 y la Definition of Done exige tests del camino feliz y de al menos un caso negativo o límite (CONTRIBUTING §7); el CI corre `npm test` en cada PR. Van en `features/household/tests/` (unit-testing-standards §2), sin red real: el cliente de Supabase y el router se mockean (§5). Entorno Node por defecto y `// @vitest-environment jsdom` en la primera línea de los tests de componente.

  | Qué | Archivo | Casos | Cubre |
  |---|---|---|---|
  | `extractInviteToken` | `extractInviteToken.test.ts` | enlace completo, con barra final, con query o fragmento, código solo, mayúsculas, vacío, texto sin token, UUID mal formado | CA-01 (pegar), regla 12 |
  | `acceptHouseholdInvite` | `household.service.test.ts` | cada resultado conocido se devuelve igual; un valor desconocido lanza error; un error de Supabase se propaga | CA-02, CA-03, CA-05 |
  | `useHouseholdInvitationViewModel` | `useHouseholdInvitationViewModel.test.ts` | formato inválido → `invalid` sin llamar a nada; sin cuenta → `noAccount`; `joined`; `expired`; `in_other_household`; doble clic → una sola llamada; falla → `failed` | CA-01 a CA-05, casos 6 a 8 |
  | `HouseholdInvitation` | `HouseholdInvitation.page.ts` + `HouseholdInvitation.test.tsx` | "Unirme" deshabilitado mientras procesa; "Iniciar sesión" apunta a `/login`; "Ir a mi familia" apunta a `/household`; el token no aparece en el texto | CA-04, casos 6 y 7 |
  | `useHouseholdJoinForm` | `useHouseholdJoinForm.test.ts` | vacío y sin token → error y no navega; enlace o código → navega a `/invitacion/<token>` | CA-01 (pegar) |

  Las pruebas de la RPC no son unitarias: se hacen en la base (arriba).
- **E2E (Playwright, SCRUM-129) — decidido: SCRUM-57 no lleva E2E** (decisión de la dueña de la historia, 2026-10-05; ver SPEC §15). Según playwright-e2e y CONTRIBUTING §5.1, las E2E se corren solo si la feature tiene `specs/E2E.md`, y hoy `household` no lo tiene. El soporte actual (`e2e/support/supabase.ts`) usa usuarios **anónimos**, y este flujo necesita dos cuentas **registradas** en la base compartida (una administradora con enlace y otra sin familia), además de limpiar la membresía creada. **Propuesta:** no agregar E2E en SCRUM-57, cubrir el flujo con los tests de arriba más las pruebas manuales, y dejar anotado que una E2E necesita que el equipo defina usuarios de prueba registrados. Si se decide que sí, primero se escribe `features/household/specs/E2E.md` y la tabla de verificación del SPEC, como pide playwright-e2e.

### Dependencias con SCRUM-56 y otras ramas

| Dependencia | Estado (2026-10-04) | Efecto en SCRUM-57 |
|---|---|---|
| SCRUM-56: tablas, enlaces, `hasRegisteredSession`, `/household` | Mergeada en `develop`; migración `011` aplicada en la base compartida | Base de esta historia; no se modifica |
| SCRUM-45: `/login` | En `develop` | Se usa como destino de "Iniciar sesión"; no se modifica |
| SCRUM-49: `SessionGuard` (Esteban) | **Mergeada** (PR #42). Envuelve todo en `app/layout.tsx`; **apagado por defecto**: solo actúa con `NEXT_PUBLIC_SESSION_GUARD_ENABLED=true` (en `.env.example` está comentada) | Encendido, toda ruta fuera de `PUBLIC_ROUTES` (lista exacta: `/`, `/login`, `/registro`, `/registro/verificado`) redirige a `/login` sin sesión registrada (los anónimos cuentan como sin sesión). `/invitacion/<token>` y `/household` quedarían protegidas: se iría al login sin ver el aviso de volver a abrir el enlace. **Pendiente coordinar** con Esteban (ver Riesgos) |
| SCRUM-128: Vitest | **Mergeada** (PR #36) | Tests automáticos obligatorios (ver Pruebas) |
| SCRUM-129: Playwright | **Mergeada** (PR #40) | E2E disponibles; SCRUM-57 no las usa (ver Pruebas) |
| SCRUM-65: migración `012` | **Mergeada** (PR #34) | Ocupa la `012` |
| SCRUM-97: migración `013` | Rama abierta | Ocupa la `013`; por eso la propuesta es la `014` |
| Renumeración de la `011` (QA) | Anunciada, sin rama al 2026-10-04 | Puede mover los números; se revisa antes de crear y antes de mergear |

### Documento del proyecto

En la etapa de documentación (no ahora), `docs/documento-proyecto.md`:

- **§4.1:** un punto "Unirse con el enlace (implementado {fecha}, SCRUM-57 / HU-34)": solo cuentas registradas, confirmación con "Unirme", resultados posibles, el enlace sirve para varias personas mientras esté vigente, y quien ya tiene familia tiene que salir primero (HU-34c).
- **§6, tabla de entidades:** en `household_members`, que las filas solo se crean con `create_household` (admin) y `accept_household_invite` (member); en `household_invite_links`, que el token se lee solo con `accept_household_invite` además de las RPC del admin.
- **§6, reglas de negocio en la base:** la regla de aceptar (token vigente según la base, rol `member` fijo, una familia por usuario, atómico).

No cambian `docs/historias-usuario.md` ni `docs/DESIGN.md`.

### Commits y PR

El PR se abre con el primer commit y queda en `in progress` hasta el final. Cada commit compila por sí solo (`tsc` y `lint`) y se hace push al terminar cada etapa (o antes, si queda trabajo a medias de un día para otro).

| # | Commit | Etapa |
|---|---|---|
| 1 | `docs(SCRUM-57): add join household spec, plan and tasks` → push → abrir el PR hacia `develop` con label `in progress` | Specs |
| 2 | `feat(SCRUM-57): add accept_household_invite migration` | Migración (después de `security-reviewer`; se aplica en el SQL Editor con aprobación) |
| 3 | `feat(SCRUM-57): add accept_household_invite to database types` | Tipos (después de aplicarla y verificarla) |
| 4 | `feat(SCRUM-57): add join constants, token extraction and service` | Constantes, util y servicio |
| 5 | `feat(SCRUM-57): add invitation view model` | ViewModel de la página |
| 6 | `feat(SCRUM-57): add invitation page and route` | Pantalla y `app/invitacion/[token]` |
| 7 | `feat(SCRUM-57): add join with invitation form to household screen` | Formulario en `/household` |
| 8 | `test(SCRUM-57): cover invitation flow and join form` | Tests de [Pruebas](#pruebas) que no hayan entrado en los commits 4 a 7. Obligatorio: la historia no pasa a `waiting qa` sin ellos |
| 9 | `docs(SCRUM-57): update project document for joining a household` | `docs/documento-proyecto.md` |
| 10 | `docs(SCRUM-57): record manual and database tests` | SPEC §13 y tasks |

Los tests de una pieza pueden ir en el mismo commit que la pieza (ej. `extractInviteToken` con su test en el commit 4); el commit 8 junta los que falten. Lo que salga de las revisiones va en commits `fix(SCRUM-57): …` aparte. No se commitean `.env*`, capturas, scripts SQL de prueba con UUID o tokens reales, `.next/` ni el bloque que `next dev` agrega a `AGENTS.md`.

**Antes de pasar a `waiting qa`:** `git diff --check`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` (lo mismo que corre el CI), pruebas manuales y de la base, subagentes `code-reviewer`, `security-reviewer` y `qa-checker`, descripción del PR completa con la plantilla (en inglés) y la tarjeta de Jira movida en el mismo momento.

### Riesgos y deuda conocida

- **`SessionGuard` (SCRUM-49, ya en `develop`):** hoy está apagado por defecto y no cambia nada. Si el equipo lo enciende, `/invitacion/...` redirige al login y el caso "sin cuenta" no se ve como está especificado (el resultado es parecido: termina en `/login`, pero sin el aviso de volver a abrir el enlace). **Decisión pendiente**, a coordinar con Esteban: (a) aceptarlo así, sin tocar el guard; o (b) que `isPublicRoute` admita el prefijo `/invitacion/` (cambio en `features/session-guard`, fuera de esta historia). Propuesta: (a) y avisarle.
- **Volver al enlace después del login:** la persona tiene que reabrir el enlace a mano. Mejora a coordinar con SCRUM-45.
- **Familia sin administrador:** si el único admin borra su cuenta, la familia y su enlace quedan (deuda M1 de SCRUM-56), y con esta historia alguien podría unirse a ella mientras el enlace esté vigente. Se resuelve con HU-34c.
- **Lista personal al unirse (HU-34b):** hasta que exista, quien se une no elige qué hacer con su lista.
- **Sin rate limit propio** en la RPC (ver Seguridad).
- **Número de la migración** sujeto a cambios hasta el merge.
- **Sin E2E** si se aprueba la propuesta de [Pruebas](#pruebas): el flujo completo con dos cuentas reales queda cubierto por pruebas manuales hasta que el equipo defina usuarios de prueba registrados.
