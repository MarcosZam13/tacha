# Plan — SCRUM-108 (HU-78): Configuración y "encargado" por lista

Ver [SPEC.md](SPEC.md) para el qué y el por qué. Este archivo es el cómo.

## 1. Qué hay hoy (verificado en el código, 2026-11-15)

- `list_items.assigned_to` y `list_settings` están en documento-proyecto §6, pero **no existen** en el código ni en las migraciones (`grep assigned_to|list_settings` solo da el skill de gitflow).
- Las migraciones llegan a la `044`; las `037` y `041` son de SCRUM-115 (en QA) y puede haber otras en PR abiertos.
- El acceso a las listas sale de una sola regla, la política de `lists` de la `024`: la dueña si `household_id` es nulo, los integrantes si no. Las demás RPC `security definer` la repiten a mano (`set_list_item_checked`, 035; también `resolve_list_item_shortfall` y su auxiliar `lock_visible_list_item`, 037, que todavía está en el PR de SCRUM-115 y se toma como referencia).
- La fila de la lista general es `features/shopping-list/components/ShoppingListRow.tsx`; la de la sublista es `features/date-lists/components/DateListItemRow.tsx`. Son de dos features que no pueden importarse entre sí.
- Los nombres de los integrantes salen de `get_household_members` (`display_name`, `is_current_user`, `user_id`), ya usada por `features/household/`.
- El Perfil (`features/profile/Profile.tsx`) ya tiene el enlace a "Cambiar contraseña" y el botón de cerrar sesión. `APP_ROUTE` está en `constants/routes.constants.ts`.

## 2. Estructura

```
supabase/
  migrations/
    045_list_assignee_settings.sql        (número a confirmar)  list_settings + assigned_to + 3 RPC
  tests/
    045_list_assignee_settings.test.sql
app/(app)/perfil/configuracion/page.tsx    ruta delgada: <ListSettings />
features/list-settings/
  ListSettings.tsx                         presentación de la pantalla
  components/
    ListSettingsRow.tsx                    nombre de la lista + interruptor
    AssigneeSwitch.tsx                     <button role="switch">
    models/
  constants/list-settings.constants.ts     textos, estados, códigos de error
  hooks/useListSettingsViewModel.ts
  models/
  services/list-settings.service.ts        listas visibles + set_list_assignee_enabled
  specs/ SPEC.md plan.md tasks.md
  tests/
components/assignee-field/                 el campo de la fila, compartido
  AssigneeField.tsx                        botón "Encargado: X" + selector (Modal)
  hooks/useAssigneeFieldViewModel.ts
  models/
  constants/assignee-field.constants.ts
  services/assignee.service.ts             candidatos + set_list_item_assignee
  tests/
features/profile/components/ProfileSettingsLink.tsx    enlace "Configuración"
features/profile/Profile.tsx               + <ProfileSettingsLink /> entre los dos enlaces actuales
features/shopping-list/...                 + assigneeEnabled y assignedTo en el ViewModel y la fila
features/date-lists/...                    + lo mismo en el detalle de la sublista
constants/routes.constants.ts              + APP_ROUTE.LIST_SETTINGS = "/perfil/configuracion"
types/database.types.ts                    regenerado
docs/documento-proyecto.md                 §4.13 y §6 actualizados
```

## 3. Migración

Una sola, `045` (**número a confirmar** contra `develop`, los PR abiertos y la base justo antes de crearla y otra vez antes del merge; si alguien lo tomó, se renombra mientras no esté aplicada).

**Tabla `list_settings`**

```sql
create table public.list_settings (
  list_id uuid primary key references public.lists (id) on delete cascade,
  assignee_enabled boolean not null default false
);
alter table public.list_settings enable row level security;
revoke all on public.list_settings from public, anon, authenticated;
grant select on public.list_settings to authenticated;
create policy "reads settings of visible lists"
  on public.list_settings for select to authenticated
  using (exists (select 1 from public.lists l where l.id = list_settings.list_id));
```

Sin políticas ni permisos de escritura: solo escribe la RPC.

**Columna `list_items.assigned_to`**

```sql
alter table public.list_items
  add column assigned_to uuid references auth.users (id) on delete set null;
```

Sin `grant update (assigned_to)`: la política de `list_items` de la `024` deja a cualquiera con acceso actualizar fila, pero los permisos de columna (016, 037) limitan qué columnas puede escribir el cliente. Se **verifica** en la prueba SQL que un `update ... set assigned_to` directo falla.

**RPC** (todas `security definer`, `set search_path = ''`, solo `authenticated`; revocar a `public`/`anon`):

| Función | Qué hace | Errores |
|---|---|---|
| `set_list_assignee_enabled(target_list_id uuid, enabled boolean)` → `list_settings` | Comprueba que la lista se ve (regla de la `024`), `insert ... on conflict (list_id) do update`, y devuelve la fila | sin sesión `42501`; lista no visible `P0002` |
| `get_list_assignee_candidates(target_list_id uuid)` → `table(user_id, display_name, is_current_user)` | Las personas con acceso a la lista: con `household_id`, los integrantes; sin él, solo `auth.uid()` si es la dueña | sin sesión `42501`; lista no visible `P0002` |
| `set_list_item_assignee(target_item_id uuid, new_assignee uuid)` → `list_items` | Comprueba que el producto está en una lista visible, que `new_assignee` es nulo o tiene acceso a esa lista (regla anterior) y lo escribe | sin sesión `42501`; producto no visible `P0002`; encargado sin acceso `22023` |

