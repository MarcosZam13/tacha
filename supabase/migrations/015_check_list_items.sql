-- ============================================================================
-- SCRUM-66 (HU-36e): tachar y destachar un producto de la lista
--
-- checked_at null = pendiente; con fecha = tachado y cuándo. Una sola columna
-- para el estado y la fecha, así no pueden contradecirse. checked_by guarda
-- quién lo tachó (documento-proyecto §4.2: "quién compró, cuándo").
--
-- Quién y cuándo los pone la base (trigger), nunca el cliente: con la API
-- cualquiera podría mandar otra fecha u otro usuario.
--
-- Partes:
-- 1. Columnas checked_at / checked_by y el trigger que las llena.
-- 2. RPC set_list_item_checked.
-- 3. Añadir algo tachado lo reabre en vez de sumarle: add_item_to_general_list
--    (004) y add_units_to_list_item (013).
-- 4. add_recipe_to_general_list (013): lo comprado no cuenta como "ya en la lista".
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

-- ----------------------------------------------------------------------------
-- add_units_to_list_item (013), misma firma y misma regla que
-- add_item_to_general_list: si la fila está tachada, se reabre y la cantidad
-- pasa a ser la que se pide ahora, no la suma con lo ya comprado.
-- ----------------------------------------------------------------------------

