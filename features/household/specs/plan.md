# Plan técnico: household

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md). Las secciones de arriba son de SCRUM-56 (crear household y link de invitación); la de SCRUM-57 está al final: [unirse a una familia con el enlace](#scrum-57-unirse-a-una-familia-con-el-enlace).

**Verificado el 2026-09-29** contra el repo (rama al día con `develop` en `f4eae2f`): no existen `households`, `household_members`, `household_invite_links`, un rol admin, ni ninguna ruta de perfil o household. Migraciones existentes: `001` a `008`. `gen_random_uuid()` ya se usa en `004` y `006`. El único precedente de `security definer` es `003`.

**Cada etapa se revisa y se aprueba antes de empezar la siguiente.** Ninguna etapa se da por terminada sin que la persona dueña de la historia la haya revisado.

## Archivos

```
app/(app)/household/page.tsx                    ruta delgada: metadata + <Household />

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

1. **Entrar:** `app/(app)/household/page.tsx` → `Household.tsx` → `useHouseholdViewModel` → `hasRegisteredSession()` (`getSupabaseClient().auth.getSession()`; `false` si no hay sesión o `is_anonymous`). Si no: estado "sin cuenta". Si sí: `getHouseholdMembership()` (`household_members` con `households(name)`, filtrado por el `user_id` de la sesión y `maybeSingle()`; RLS además solo deja ver la fila propia) → sin household / member / admin. Carga con bandera de cancelación, como `useRecipeEditor`.
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
6. **Componentes, pantalla y ruta:** crear `HouseholdCreateForm` y sus props, ajustar la tarjeta, crear `Household.tsx` y `app/(app)/household/page.tsx`.
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

**Verificado el 2026-10-03** contra `develop` en `1d85109` (con SCRUM-56 mergeada): existen `households`, `household_members` (PK `user_id`) y `household_invite_links` (PK `household_id`, `token uuid unique`), sin políticas ni permisos en la de invitaciones y sin `insert` para el cliente en `household_members`. No existe `app/invitacion/`. `HOUSEHOLD_ROUTE.INVITATION = "/invitacion"` y los enlaces generados apuntan a `/invitacion/<token>`. `/login` (SCRUM-45) guarda la sesión con `auth.setSession` y siempre vuelve a `/`. Migraciones en `develop`: `001` a `011`.

 **Revisado el 2026-10-04**, con la rama sincronizada con `develop` (`b6aaf68`, merge `c4f4245`): ya están en `develop` Vitest (SCRUM-128, PR #36), Playwright (SCRUM-129, PR #40), el `SessionGuard` (SCRUM-49, PR #42) y la migración `012_delete_list_items.sql` (SCRUM-65, PR #34). Nada de eso tocó `features/household`. Las secciones de abajo ya tienen esos cambios.

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


## SCRUM-59: decidir qué hacer con la lista personal

 **Verificado el 2026-10-10** contra `develop` en `58d7a6a` (SCRUM-56 y SCRUM-57 mergeadas, SCRUM-58 todavía no). Todas las políticas de `lists`, `list_items` y `list_item_recipe_requirements` son de la dueña. `lists.household_id` no tiene FK. La política de inserción de `lists` exige `household_id is null` y `type = 'general'`. Cinco funciones buscan la lista general por `owner_id` y `household_id is null`. `getGeneralList()` usa `ensureSession()`. `household_members` no tiene dónde guardar una decisión. El detalle está en [SPEC §12](SPEC.md#12-contratos-externos).

Este plan es **de planificación**: fija lo decidido (D1 a D9, SPEC §5) y deja como pendiente lo que falta (T1 a T5). Los archivos, migraciones y commits concretos se escriben cuando T1 a T5 estén resueltos y el equipo apruebe el alcance.

### Separación propuesta (pendiente de aprobación del equipo)

| Parte | Qué incluye | Por qué separarla |
|---|---|---|
| **A. Lista general de la familia** (habilitador) | Una lista general por familia (índice único parcial por `household_id`, FK `lists.household_id` → `households`), RLS por membresía en `lists`, `list_items` y `list_item_recipe_requirements`, las cinco funciones que agregan a la lista general, `getGeneralList()` y, según T4, el modo compra | Cambia el control de acceso de toda la lista general y toca código de otras features (`shopping-list`, recetas, plan). Es un cambio grande que conviene revisar y mergear solo; como una sola historia superaría con holgura los 18 archivos |
| **B. HU-34b** | La pregunta después de crear o unirse, guardar la decisión en la membresía, compartir atómicamente y la sección "Mi lista personal" en `/lista` | Es lo que pide la historia; depende de A |

Crear el ticket de la parte A (tamaño, sprint y responsable) lo decide el equipo (T5). Si no se aprueba, las dos partes van en esta historia, en ese orden y en commits separados.

### Datos (dirección, sin nombres definitivos)

- **Lista de la familia:** una sola por familia. La parte A define si se crea al crear la familia, al compartir o al agregar el primer producto siendo miembro.
- **Acceso:** si la lista tiene `household_id`, deciden solo las políticas de membresía. La dueña original **no** conserva acceso por ser dueña (D6: quien sale pierde el acceso). Si la lista es personal (`household_id` nulo), sigue la regla actual de la dueña.
- **Decisión (D5):** asociada a la membresía. Como la fila de `household_members` se borra al salir (SCRUM-58), una decisión guardada ahí se limpia sola; al unirse a otra familia se vuelve a preguntar si se cumple D1. Columna o tabla, a decidir.
- **Compartir:** una sola función atómica, con bloqueos en un orden fijo (lista de la familia, después la personal) para que dos traspasos simultáneos o un traspaso mientras alguien agrega no dupliquen variantes. Las reglas de cantidades, tachados y requisitos de receta son las de T1.
- **Salir (D6):** con acceso por membresía no hace falta cambiar `leave_household` de SCRUM-58. Si quien sale no tenía lista personal, `add_item_to_general_list` le crea una al agregar su primer producto, como hoy. Falta decidir qué ítems conserva (sin columna de "quién lo agregó", hoy no se puede saber cuáles puso cada quien).
- **Familia eliminada:** T3.

### Número de la migración

- En `develop` (2026-10-10): `000` a `019` y `022`. La rama de SCRUM-58 usa la `023`.
- **Propuesta provisional: `024`** para la primera migración de esta historia (o de la parte A). Se vuelve a revisar `develop` y las ramas abiertas antes de crear el archivo y antes del merge, como indica `supabase/README.md`.

### Flujo (propuesto)

1. Crear la familia en `/household`, o "Unirme" en `/invitacion/<token>` con resultado `joined`.
2. Comprobar: ¿cuenta registrada? (D9) ¿tiene lista general personal con contenido? (D1) ¿ya decidió en esta membresía? (D5)
3. Si corresponde, la pregunta (D8). "Mantener" guarda la decisión y no cambia listas. "Compartir" guarda la decisión y pasa los ítems en la misma transacción.
4. Confirmación y la pantalla normal. `/lista` muestra la lista de la familia y, si eligió mantener, la sección personal (D4).

### Seguridad

- Nada de `household_id`, `owner_id` ni ids de listas ajenas desde el cliente: la base los toma de `auth.uid()` y de la membresía.
- Funciones nuevas con `set search_path = ''`, nombres calificados, `revoke … from public, anon` y rechazo de anónimos (`42501`), como las de household. Si son `security definer` o `security invoker` se decide en el diseño de la parte A.
- Las listas privadas nunca pueden quedar asociadas a una familia (política y prueba SQL).
- `security-reviewer` antes de aplicar cada migración y antes de `waiting qa`.
=======
## SCRUM-58: salir de la familia

 **Verificado el 2026-10-10** contra `develop` (rama sin commits propios todavía): `household_members.user_id` es PK y solo tiene `select` de la fila propia para el cliente (`011`); no existe ninguna RPC para salir, transferir el rol ni listar miembros; `household_invite_links.household_id` → `households` con `on delete cascade`; `purchase_sessions.household_id` → `households` con `on delete set null` (`016`); en `lists`, `recipes` y `meal_plans`, `household_id` existe sin FK y siempre es `null`. No hay tabla de perfiles: el nombre del usuario está en `auth.users.raw_user_meta_data ->> 'name'` (lo guarda el registro). `components/ui` no tiene radio ni select.

### Archivos

```
supabase/migrations/023_leave_household.sql      nueva: get_household_members() y leave_household(new_admin_user_id)
supabase/tests/023_leave_household.test.sql      nueva: prueba SQL (transacción con assert y rollback)
types/database.types.ts                          + Functions.get_household_members y leave_household

features/household/
  Household.tsx                                  + sección "Salir de la familia" (miembro y admin) y <HouseholdLeaveDialog>
  components/
    HouseholdLeaveDialog.tsx                     nuevo: Modal de confirmación; texto según el caso; radios nativos
                                                 para el nuevo admin. Solo presentación
    models/HouseholdLeaveDialogProps.interface.ts   nuevo
  hooks/
    useHouseholdLeave.ts                         nuevo: estado del flujo (unión), cargar miembros (solo admin),
                                                 elegido, confirmar con guarda useRef, traducir resultados
    useHouseholdViewModel.ts                     + compone useHouseholdLeave; al salir bien vuelve a leer la membresía
  models/
    HouseholdMember.interface.ts                 nuevo: { userId, displayName, role, isCurrentUser }
  services/
    household.service.ts                         + getHouseholdMembers() y leaveHousehold(newAdminUserId)
  constants/
    household.constants.ts                       + RPC, HOUSEHOLD_LEAVE_RESULT (+ tipo), HOUSEHOLD_LEAVE_STATUS,
                                                   HOUSEHOLD_LEAVE_DIALOG_CASE, HOUSEHOLD_LEAVE_DIALOG_DESCRIPTION,
                                                   HOUSEHOLD_LEAVE_FORM, HOUSEHOLD_LEAVE_TEXT ("Miembro sin nombre")
  tests/
    household.service.test.ts                    + casos de getHouseholdMembers y leaveHousehold
    useHouseholdLeave.test.ts                    nuevo
    HouseholdLeave.page.ts                       nuevo: un solo Page Object para la sección, el diálogo y el aviso
                                                 (el diálogo solo existe dentro de esta pantalla)
    HouseholdLeave.test.tsx                      nuevo (jsdom): el diálogo solo y la pantalla completa con el
                                                 servicio mockeado

docs/documento-proyecto.md                       §4.1 y §6 (ver "Documento del proyecto")
```

No cambian: las migraciones `011` y `014`, las RPC existentes, el login, el `SessionGuard` ni `components/ui`.

### Número de la migración

- `develop` (2026-10-10): `000` a `019`.
- Ramas abiertas: `020` y `021` (SCRUM-131), `022` (SCRUM-101).
- **Propuesta: `023_leave_household.sql`.** Según `supabase/README.md`, se vuelve a revisar `develop` y los PRs abiertos justo antes de crear el archivo y otra vez antes del merge; si alguien tomó el número, se renombra (todavía no estaría en la base).

### Datos

**`get_household_members()`** (`stable`, `security definer`, `set search_path = ''`):

1. Sin `auth.uid()` o con `is_anonymous` → `42501`.
2. Busca la familia donde quien llama es `admin`; si no lo es → `42501` (solo el admin elige).
3. Devuelve `user_id`, `nullif(btrim(raw_user_meta_data ->> 'name'), '')` como `display_name`, `role` y `user_id = auth.uid()` como `is_current_user`, de los miembros de **esa** familia, ordenados por `created_at`. No devuelve el correo.

**`leave_household(new_admin_user_id uuid default null)` → `text`** (`security definer`, `set search_path = ''`), en una sola transacción:

1. Sin `auth.uid()` o con `is_anonymous` → `42501`.
2. Lee la membresía propia (`household_id`, `role`). Si no hay → `'not_member'`.
3. **Siempre, sea `member` o `admin`**, bloquea primero la fila del enlace de esa familia si existe (`select … from public.household_invite_links where household_id = … for update`) y después la de `households` (`for update`). El orden no depende del rol leído en el paso 2, porque ese rol puede cambiar mientras espera (por ejemplo, el admin le pasó el rol). Ver [Concurrencia](#concurrencia).
4. Con el bloqueo tomado, vuelve a leer la membresía propia (pudo cambiar mientras esperaba): si ya no está → `'not_member'`.
5. `member` → `delete` de su fila → `'left'`.
6. `admin` → cuenta los otros miembros de la familia:
   - `0` → `delete from public.households where id = …`; la cascada borra su membresía y su enlace; `purchase_sessions` queda con `household_id` en `null` → `'household_deleted'`;
   - más de `0` y `new_admin_user_id` nulo → `'transfer_required'`;
   - `new_admin_user_id` igual a quien llama, o que no es miembro de esa familia → `'invalid_new_admin'`;
   - válido → `update … set role = 'admin'` para el elegido y `delete` de la fila de quien llama → `'left'`.
7. `revoke execute … from public, anon`; `grant execute … to authenticated` (para las dos funciones).

No se agregan políticas ni permisos de tabla: el cliente sigue sin poder borrar ni modificar membresías; la única puerta es la función.

**Tipos:** `get_household_members: { Args: never; Returns: { display_name: string | null; is_current_user: boolean; role: string; user_id: string }[] }` y `leave_household: { Args: { new_admin_user_id?: string }; Returns: string }`, escritos a mano como en SCRUM-56 y SCRUM-57 y verificados contra `pg_proc` después de aplicar. El servicio acota `role` y el resultado con type guards, como `acceptHouseholdInvite`.

### Concurrencia

Revisado contra el SQL real de la `011` y la `014` (2026-10-10). Qué toma cada función sobre una misma familia:

| Función | Bloqueos, en orden |
|---|---|
| `accept_household_invite` (014) | 1) fila del enlace `for share`; 2) al insertar el miembro, la FK de `household_members.household_id` toma `for key share` sobre la fila de `households` |
| `create_household_invite` (011) | Enlace nuevo: inserta la fila y la FK toma `for key share` sobre `households`. Enlace existente: `on conflict do update` bloquea la fila del enlace (`household_id` no cambia, así que no vuelve a revisar la FK) |
| `leave_household` (esta historia) | 1) fila del enlace `for update` (si existe); 2) fila de `households` `for update`; 3) filas de `household_members`, y al eliminar la familia, la cascada sobre el enlace, los miembros y `purchase_sessions` (`set null`) |

- **Los bloqueos duran hasta el final de la transacción** (`commit` o `rollback`); no se sueltan entre pasos.
- **`for update` sobre `households` choca con `for key share`**: mientras alguien sale, una unión o un enlace nuevo de esa familia esperan, y al revés.
- **Mismo orden que `accept_household_invite`** (enlace → familia), sin importar el rol. Así:
  - si la unión toma primero el enlace, la salida espera; cuando sigue, cuenta los miembros con la unión ya confirmada (un admin que creía estar solo recibe `transfer_required`);
  - si la salida lo toma primero y elimina la familia, la unión espera; al seguir, Postgres vuelve a evaluar el `where token = …` sobre la fila borrada y no la encuentra: responde `invalid`, sin error de FK;
  - si quien sale es un miembro, la familia no se elimina y la unión sigue normalmente después.
- **Si el enlace no existe**, el paso 1 no bloquea nada y la salida empieza por `households`. Un enlace que se cree en ese momento necesita `for key share` sobre `households`, así que espera; si la salida elimina la familia, esa creación falla por la FK y el admin ve el error genérico de "generar". No hay ciclo porque nadie tiene el enlace nuevo bloqueado mientras espera la familia.
- **Dos salidas, o una salida y una transferencia, en la misma familia:** se ordenan por el bloqueo de `households`. Cada una vuelve a leer la membresía con el bloqueo tomado (paso 4): si el elegido ya salió, `invalid_new_admin`; si a quien sale le pasaron el rol, sigue el camino de admin con los bloqueos ya en el orden correcto.

**Lo que este orden no garantiza:**

- Cubre las funciones que existen hoy. Cualquier función nueva que bloquee una familia y su enlace tiene que respetar el mismo orden (enlace → `households` → filas de miembros); si no, puede volver a aparecer un interbloqueo.
- Operaciones fuera de estas funciones (por ejemplo, borrar una cuenta, que borra su membresía en cascada, o funciones futuras sobre `purchase_sessions` con `household_id`) pueden hacer esperar a una salida. Ninguna de las que existen hoy espera a su vez a la salida, pero no se da por imposible.

**Cómo se gestiona un fallo de concurrencia:** si Postgres detecta un interbloqueo (`40P01`) o la llamada falla por otro motivo, aborta **toda** la transacción de esa llamada: no queda una transferencia sin la salida, ni una salida sin la transferencia, ni una familia a medio borrar. El servicio recibe el error, el hook pasa a `failed` y el usuario puede reintentar. El reintento es seguro porque la función vuelve a leer el estado real: si la primera llamada sí se confirmó (por ejemplo, se perdió la respuesta), responde `not_member` y la pantalla vuelve a leer la membresía.

### Cómo se aplica y se prueba la migración

Procedimiento de `supabase/README.md`, completo (aplicar el archivo **no** alcanza):

1. Revisar el número libre (ver arriba) y avisar al grupo antes de correrla.
2. En el SQL Editor, una sola transacción que ejecuta el archivo **y** registra su fila en el historial:
   `begin;` … contenido de `023_leave_household.sql` … `insert into supabase_migrations.schema_migrations (version, name, created_by) values ('023', 'leave_household', 'SCRUM-58'); commit;`
3. Comprobar que el historial coincide con `migrations/` (`select version, name from supabase_migrations.schema_migrations order by version;`).
4. Correr **completo** `supabase/tests/023_leave_household.test.sql` (transacción con `assert` que termina en `rollback`, como `019_meal_plans.test.sql`). Si termina sin error, pasó.
5. Antes de pasar el PR a `waiting qa` (QA prueba contra la base compartida). Si después hace falta cambiarla, migración nueva: la registrada no se edita.

Casos de la prueba SQL:

- sin `sub` y anónimo → `42501` en las dos funciones; un `member` que llama a `get_household_members()` → `42501`;
- `get_household_members()` como admin: devuelve solo su familia, `display_name` del metadato o `null`, ningún correo;
- miembro sale → `left`, su fila desaparece, la del admin sigue;
- admin con otros, sin elegir → `transfer_required` sin cambios; elegido de otra familia y él mismo → `invalid_new_admin` sin cambios;
- admin con otros, elegido válido → `left`; queda **un solo** `admin` (el elegido) y el anterior no tiene fila;
- admin único → `household_deleted`; no quedan filas de esa familia en `households`, `household_members` ni `household_invite_links`; una `purchase_session` de esa familia queda con `household_id` en `null`;
- segunda llamada después de salir → `not_member`;
- las filas de `lists`, `recipes` y `meal_plans` del usuario que sale no cambian;
- como `authenticated`: `delete` y `update` directos sobre `household_members` siguen rechazados.

La concurrencia real (dos sesiones a la vez) no se puede reproducir en una sola transacción: se cubre por diseño ([Concurrencia](#concurrencia)) y con la revisión de `security-reviewer`. La prueba SQL sí comprueba los estados finales: después de cada salida, la familia tiene exactamente un `admin` o ya no existe.

### Flujo

1. **Abrir:** "Salir de la familia" → `onLeaveRequest` de `useHouseholdLeave`:
   - miembro → `confirming`;
   - admin → `loadingMembers` → `getHouseholdMembers()` → `confirming` (sin otros: aviso de que la familia se elimina; con otros: radios) o `membersLoadFailed`.
2. **Elegir (admin con otros):** el radio guarda el `userId`; "Salir" se habilita al elegir.
3. **Confirmar:** "Salir" → guarda `useRef` → `leaving` → `leaveHousehold(elegido)` (sin elegido, el parámetro no viaja y la base usa su `null`) → resultado:
   - `left` / `household_deleted` → cierra el diálogo, avisa al Facade, que vuelve a leer la membresía (estado sin familia) y muestra la confirmación;
   - `transfer_required` / `invalid_new_admin` → `loadingMembers` con el error, recarga los miembros y borra la elección. `transfer_required` recarga **aunque la pantalla mostrara un miembro**: llega si alguien se unió mientras el admin estaba solo, o si a un miembro le pasaron el rol con el diálogo abierto;
   - `not_member` → cierra y vuelve a leer la membresía, sin aviso;
   - error → `failed` (reintentar con la misma elección o cancelar).
   - Si la pantalla se cierra mientras sale o carga, la respuesta se ignora (`isMountedRef` y `isCancelled`).
4. **Cancelar:** cierra el diálogo sin llamar a la base (no se puede mientras `leaving`).

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Una RPC `security definer` que sale, transfiere o elimina | Políticas de `delete`/`update` en `household_members` | Con políticas, el cliente haría dos escrituras (dar el rol, borrar la propia) que pueden quedar a medias y dejar la familia sin admin o con dos; además podría tocar filas ajenas si una política se escribe mal. En una función es una transacción y la base valida identidad, membresía y rol |
| El cliente solo manda el `user_id` del nuevo admin | Mandar `household_id` o el rol | La familia y el rol de quien llama salen de `auth.uid()`; el elegido se valida contra la misma familia. Nada más es decisión del cliente |
| Bloquear `households` (`for update`) y volver a leer la membresía | Leer y escribir sin bloqueo | Dos salidas o una transferencia simultáneas podrían dejar la familia sin admin o con dos. Con el bloqueo, se ejecutan una después de otra y cada una ve el estado real |
| Orden de bloqueo enlace → household para **cualquiera** que salga | Solo para el admin, o bloquear solo `households` | `accept_household_invite` bloquea el enlace y después referencia `households`. Si el orden dependiera del rol leído antes de bloquear, un miembro al que le pasaron el rol mientras esperaba borraría la familia con el orden al revés y podría bloquearse en cruz con una unión. Con el mismo orden para todos, ese caso desaparece. No elimina todo interbloqueo posible ([Concurrencia](#concurrencia)): si Postgres aborta una llamada, la transacción se deshace entera y el usuario reintenta |
| Resultados de negocio como texto | Excepciones por caso | Mismo contrato que `accept_household_invite` (SCRUM-57): el servicio los traduce con un mapa; las excepciones quedan para permisos (`42501`) |
| `get_household_members()` solo para el admin | Para cualquier miembro | Decisión de la dueña de la historia: ver a todos es HU-35 |
| Nombre de los metadatos de Auth o "Miembro sin nombre" | Correo, enmascarado o completo | Decisión de la dueña de la historia: no exponer correos. No hay tabla de perfiles |
| Radios nativos dentro del diálogo | Primitivo `RadioGroup` compartido | No hay un segundo uso todavía (component-architecture: promover con el segundo consumidor) |
| Hook `useHouseholdLeave` compuesto por el Facade | Meterlo en `useHouseholdViewModel` | Mismo criterio que `useHouseholdInvite` y `useHouseholdJoinForm`: el Facade no crece |
| La opción vive en `/household` | Pantalla de Perfil | Perfil (HU-30) no existe; `/household` ya es "Mi familia" en el menú |

### Seguridad

- **Quién llega:** cualquier integrante de una familia. Solo un usuario registrado ejecuta las RPC; `anon` no tiene `execute` y los anónimos se rechazan adentro.
- **Lo que decide la base:** quién sale (`auth.uid()`), su familia y su rol (su fila), si el elegido es válido (mismo `household_id`, distinto de quien llama) y qué se borra.
- **Nunca sin admin:** la transferencia y el borrado de la fila del admin anterior van en la misma transacción, con la familia bloqueada.
- **Privacidad:** `get_household_members()` no devuelve correos; solo el admin la puede llamar y solo ve su familia.
- **Inyección:** solo parámetros tipados (`uuid`); sin SQL armado con strings. `search_path = ''` y nombres calificados.
- **Revisión:** el SQL pasa por `security-reviewer` antes de aplicarse, y el cambio completo antes de `waiting qa`.



| Qué | Dónde | Casos |
|---|---|---|

| RLS (parte A) | `supabase/tests/<n>_….test.sql` | Un miembro lee y escribe; uno de otra familia, quien ya salió y un anónimo no; nadie asocia una lista a una familia ajena; las listas privadas no se asocian; una sola lista general por familia |
| Funciones de lista (parte A) | Prueba SQL | Las cinco funciones agregan a la lista de la familia si la persona es miembro y a la personal si no |
| Compartir (parte B) | Prueba SQL | Reglas de T1; atómico (falla a la mitad: nada cambia); una sola vez por membresía; anónimo rechazado; concurrencia (dos traspasos, traspaso mientras otro agrega) |
| Salir (D6) | Prueba SQL (con SCRUM-58) | Quien sale pierde el acceso y conserva sus listas personales; resultado según T3 si la familia se elimina |
| Servicio | `features/household/tests/` y `features/shopping-list/tests/` | Funciones nuevas, valores fuera de contrato, errores sin datos |
| ViewModel | Hook de la pregunta | Cuándo se muestra (D1, D5, D9), elegir, doble clic, falla y reintento, no volver a preguntar |
| Componente | Pregunta y sección personal | Dos opciones igual de visibles, textos de D8, teclado, `role="alert"` y `role="status"` |
| Regresión | Tests existentes y E2E de `/lista` (`features/shopping-list/specs/E2E.md`) | Agregar, tachar, cantidades, eliminar, recetas, plan y modo compra, con y sin familia |
| Manual | Cuentas registradas de prueba | CA-01 a CA-05 con dos o tres cuentas; capturas sin correos ni tokens |

### Dependencias y Gitflow

- **SCRUM-58 (PR #63):** sigue `in progress` y su QA manual no está completo.
  - La PR de SCRUM-59 se abre con el commit de estos specs y label **`on hold`**: hay una sola PR `in progress` por persona y esta historia depende de una que no se mergeó.
  - Pasa a `in progress` cuando la #63 deje de estar en ese estado.
  - Sin apilar ramas: esta rama sale de `develop`.
- **La implementación empieza después del merge de la #63,** trayendo `develop` con un merge. Las dos historias tocan `Household.tsx`, `useHouseholdViewModel.ts` y los specs de `features/household/` (ver SPEC §15).
- **Aprobación del equipo:** la separación A/B (T5) y, si A entra en esta historia, el aumento de alcance.

### Documento del proyecto

Cuando se implemente (no ahora), `docs/documento-proyecto.md`:

- **§4.1:** "Listas personales al unirse (implementado {fecha}, SCRUM-59)", remitiendo a la decisión del 2026-08-19.
- **§4.2:** cómo funciona la lista general de la familia.
- **§6:** `lists`, `list_items` y `list_item_recipe_requirements` (acceso por membresía) y la regla de compartir.

`docs/DESIGN.md` §7.15 ya describe la pantalla. `docs/historias-usuario.md` no cambia; los textos aprobados (D8) quedan en la SPEC.

### Commits y PR

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-59): add personal list decision planning` | `SPEC.md`, `plan.md`, `tasks.md` |
| 2… | A definir cuando se resuelvan T1 a T5 | — |

Título del PR: `feat(SCRUM-59): manage personal lists when joining a household`, hacia `develop`, label `on hold` (ver arriba).

### Riesgos

- **Seguridad:** abrir la lista general a la familia es el cambio de acceso más grande del proyecto hasta ahora; un error de política expondría listas ajenas.
- **Regresiones** en `/lista`, el modo compra, las recetas y el plan.
- **Concurrencia** al compartir mientras otros agregan.
- **Conflictos de documentos** con la rama de SCRUM-58.
- **Caché de sesión:** `ensureSession` guarda la sesión de la primera vez (lo advierte la SPEC de SCRUM-49); `/lista` podría usar un id viejo después de iniciar sesión sin recargar.
- **Alcance:** si la parte A no se separa, la historia excede su estimación de 5 puntos.

| RPC | `supabase/tests/023_leave_household.test.sql` | Ver "Cómo se aplica y se prueba" |
| Servicio | `household.service.test.ts` | Cada resultado de `leave_household`; llamada solo con `new_admin_user_id`; valor desconocido → error; error de Supabase; `getHouseholdMembers` traduce filas y nombre nulo |
| Hook | `useHouseholdLeave.test.ts` | Miembro: abrir, confirmar → `left`; admin único → `household_deleted`; admin con otros: carga miembros, sin elegir no confirma, elegir y confirmar; `invalid_new_admin` recarga; falla de carga; falla al salir; cancelar no llama; doble clic → una llamada |
| Diálogo y pantalla | `HouseholdLeave.page.ts` + `HouseholdLeave.test.tsx` (jsdom) | Diálogo: textos según el caso; radios con label y "Miembro sin nombre"; "Salir" deshabilitado sin elegir y mientras sale; ningún id de miembro en el HTML (el modelo no trae correo: lo garantiza `get_household_members`, ver la prueba SQL). Pantalla: abrir no llama a la base; miembro, transferencia y admin único con su aviso en `role="status"`; `not_member` sin aviso; falla al salir con el diálogo abierto; cancelar |
| Manual | Con cuentas de prueba | CA-01 a CA-04 con capturas sin datos sensibles; las sesiones se cargan como en SCRUM-57 si `/login` sigue sin reCAPTCHA en local |

E2E: no se agrega, por el mismo motivo que SCRUM-57 (necesita cuentas registradas en la base compartida).

### Documento del proyecto

En la etapa de documentación, `docs/documento-proyecto.md`:

- **§4.1:** un punto "Salir del household (implementado {fecha}, SCRUM-58 / HU-34c)" que remita a la decisión del 2026-08-19 que ya está escrita ahí, con lo implementado (dónde está la opción, transferencia, eliminación).
- **§6, tabla de entidades:** en `household_members`, que las filas también se borran o cambian de rol con `leave_household`.
- **§6, reglas de negocio en la base:** la regla de salir (atómica, nunca sin admin, eliminación con cascada).

### Commits y PR

El PR (nuevo, independiente del #43) se abre con el commit 1, hacia `develop`, con label `in progress`.

| # | Commit | Archivos |
|---|---|---|
| 1 | `docs(SCRUM-58): add leave household spec, plan and tasks` | `SPEC.md`, `plan.md`, `tasks.md` |
| 2 | `feat(SCRUM-58): add leave household RPCs and SQL tests` | `023_leave_household.sql` y `supabase/tests/023_leave_household.test.sql` |
| 3 | `feat(SCRUM-58): add leave household functions to database types` | `types/database.types.ts` |
| 4 | `feat(SCRUM-58): add leave household constants and service` | constantes que usa el servicio, modelo, servicio y su test |
| 5 | `feat(SCRUM-58): add leave household view model` | `household.constants.ts` (todas las constantes del flujo de salir, en un solo bloque), `useHouseholdLeave.ts` y su test |
| 6 | `feat(SCRUM-58): add leave household dialog to the household screen` | diálogo, props, `Household.tsx`, `useHouseholdViewModel.ts`, `HouseholdLeave.page.ts` y `HouseholdLeave.test.tsx` |
| 7 | `docs(SCRUM-58): document leaving a household and update plan and tasks` | `documento-proyecto.md`, `plan.md`, `tasks.md` |
| 8 | `docs(SCRUM-58): record manual validation` (después del QA manual) | SPEC §13, `tasks.md` (7.2 y 7.4) |

La migración y su prueba SQL quedaron en un solo commit (el 2), en vez de los dos que se planearon (`feat` y `test`): se revisaron y se aplicaron juntas.

Lo que salga de las revisiones va en commits `fix(SCRUM-58): …`. Staging explícito, nunca `git add .`.

### Riesgos y deuda conocida

- **Listas compartidas:** contrato pendiente de HU-34b (SPEC §15).
- **Cuentas sin nombre:** aparecen como "Miembro sin nombre"; con dos o más así, el admin no puede distinguirlas. Se resuelve con perfiles (fuera de alcance).
- **Deuda M1:** borrar la cuenta del único admin sigue dejando la familia sin admin.
- **Rama atrás de `develop`:** `develop` avanzó (SCRUM-51) sin tocar household; se trae con un merge antes de `waiting qa`.
- **Número de la migración** sujeto a cambios hasta el merge.
- **Foco del `Modal`:** el primitivo compartido no atrapa el foco (documentado en su SPEC); con Tab se puede salir del diálogo. No es de esta historia.
- **Texto de la sección:** SPEC §8 pide "un texto corto" sin fijarlo; se usó "Puedes salir de tu familia cuando quieras. Tus listas personales se quedan contigo." (CA-04), a confirmar en la revisión.
- **Teclado (SPEC §9):** además del foco, al salir bien el botón "Salir" desaparece y el foco queda en `body`. Sin test automático: se valida a mano (guía de QA, caso de teclado).
- **Confirmación y resultado en dos carreras** (revisión de seguridad, baja): si un admin elige a alguien y los demás salen antes de confirmar, o a un miembro le pasan el rol y los demás salen, la base elimina la familia aunque el texto confirmado era otro. El aviso final dice lo que pasó. Evitarlo exige cambiar el contrato de la RPC: decisión de producto, fuera de esta historia.
- **Sesión vencida:** se ve como una falla cualquiera ("No se pudo salir…"), sin pedir volver a iniciar sesión. No escribe nada; mejora de experiencia para otra historia.
- **Mejoras opcionales anotadas (revisión de código):** pasar el armado de `leave.dialog` a un helper fuera del Facade, unificar las traducciones de resultado en tablas y un "Reintentar" tras `membersLoadFailed` (hoy SPEC §6 pide solo "Cancelar").
