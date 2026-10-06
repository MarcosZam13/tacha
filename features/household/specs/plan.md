# Plan técnico: crear household y link de invitación

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

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
3. **Aplicar y tipos:** la persona dueña de la historia aplica la migración en el SQL Editor (la base es compartida: avisar al equipo), verifica los objetos y permisos, compara `types/database.types.ts` con la base real y prueba la base simulando usuarios ([ver arriba](#cómo-se-prueba-la-base-antes-de-tener-ui)).
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
- **Tests automáticos:** no hay runner en el repo (decisión de equipo). Ver [tasks.md](tasks.md#pendiente-cuando-el-proyecto-tenga-runner-de-tests).
- **Enlazar `/household`** desde el Perfil (HU-30), el sidebar y el onboarding cuando existan.
- **Integración con otras tablas:** FKs de `lists.household_id` y `recipes.household_id`, políticas de miembros en esas tablas, y la política de escritura por membresía en `household_store_preferences`: la migración `009` (SCRUM-123) ya cerró la escritura pública, pero dejó pendiente esa política (`docs/catalogo-scraping/TICKET-seguridad-household-store-preferences.md`). Ya es posible una vez aplicada la migración `011`, pero corresponde a sus historias o dueños: se avisa al equipo.