create or replace function public.add_units_to_list_item(
  target_list_id uuid,
  target_variant_id uuid,
  units_to_add integer
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (target_list_id, target_variant_id, units_to_add)
  on conflict (list_id, product_catalog_variant_id)
  do update set
    quantity_requested = case
      when public.list_items.checked_at is null
        then public.list_items.quantity_requested + excluded.quantity_requested
      else excluded.quantity_requested
    end,
    checked_at = null
  returning id;
$$;

-- ----------------------------------------------------------------------------
-- add_recipe_to_general_list (013), igual que en 013 salvo una condición:
-- toda consulta que mira qué hay en la lista agrega `li.checked_at is null`.
-- Lo comprado no cuenta como "ya en la lista": ni lo que hay (reglas 19, 20 y
-- 22) ni lo que otras recetas pidieron sobre filas ya compradas (regla 20).
-- Si la presentación elegida es la de una fila tachada, add_units_to_list_item
-- la reabre y vuelve a Pendientes.
--
-- Pendiente para SCRUM-98 (SPEC de shopping-list §14): al reabrir una fila,
-- sus registros viejos de list_item_recipe_requirements siguen colgados de
-- ella y vuelven a contar como pedidos.
-- ----------------------------------------------------------------------------

create or replace function public.add_recipe_to_general_list(target_recipe_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_ingredients constant integer := 50;
  general_list_id uuid;
  found_recipe_id uuid;
  ingredient_count integer;
  ingredient record;
  chosen_variant_id uuid;
  chosen_base_quantity numeric;
  target_item_id uuid;
  product_row_count integer;
  listed_quantity numeric;
  claimed_quantity numeric;
  available_quantity numeric;
  missing_quantity numeric;
  added_names text[] := '{}';
  skipped_names text[] := '{}';
  missing_items jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para agregar recetas a la lista'
      using errcode = '42501';
  end if;

  -- RLS oculta las recetas ajenas: no existe y no es tuya dan el mismo error.
  select r.id into found_recipe_id
  from public.recipes r
  where r.id = target_recipe_id;

  if found_recipe_id is null then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  -- Mismo tope que save_recipe. Se repite acá porque recipe_ingredients
  -- también se puede escribir directo (políticas de 007), sin pasar por save_recipe.
  select count(*) into ingredient_count
  from public.recipe_ingredients ri
  where ri.recipe_id = found_recipe_id;

  if ingredient_count > max_ingredients then
    raise exception 'La receta puede tener hasta % ingredientes', max_ingredients
      using errcode = '22023';
  end if;

  -- Misma lista general que add_item_to_general_list (004): se crea si no existe.
  insert into public.lists (owner_id, type)
  values (current_user_id, 'general')
  on conflict (owner_id) where type = 'general' and household_id is null
  do nothing;

  select l.id into general_list_id
  from public.lists l
  where l.owner_id = current_user_id
    and l.type = 'general'
    and l.household_id is null;

  -- Dos agregados a la misma lista al mismo tiempo se hacen uno detrás del
  -- otro: si no, los dos verían el mismo "disponible" (regla 20) y ninguno
  -- registraría faltante. Bloqueo de transacción y no "select ... for update"
  -- porque lists no tiene política de update, y for update la exige. Se suelta
  -- solo al terminar la función.
  perform pg_advisory_xact_lock(hashtextextended(general_list_id::text, 0));

  for ingredient in
    select
      ri.product_catalog_id,
      ri.quantity_value as needed_quantity,
      ri.quantity_unit as needed_unit,
      pc.name as product_name
    from public.recipe_ingredients ri
    join public.product_catalog pc on pc.id = ri.product_catalog_id
    where ri.recipe_id = found_recipe_id
    order by ri.position
  loop
    chosen_variant_id := null;
    chosen_base_quantity := null;
    target_item_id := null;

    -- Regla 26: sin ninguna presentación usable, el ingrediente no se agrega.
    if not exists (
      select 1 from public.product_catalog_variants v
      where v.product_catalog_id = ingredient.product_catalog_id
        and v.base_quantity > 0
    ) then
      skipped_names := array_append(skipped_names, ingredient.product_name);
      continue;
    end if;

    if not exists (
      select 1 from public.product_catalog_variants v
      where v.product_catalog_id = ingredient.product_catalog_id
        and v.base_quantity > 0
        and v.base_unit = ingredient.needed_unit
    ) then
      -- ----------------------------------------------------------------------
      -- Regla 22: ninguna presentación tiene la unidad del ingrediente. No se
      -- puede comparar: si el producto ya tiene fila no se suma nada; si no,
      -- 1 unidad de la presentación más chica. Faltante = todo lo pedido.
      -- ----------------------------------------------------------------------
      select li.id into target_item_id
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = general_list_id
        and li.checked_at is null
        and v.product_catalog_id = ingredient.product_catalog_id
      order by v.base_quantity desc
      limit 1;

      if target_item_id is null then
        -- Sin unidad en común no hay "cubre" posible: la más chica de cualquier unidad.
        select v.id into chosen_variant_id
        from public.product_catalog_variants v
        where v.product_catalog_id = ingredient.product_catalog_id
          and v.base_quantity > 0
        order by v.base_quantity
        limit 1;

        target_item_id := public.add_units_to_list_item(general_list_id, chosen_variant_id, 1);
        added_names := array_append(added_names, ingredient.product_name);
      end if;

      missing_quantity := ingredient.needed_quantity;

    elsif ingredient.needed_unit = 'unidad' then
      -- ----------------------------------------------------------------------
      -- Regla 19 (conteo, CA-03): se suma encima hasta cubrir, aunque sobre.
      -- Presentación: la de la fila si hay exactamente una; si no, pick_recipe_variant.
      -- ----------------------------------------------------------------------
      select count(*) into product_row_count
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = general_list_id
        and li.checked_at is null
        and v.product_catalog_id = ingredient.product_catalog_id
        and v.base_unit = ingredient.needed_unit
        and v.base_quantity > 0;

      if product_row_count = 1 then
        select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.list_items li
        join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
        where li.list_id = general_list_id
          and li.checked_at is null
          and v.product_catalog_id = ingredient.product_catalog_id
          and v.base_unit = ingredient.needed_unit
          and v.base_quantity > 0;
      else
        select picked.variant_id, picked.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.pick_recipe_variant(
          ingredient.product_catalog_id, ingredient.needed_unit, ingredient.needed_quantity
        ) as picked;
      end if;

      perform public.add_units_to_list_item(
        general_list_id,
        chosen_variant_id,
        ceil(ingredient.needed_quantity / chosen_base_quantity)::integer
      );

      added_names := array_append(added_names, ingredient.product_name);
      -- Los conteos nunca dejan registro: siempre alcanzan (HU-76 CA-03).
      continue;

    else
      -- ----------------------------------------------------------------------
      -- Volumen o peso con la misma unidad.
      -- ----------------------------------------------------------------------
      select
        coalesce(sum(li.quantity_requested * v.base_quantity), 0),
        (array_agg(li.id order by v.base_quantity desc))[1]
      into listed_quantity, target_item_id
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = general_list_id
        and li.checked_at is null
        and v.product_catalog_id = ingredient.product_catalog_id
        and v.base_unit = ingredient.needed_unit
        and v.base_quantity > 0;

      if target_item_id is not null then
        -- Regla 20: lo que hay cuenta, menos lo que ya pidieron otras recetas
        -- (y la misma receta, si se agrega otra vez) sobre este producto.
        select coalesce(sum(req.quantity_needed), 0) into claimed_quantity
        from public.list_item_recipe_requirements req
        join public.list_items li on li.id = req.list_item_id
        join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
        where li.list_id = general_list_id
          and li.checked_at is null
          and v.product_catalog_id = ingredient.product_catalog_id
          and req.quantity_unit = ingredient.needed_unit;

        available_quantity := greatest(listed_quantity - claimed_quantity, 0);
        missing_quantity := greatest(ingredient.needed_quantity - available_quantity, 0);
      else
        -- Regla 21: el producto no está. 1 unidad de pick_recipe_variant, y lo
        -- que esa unidad no cubre queda como faltante.
        select picked.variant_id, picked.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.pick_recipe_variant(
          ingredient.product_catalog_id, ingredient.needed_unit, ingredient.needed_quantity
        ) as picked;

        target_item_id := public.add_units_to_list_item(general_list_id, chosen_variant_id, 1);
        added_names := array_append(added_names, ingredient.product_name);
        missing_quantity := greatest(ingredient.needed_quantity - chosen_base_quantity, 0);
      end if;
    end if;

    -- Reglas 20 a 24: se registra lo pedido aunque alcance (faltante 0), para
    -- que la próxima receta descuente lo que esta ya usó.
    insert into public.list_item_recipe_requirements
      (list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit)
    values
      (target_item_id, found_recipe_id, ingredient.needed_quantity, missing_quantity, ingredient.needed_unit)
    on conflict (list_item_id, recipe_id, quantity_unit)
    do update set
      quantity_needed = public.list_item_recipe_requirements.quantity_needed + excluded.quantity_needed,
      quantity_missing = public.list_item_recipe_requirements.quantity_missing + excluded.quantity_missing;

    if missing_quantity > 0 then
      missing_items := missing_items || jsonb_build_array(jsonb_build_object(
        'product_name', ingredient.product_name,
        'quantity', missing_quantity,
        'unit', ingredient.needed_unit
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'added', to_jsonb(added_names),
    'missing', missing_items,
    'skipped', to_jsonb(skipped_names)
  );
end;
$$;

revoke execute on function public.add_recipe_to_general_list(uuid) from public, anon;
grant execute on function public.add_recipe_to_general_list(uuid) to authenticated;
