-- ============================================================================
-- SCRUM-97 (HU-65): agregar una receta a la lista general
--
-- 1. Tabla list_item_recipe_requirements: por fila de la lista y por receta,
--    cuánto pidió la receta y cuánto falta. Un registro con faltante mayor que
--    0 es el aviso pasivo del CA-04; mostrarlo en /lista es de SCRUM-114.
-- 2. RPC add_recipe_to_general_list: agrega los ingredientes de una receta a la
--    lista general con las reglas 17 a 26 de features/recipes/specs/SPEC.md,
--    todo o nada.
--
-- list_items no cambia (feature de la lista, acordado con su responsable).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- list_item_recipe_requirements
-- ----------------------------------------------------------------------------

create table public.list_item_recipe_requirements (
  id uuid primary key default gen_random_uuid(),
  -- Cascadas: borrar la fila de la lista (012) o la receta (010) borra sus
  -- registros. Las cascadas no pasan por RLS, así que no hace falta abrir delete.
  list_item_id uuid not null references public.list_items (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  -- Tope alto pero finito, como la cantidad de 008: rechaza NaN e Infinity.
  -- Es más alto que el de un ingrediente porque se acumula si la misma receta
  -- se agrega varias veces (regla 24).
  quantity_needed numeric not null check (quantity_needed > 0 and quantity_needed <= 10000000),
  quantity_missing numeric not null check (quantity_missing >= 0 and quantity_missing <= quantity_needed),
  quantity_unit text not null check (quantity_unit in ('ml', 'g', 'unidad')),
  created_at timestamptz not null default now(),
  -- La misma receta sobre la misma fila acumula en un solo registro. La unidad
  -- entra en la clave para no sumar ml con g si la receta se editó entre un
  -- agregado y otro.
  unique (list_item_id, recipe_id, quantity_unit)
);

-- Lo usa la cascada al borrar una receta (list_item_id ya tiene índice por el unique).
create index list_item_recipe_requirements_recipe_id_idx
  on public.list_item_recipe_requirements (recipe_id);

alter table public.list_item_recipe_requirements enable row level security;

-- RLS decide qué filas; los permisos, qué columnas. id y created_at salen de
-- sus defaults, y una vez creado un registro solo cambian las cantidades.
revoke all on public.list_item_recipe_requirements from anon, authenticated;
grant select on public.list_item_recipe_requirements to authenticated;
grant insert (list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit)
  on public.list_item_recipe_requirements to authenticated;
grant update (quantity_needed, quantity_missing)
  on public.list_item_recipe_requirements to authenticated;

-- Las dos condiciones van siempre juntas: la fila es de una lista propia y la
-- receta es propia. Sin la segunda, alguien podría colgar el id de una receta
-- ajena en su lista y leer su nombre embebiendo recipes desde acá.
create policy "owner reads requirements of own lists and recipes"
  on public.list_item_recipe_requirements for select
  to authenticated
  using (
    exists (
      select 1
      from public.list_items li
      join public.lists l on l.id = li.list_id
      where li.id = list_item_recipe_requirements.list_item_id
        and l.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "owner adds requirements to own lists and recipes"
  on public.list_item_recipe_requirements for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.list_items li
      join public.lists l on l.id = li.list_id
      where li.id = list_item_recipe_requirements.list_item_id
        and l.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  );

-- using y with check: el update solo toca cantidades (permisos por columna),
-- pero igual se exige que la fila siga siendo propia.
create policy "owner updates requirements of own lists and recipes"
  on public.list_item_recipe_requirements for update
  to authenticated
  using (
    exists (
      select 1
      from public.list_items li
      join public.lists l on l.id = li.list_id
      where li.id = list_item_recipe_requirements.list_item_id
        and l.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.list_items li
      join public.lists l on l.id = li.list_id
      where li.id = list_item_recipe_requirements.list_item_id
        and l.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  );

-- Delete queda cerrado: lo abre SCRUM-115 (resolver el faltante al tachar).

-- ----------------------------------------------------------------------------
-- add_recipe_to_general_list
--
-- security invoker: corre con los permisos de quien llama, así que RLS sigue
-- siendo el control (una receta ajena no se ve, una lista ajena no se toca).
-- Una "presentación" es una variante del producto madre del ingrediente; solo
-- cuentan las que tienen cantidad base mayor que 0 (si no, no hay cuenta posible).
--
-- Devuelve: { "added": [nombre], "missing": [{ product_name, quantity, unit }],
--             "skipped": [nombre] }
-- ----------------------------------------------------------------------------

create or replace function public.add_recipe_to_general_list(target_recipe_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  general_list_id uuid;
  found_recipe_id uuid;
  ingredient record;
  chosen_variant_id uuid;
  chosen_base_quantity numeric;
  target_item_id uuid;
  product_row_count integer;
  units_to_add integer;
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
        and v.product_catalog_id = ingredient.product_catalog_id
      order by v.base_quantity desc
      limit 1;

      if target_item_id is null then
        select v.id into chosen_variant_id
        from public.product_catalog_variants v
        where v.product_catalog_id = ingredient.product_catalog_id
          and v.base_quantity > 0
        order by v.base_quantity
        limit 1;

        insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
        values (general_list_id, chosen_variant_id, 1)
        on conflict (list_id, product_catalog_variant_id)
        do update set quantity_requested = public.list_items.quantity_requested + 1
        returning id into target_item_id;

        added_names := array_append(added_names, ingredient.product_name);
      end if;

      missing_quantity := ingredient.needed_quantity;

    elsif ingredient.needed_unit = 'unidad' then
      -- ----------------------------------------------------------------------
      -- Regla 19 (conteo, CA-03): se suma encima hasta cubrir, aunque sobre.
      -- Presentación: la de la fila si hay exactamente una; si no, la más
      -- chica que cubre con una unidad; si ninguna cubre, la más grande.
      -- ----------------------------------------------------------------------
      select count(*) into product_row_count
      from public.list_items li
      join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
      where li.list_id = general_list_id
        and v.product_catalog_id = ingredient.product_catalog_id
        and v.base_unit = ingredient.needed_unit
        and v.base_quantity > 0;

      if product_row_count = 1 then
        select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.list_items li
        join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
        where li.list_id = general_list_id
          and v.product_catalog_id = ingredient.product_catalog_id
          and v.base_unit = ingredient.needed_unit
          and v.base_quantity > 0;
      else
        select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.product_catalog_variants v
        where v.product_catalog_id = ingredient.product_catalog_id
          and v.base_unit = ingredient.needed_unit
          and v.base_quantity >= ingredient.needed_quantity
        order by v.base_quantity
        limit 1;

        if chosen_variant_id is null then
          select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
          from public.product_catalog_variants v
          where v.product_catalog_id = ingredient.product_catalog_id
            and v.base_unit = ingredient.needed_unit
            and v.base_quantity > 0
          order by v.base_quantity desc
          limit 1;
        end if;
      end if;

      units_to_add := ceil(ingredient.needed_quantity / chosen_base_quantity)::integer;

      insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
      values (general_list_id, chosen_variant_id, units_to_add)
      on conflict (list_id, product_catalog_variant_id)
      do update set quantity_requested = public.list_items.quantity_requested + units_to_add;

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
          and v.product_catalog_id = ingredient.product_catalog_id
          and req.quantity_unit = ingredient.needed_unit;

        available_quantity := greatest(listed_quantity - claimed_quantity, 0);
        missing_quantity := greatest(ingredient.needed_quantity - available_quantity, 0);
      else
        -- Regla 21: el producto no está. 1 unidad de la más chica que cubre;
        -- si ninguna cubre, de la más grande, y el resto queda como faltante.
        select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
        from public.product_catalog_variants v
        where v.product_catalog_id = ingredient.product_catalog_id
          and v.base_unit = ingredient.needed_unit
          and v.base_quantity >= ingredient.needed_quantity
        order by v.base_quantity
        limit 1;

        if chosen_variant_id is null then
          select v.id, v.base_quantity into chosen_variant_id, chosen_base_quantity
          from public.product_catalog_variants v
          where v.product_catalog_id = ingredient.product_catalog_id
            and v.base_unit = ingredient.needed_unit
            and v.base_quantity > 0
          order by v.base_quantity desc
          limit 1;
        end if;

        insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
        values (general_list_id, chosen_variant_id, 1)
        on conflict (list_id, product_catalog_variant_id)
        do update set quantity_requested = public.list_items.quantity_requested + 1
        returning id into target_item_id;

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