La comprobación de acceso se escribe una vez como función auxiliar interna (sin `execute` para el cliente, como `lock_visible_list_item` de la `037`) y la usan las tres RPC. **No se reciben ids de persona para decidir el acceso**: solo `new_assignee`, que se valida contra la lista.

**Prueba SQL** (`supabase/tests/045_...test.sql`, `begin ... rollback`, como las demás): sin sesión; lista ajena; encender, apagar y recargar; un encargado de la familia y uno sin acceso; apagar no borra `assigned_to`; `update` directo del cliente a `list_settings` y a `assigned_to` falla; `anon` sin `execute`; el candidato de una lista personal es solo la dueña; salir de la familia deja de listarlo como candidato.

## 4. Flujo

**Configuración.** `page.tsx` → `ListSettings` → `useListSettingsViewModel` → `list-settings.service`:

1. `getSettableLists()`: `lists` visibles (`type in ('general','date')`, ordenadas: general primero, luego sublistas por fecha) más sus filas de `list_settings` en una sola lectura (`list_settings(assignee_enabled)` embebido). Sin fila = apagado.
2. Tocar el interruptor llama a `set_list_assignee_enabled`. El ViewModel actualiza esa lista al resultado; si falla, vuelve al valor anterior y muestra el error.

**La fila.** El ViewModel de la lista (general o sublista) pide, junto con los productos, `assignee_enabled` de **su** lista y `assigned_to` de cada producto. Si está encendido, cada fila renderiza `<AssigneeField />` con el nombre del encargado. Al abrir el selector, `get_list_assignee_candidates` carga las personas; elegir llama a `set_list_item_assignee` y la fila se actualiza con el resultado. El nombre se resuelve contra los candidatos: si el `assigned_to` no está entre ellos (salió de la familia), se muestra "Sin asignar" (regla 8).

## 5. Decisiones y alternativas

| Decisión | Alternativa | Por qué |
|---|---|---|
| `list_settings` por lista con RPC de escritura | Una columna `assignee_enabled` en `lists` | Documento-proyecto §6 ya define `list_settings` y deja la pantalla de Configuración lista para sumar ajustes sin alterar `lists`. Costo: una tabla más y un `left join` |
| Fila ausente = apagado | Crear una fila por lista al crearla | No hay que tocar `create_date_list` ni `ensure_general_list_id`, y las listas ya existentes funcionan sin backfill |
| Cualquiera con acceso a la lista puede encenderlo (D2) | Solo la dueña / la admin de la familia | La lista es compartida y tachar o agregar ya lo puede cualquier integrante; una regla distinta aquí sería la única excepción. **A confirmar con Marcos** |
| El selector de encargado entra en esta historia (D3, D4) | Solo el interruptor y un campo de solo lectura | CA-03 dice "sin borrar lo que ya estaba asignado": hay que poder asignar. Costo: una RPC más y el selector. **A confirmar con Marcos** |
| Componente compartido `components/assignee-field/` | Duplicarlo en cada feature | Lo usan `shopping-list` y `date-lists`, que no pueden importarse entre sí (precedente `components/password-input/`) |
| `assigned_to` con `on delete set null` | Borrar la fila del producto | Borrar un usuario no debe borrar productos de la lista |
| Encargado fuera de la familia se ve "Sin asignar" y el dato queda | Limpiar `assigned_to` al salir de la familia | Evita un trigger en el flujo de household (otra feature) y mantiene la regla simple |
| Sin tiempo real | Realtime sobre `list_settings` | Fuera de alcance, como SCRUM-155 |

## 6. Pruebas

- **Vitest:** `list-settings.service` (columnas y RPC con nombres literales, mapeo de errores por código), `useListSettingsViewModel` (carga, guardar, revertir si falla), `ListSettings` y `AssigneeSwitch` con un Page Object (`ListSettings.page.ts`), `useAssigneeFieldViewModel` y `AssigneeField` (abrir, elegir, "Sin asignar", error), y los ViewModel de `shopping-list` y `date-lists` (el campo aparece solo con el ajuste encendido; apagarlo no borra).
- **SQL:** `045_list_assignee_settings.test.sql`, lo anotado en la sección 3.
- **E2E** (`features/list-settings/specs/E2E.md` y `e2e/features/list-settings/`), con las reglas de `playwright-e2e`: encender el ajuste y ver el campo en la fila; elegir y recargar; apagar sin perder el valor. Las pruebas de la base real y la familia son manuales.
- **Manual (acceso real):** dos cuentas de la misma familia para ver el ajuste y los encargados compartidos; mobile y teclado.

## 7. Riesgos

- Toca `features/shopping-list/` y `features/date-lists/`, que son de Marcos. Los cambios allí son mínimos (leer dos datos y pintar un componente), y Marcos revisa. Puede haber conflicto con los PR abiertos de esas features (`SCRUM-78`, #98): se resuelve manteniendo los dos cambios.
- El número de migración puede colisionar: se revisa antes del merge.
- La política `024` de `lists` es la única regla de acceso; si cambia (listas privadas con colaboradores, HU-49), hay que cambiar también las tres RPC. Queda anotado en el comentario de la migración.
