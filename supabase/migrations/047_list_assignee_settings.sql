-- ============================================================================
-- SCRUM-108 (HU-78): el "encargado" por lista. Un ajuste por lista que lo
-- enciende, y el encargado de cada producto.
--
--   - list_settings: un ajuste por lista (hoy solo assignee_enabled, apagado por
--     defecto). Sin fila = apagado. Solo se escribe por RPC.
--   - list_items.assigned_to: quién debe comprar ese producto. Opcional. Apagar
--     el ajuste no lo borra (HU-78 CA-03).
--   - set_list_assignee_enabled, get_list_assignee_candidates y
--     set_list_item_assignee: las tres RPC que usa la pantalla.
--
-- Spec: features/list-settings/specs/SPEC.md y plan.md.
--
-- Regla de acceso (una sola, la de la política "owner or household member
-- reads lists" de la 024): una lista la ve la dueña si household_id es nulo, y
-- los integrantes si no. Las tres RPC y el trigger la comprueban con
-- list_grants_access. Si esa política cambia (listas privadas con
-- colaboradores, HU-49), hay que cambiar list_grants_access y la política de
-- list_settings de aquí.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. list_settings. RLS activada: se lee solo lo de las listas que se ven. No
--    tiene permisos de escritura para el cliente: solo escribe
--    set_list_assignee_enabled.
-- ----------------------------------------------------------------------------
create table public.list_settings (
  list_id uuid primary key references public.lists (id) on delete cascade,
  assignee_enabled boolean not null default false
);

alter table public.list_settings enable row level security;

revoke all on public.list_settings from public, anon, authenticated;
grant select on public.list_settings to authenticated;

-- La subconsulta lee lists con los permisos de quien llama: su política
-- (024) deja pasar solo las listas visibles.
create policy "reads settings of visible lists"
  on public.list_settings for select
  to authenticated
  using (exists (select 1 from public.lists l where l.id = list_settings.list_id));

-- ----------------------------------------------------------------------------
-- 2. list_items.assigned_to. on delete set null: borrar una cuenta no borra
--    productos de la lista. Sin permiso de update para el cliente (005 dejó la
--    tabla con permisos por columna): solo escribe set_list_item_assignee.
--    El índice es el de la FK, para que borrar una cuenta no recorra la tabla.
-- ----------------------------------------------------------------------------
alter table public.list_items
  add column assigned_to uuid references auth.users (id) on delete set null;

create index list_items_assigned_to_idx
  on public.list_items (assigned_to)
  where assigned_to is not null;

-- ----------------------------------------------------------------------------
-- 3. list_grants_access: la regla de acceso de la 024, para cualquier persona.
--    Interna (sin execute para el cliente): la usan las RPC con auth.uid() para
--    "quien llama ve la lista", y con el encargado elegido para "el encargado
--    tiene acceso". security definer porque lee household_members, que cada
--    quien solo ve en su fila.
-- ----------------------------------------------------------------------------
create function public.list_grants_access(target_list_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lists l
    where l.id = target_list_id
      and (
        (l.household_id is null and l.owner_id = target_user_id)
        or l.household_id in (
          select m.household_id from public.household_members m
          where m.user_id = target_user_id
        )
      )
  );
$$;

revoke execute on function public.list_grants_access(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Respaldo en la base: un encargado sin acceso a la lista no se guarda por
--    ningún camino (la RPC, un insert directo o SQL manual). El mensaje es el
--    mismo que el de la RPC. No corre al poner assigned_to en null, que es lo
--    que hace la FK al borrar una cuenta.
-- ----------------------------------------------------------------------------
create function public.check_list_item_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.list_grants_access(new.list_id, new.assigned_to) then
    raise exception 'La persona elegida no tiene acceso a esta lista'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_list_item_assignee() from public, anon, authenticated;

create trigger list_items_check_assignee
  before insert or update of assigned_to on public.list_items
  for each row
  when (new.assigned_to is not null)
  execute function public.check_list_item_assignee();

-- ----------------------------------------------------------------------------
-- 5. set_list_assignee_enabled: enciende o apaga el "encargado" de una lista.
--    Crea la fila la primera vez. La sesión se comprueba antes que los
--    parámetros, para no revelar qué es válido a quien no la tiene.
--    Cualquier persona que vea la lista puede cambiarlo: es la lista
--    compartida, igual que tachar o agregar productos (D2 del SPEC).
-- ----------------------------------------------------------------------------
create function public.set_list_assignee_enabled(target_list_id uuid, enabled boolean)
returns public.list_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_settings public.list_settings;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para cambiar la configuración de la lista'
      using errcode = '42501';
  end if;

  if target_list_id is null or enabled is null then
    raise exception 'Faltan la lista o el valor del ajuste'
      using errcode = '22023';
  end if;

  if not public.list_grants_access(target_list_id, current_user_id) then
    raise exception 'La lista no existe o no es tuya'
      using errcode = 'P0002';
  end if;

  insert into public.list_settings (list_id, assignee_enabled)
  values (target_list_id, enabled)
  on conflict (list_id) do update
    set assignee_enabled = excluded.assignee_enabled
  returning * into saved_settings;

  return saved_settings;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. get_list_assignee_candidates: las personas que pueden ser encargadas de
--    esta lista, que son las que tienen acceso a ella. Con familia, sus
--    integrantes; sin ella, solo la dueña. El nombre sale de los metadatos del
--    registro (puede ser nulo) y nunca se devuelve el correo.
--    get_household_members (023) no sirve: solo la admin lo puede llamar.
-- ----------------------------------------------------------------------------
create function public.get_list_assignee_candidates(target_list_id uuid)
returns table (user_id uuid, display_name text, is_current_user boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
-- user_id es a la vez columna de salida y de las tablas: ante un nombre sin
-- calificar, usar la columna. Además todo va calificado con alias.
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para ver las personas de la lista'
      using errcode = '42501';
  end if;

  if target_list_id is null or not public.list_grants_access(target_list_id, current_user_id) then
    raise exception 'La lista no existe o no es tuya'
      using errcode = 'P0002';
  end if;

  return query
  select
    u.id,
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    u.id = current_user_id
  from public.lists l
  join auth.users u on u.id = l.owner_id and l.household_id is null
  where l.id = target_list_id
  union all
  select
    u.id,
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    u.id = current_user_id
  from public.lists l
  join public.household_members m on m.household_id = l.household_id
  join auth.users u on u.id = m.user_id
  where l.id = target_list_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. set_list_item_assignee: elige al encargado de un producto, o con null lo
--    quita. El producto tiene que estar en una lista que quien llama ve, y el
--    encargado, tener acceso a esa misma lista. Solo cambia assigned_to: no
--    tacha ni toca cantidades, la presentación ni compras cerradas.
--    Es security definer porque la columna no tiene permiso de update para el
--    cliente; el acceso se comprueba a mano, como en set_list_item_checked (035).
-- ----------------------------------------------------------------------------
create function public.set_list_item_assignee(target_item_id uuid, new_assignee uuid)
returns public.list_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_item public.list_items;
  changed_item public.list_items;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para elegir al encargado'
      using errcode = '42501';
  end if;

  if target_item_id is null then
    raise exception 'Falta el producto'
      using errcode = '22023';
  end if;

  select li.* into target_item
  from public.list_items li
  where li.id = target_item_id
    and public.list_grants_access(li.list_id, current_user_id)
  for update of li;

  if target_item.id is null then
    raise exception 'El producto no está en tu lista'
      using errcode = 'P0002';
  end if;

  if new_assignee is not null
    and not public.list_grants_access(target_item.list_id, new_assignee) then
    raise exception 'La persona elegida no tiene acceso a esta lista'
      using errcode = '22023';
  end if;

  update public.list_items
  set assigned_to = new_assignee
  where id = target_item_id
  returning * into changed_item;

  return changed_item;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Permisos de las tres RPC: solo cuentas con sesión.
-- ----------------------------------------------------------------------------
revoke execute on function public.set_list_assignee_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_list_assignee_enabled(uuid, boolean) to authenticated;

revoke execute on function public.get_list_assignee_candidates(uuid) from public, anon;
grant execute on function public.get_list_assignee_candidates(uuid) to authenticated;

revoke execute on function public.set_list_item_assignee(uuid, uuid) from public, anon;
grant execute on function public.set_list_item_assignee(uuid, uuid) to authenticated;
