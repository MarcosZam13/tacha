-- ============================================================================
-- SCRUM-66 (HU-36e): tachar y destachar un producto de la lista
--
-- checked_at null = pendiente; con fecha = tachado y cuándo. Una sola columna
-- para el estado y la fecha, así no pueden contradecirse. checked_by guarda
-- quién lo tachó (documento-proyecto §4.2: "quién compró, cuándo").
--
-- Quién y cuándo los pone la base (trigger), nunca el cliente: con la API
-- cualquiera podría mandar otra fecha u otro usuario.
-- ============================================================================

alter table public.list_items
  add column checked_at timestamptz,
  add column checked_by uuid references auth.users (id) on delete set null;

create index list_items_checked_by_idx on public.list_items (checked_by);

-- ----------------------------------------------------------------------------
-- stamp_list_item_check: normaliza las dos columnas en cada insert/update.
-- - checked_at null      → checked_by null (pendiente).
-- - ya estaba tachada     → conserva su fecha y su autor: tachar otra vez, o
--                           cambiar la cantidad de una fila tachada, no mueve
--                           cuándo se compró.
-- - se tacha ahora        → now() y auth.uid(), ignorando lo que mandó el cliente.
-- ----------------------------------------------------------------------------

create or replace function public.stamp_list_item_check()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.checked_at is null then
    new.checked_by := null;
  elsif tg_op = 'UPDATE' and old.checked_at is not null then
    new.checked_at := old.checked_at;
    new.checked_by := old.checked_by;
  else
    new.checked_at := now();
    new.checked_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger list_items_stamp_check
  before insert or update on public.list_items
  for each row execute function public.stamp_list_item_check();

-- El UPDATE directo puede tachar o destachar (la política de update de 004
-- sigue limitando a las filas propias), pero no escribir checked_by.
grant update (checked_at) on public.list_items to authenticated;

-- ----------------------------------------------------------------------------
-- set_list_item_checked: recibe el estado deseado, no "invertir". Si dos
-- pestañas mandan "tachar", las dos quieren lo mismo y el resultado es uno.
-- security invoker: la política "owner updates items of own lists" decide qué
-- filas puede tocar quien llama; un item ajeno no se encuentra.
-- ----------------------------------------------------------------------------

create or replace function public.set_list_item_checked(target_item_id uuid, is_checked boolean)
returns public.list_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_item public.list_items;
begin
  -- now() es solo para que no quede null; el trigger pone la hora definitiva.
  update public.list_items
  set checked_at = case when is_checked then now() end
  where id = target_item_id
  returning * into changed_item;

  if changed_item.id is null then
    raise exception 'El producto no está en tu lista'
      using errcode = 'P0002';
  end if;

  return changed_item;
end;
$$;

revoke execute on function public.set_list_item_checked(uuid, boolean) from public, anon;
grant execute on function public.set_list_item_checked(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- add_item_to_general_list (004), misma firma: añadir una variante que está
-- tachada la reabre con cantidad 1 en vez de sumarle. unique (list_id,
-- variant) obliga a reusar la fila, y si estaba tachada de otro día quedaría
-- escondida (la lista solo muestra lo tachado hoy).
-- ----------------------------------------------------------------------------

create or replace function public.add_item_to_general_list(target_variant_id uuid)
returns public.list_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  general_list_id uuid;
  upserted_item public.list_items;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para añadir productos'
      using errcode = '42501';
  end if;

  insert into public.lists (owner_id, type)
  values (current_user_id, 'general')
  on conflict (owner_id) where type = 'general' and household_id is null
  do nothing;

  select l.id into general_list_id
  from public.lists l
  where l.owner_id = current_user_id
    and l.type = 'general'
    and l.household_id is null;

  insert into public.list_items (list_id, product_catalog_variant_id)
  values (general_list_id, target_variant_id)
  on conflict (list_id, product_catalog_variant_id)
  do update set
    quantity_requested = case
      when public.list_items.checked_at is null then public.list_items.quantity_requested + 1
      else 1
    end,
    checked_at = null
  returning * into upserted_item;

  return upserted_item;
end;
$$;
