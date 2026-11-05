-- ============================================================================
-- SCRUM-78 (HU-46): el estado de una sublista.
--
-- Completada: se deriva de sus productos, y por eso lo decide un trigger y no el
-- cliente. Así da igual desde dónde se tache (dos personas de la familia, dos
-- pestañas o cualquier RPC que toque list_items).
-- Cancelada: la decide una persona, y los productos no la cambian.
-- Spec: features/date-lists/specs/SPEC.md, §9.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- La regla, en un solo lugar: completada si tiene productos y ninguno pendiente.
-- Sin productos sigue activa: "todos tachados" no se cumple con una lista vacía.
-- ----------------------------------------------------------------------------
create or replace function public.date_list_status_from_items(target_list_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.list_items li
      where li.list_id = target_list_id
    )
    and not exists (
      select 1 from public.list_items li
      where li.list_id = target_list_id
        and li.checked_at is null
    )
    then 'completed'
    else 'active'
  end;
$$;

-- Es una pieza interna: la usan el trigger y la RPC de abajo.
revoke execute on function public.date_list_status_from_items(uuid) from public, anon, authenticated;

create or replace function public.sync_date_list_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_list_id uuid := case when tg_op = 'DELETE' then old.list_id else new.list_id end;
begin
  -- El bloqueo evita una carrera: si dos personas tachan los dos últimos productos
  -- a la vez, cada una vería al otro como pendiente y ninguna completaría la lista.
  -- Con el bloqueo la segunda espera, y lee lo que la primera ya confirmó.
  perform 1
  from public.lists l
  where l.id = changed_list_id
    and l.type = 'date'
    and l.status <> 'cancelled'
  for update;

  if found then
    update public.lists l
    set status = public.date_list_status_from_items(changed_list_id)
    where l.id = changed_list_id
      and l.status <> public.date_list_status_from_items(changed_list_id);
  end if;

  return null;
end;
$$;

revoke execute on function public.sync_date_list_status() from public, anon, authenticated;

-- "of checked_at": cambiar la cantidad no afecta el estado, y no vale la pena el bloqueo.
create trigger list_items_sync_date_list_status
  after insert or delete or update of checked_at on public.list_items
  for each row
  execute function public.sync_date_list_status();

-- ----------------------------------------------------------------------------
-- Cancelar y reactivar. No borra nada (CA-02). security definer porque decide el
-- estado la base; el acceso es la misma regla de set_list_item_checked (035).
-- Al reactivar se recalcula: si todo estaba tachado, vuelve como completada.
-- ----------------------------------------------------------------------------
create or replace function public.set_date_list_cancelled(target_list_id uuid, is_cancelled boolean)
returns public.lists
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  updated_list public.lists;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para cambiar una sublista'
      using errcode = '42501';
  end if;

  if is_cancelled is null then
    raise exception 'Falta indicar si se cancela'
      using errcode = '22023';
  end if;

  update public.lists l
  set status = case
    when is_cancelled then 'cancelled'
    else public.date_list_status_from_items(l.id)
  end
  where l.id = target_list_id
    and l.type = 'date'
    and (
      (l.household_id is null and l.owner_id = current_user_id)
      or l.household_id in (
        select m.household_id from public.household_members m
        where m.user_id = current_user_id
      )
    )
  returning * into updated_list;

  if updated_list.id is null then
    raise exception 'La sublista no existe o no es tuya'
      using errcode = 'P0002';
  end if;

  return updated_list;
end;
$$;

revoke execute on function public.set_date_list_cancelled(uuid, boolean) from public, anon;
grant execute on function public.set_date_list_cancelled(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- Agregar a una completada ahora se puede, y el trigger la reabre. Sin esto, al
-- tachar lo último ya no se podría agregar lo que faltó. La cancelada sigue cerrada.
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
    and l.status <> 'cancelled';

  if not found then
    raise exception 'La sublista no existe o está cancelada'
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
