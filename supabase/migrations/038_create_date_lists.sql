-- ============================================================================
-- SCRUM-77 (HU-45): crear sublistas por fecha y agregarles productos.
--
-- lists ya admitía type = 'date' desde 004, pero sin dónde guardar el nombre
-- ni la fecha, y sin forma de crearla: la política de insert solo deja crear
-- la lista general. Spec: features/date-lists/specs/SPEC.md.
-- ============================================================================

alter table public.lists
  add column name text,
  add column event_date date;

-- Nombre y fecha son de las sublistas: obligatorios ahí, nulos en las demás.
alter table public.lists
  add constraint lists_date_fields_check check (
    (
      type = 'date'
      and name is not null
      and name = btrim(name)
      and char_length(name) between 1 and 60
      and event_date is not null
    )
    or (type <> 'date' and name is null and event_date is null)
  );

create index lists_date_event_date_idx
  on public.lists (event_date)
  where type = 'date';

-- ----------------------------------------------------------------------------
-- Crear. security definer porque la política de insert de lists solo admite la
-- general; por eso dueño y familia salen de la sesión, nunca del cliente: en
-- una familia la sublista es de la familia, sin familia es personal (la misma
-- regla de ensure_general_list_id, 024).
-- ----------------------------------------------------------------------------
create or replace function public.create_date_list(list_name text, list_event_date date)
returns public.lists
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  trimmed_name text := btrim(list_name);
  member_household_id uuid;
  created_list public.lists;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para crear una sublista'
      using errcode = '42501';
  end if;

  if trimmed_name is null or char_length(trimmed_name) not between 1 and 60 then
    raise exception 'El nombre tiene que tener entre 1 y 60 caracteres'
      using errcode = '22023';
  end if;

  -- No se valida que sea futura: el "hoy" de la base está en UTC y en la noche
  -- de Costa Rica ya es mañana. Eso lo valida la UI, con la fecha local.
  if list_event_date is null then
    raise exception 'La fecha es obligatoria'
      using errcode = '22023';
  end if;

  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  insert into public.lists (owner_id, household_id, type, name, event_date)
  values (current_user_id, member_household_id, 'date', trimmed_name, list_event_date)
  returning * into created_list;

  return created_list;
end;
$$;

revoke execute on function public.create_date_list(text, date) from public, anon;
grant execute on function public.create_date_list(text, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Agregar. security invoker: la RLS decide qué listas ve quien llama, así que
-- una sublista ajena no se encuentra. Misma regla de la lista general: suma a
-- la fila pendiente o crea una (índice parcial de 035).
-- ----------------------------------------------------------------------------
create or replace function public.add_item_to_date_list(target_list_id uuid, target_variant_id uuid)
returns public.list_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  upserted_item public.list_items;
begin
  perform 1
  from public.lists l
  where l.id = target_list_id
    and l.type = 'date'
    and l.status = 'active';

  if not found then
    raise exception 'La sublista no existe o ya no está activa'
      using errcode = 'P0002';
  end if;

  insert into public.list_items (list_id, product_catalog_variant_id)
  values (target_list_id, target_variant_id)
  on conflict (list_id, product_catalog_variant_id) where checked_at is null
  do update set quantity_requested = public.list_items.quantity_requested + 1
  returning * into upserted_item;

  return upserted_item;
end;
$$;

revoke execute on function public.add_item_to_date_list(uuid, uuid) from public, anon;
grant execute on function public.add_item_to_date_list(uuid, uuid) to authenticated;
