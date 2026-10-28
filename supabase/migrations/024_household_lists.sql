-- ============================================================================
-- SCRUM-59 (HU-34b): lista general de la familia y decidir qué hacer con la
-- lista personal al unirse o crear una familia.
--
-- Hasta acá toda lista era solo de su dueña. Esta migración:
--   1. Une lists.household_id a households (FK, on delete cascade): la lista de
--      una familia se va con la familia. Antes de crear la FK se comprueba que
--      no haya household_id huérfanos; si los hay, la migración se detiene sin
--      tocar nada.
--   2. Al borrar una familia, las recetas y los planes que la nombraban quedan
--      personales (household_id en null) por un trigger; un plan de la familia
--      que choca con un espacio personal se borra (gana el personal). No llevan
--      FK porque la prueba de la 019 inserta planes con un household_id
--      inventado para probar las políticas; la app nunca escribe ese campo
--      (permisos de columna).
--   3. Una sola lista general por familia (índice único parcial) y ninguna
--      lista privada asociada a una familia (check).
--   4. Acceso por membresía: si la lista tiene household_id, la ven y editan
--      los miembros de esa familia, y solo ellos (la dueña original deja de
--      tener acceso al salir). Si no tiene, sigue siendo solo de su dueña.
--   5. ensure_general_list_id / find_general_list_id: la lista general de quien
--      llama (la de su familia si es miembro, si no la personal). Las cuatro
--      funciones que agregan o miran la lista general pasan a usarlas; su
--      cuerpo es el de su última versión (015, 017 y 022) con solo ese cambio.
--   6. household_members.personal_lists_decision y dos RPC para la pregunta
--      de HU-34b: get_personal_lists_decision_state y decide_personal_lists.
--
-- Contrato y reglas: features/household/specs/SPEC.md (SCRUM-59) y plan.md.
-- Las listas privadas, las recetas y los planes siguen siendo personales.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Guarda: sin household_id huérfanos en lists (la FK fallaría igual, pero
--    con este mensaje queda claro qué revisar). No se borra ni corrige nada.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.lists l
    where l.household_id is not null
      and not exists (select 1 from public.households h where h.id = l.household_id)
  ) then
    raise exception 'Hay listas con household_id de una familia que no existe: revisarlas antes de aplicar la 024';
  end if;
end $$;

alter table public.lists
  add constraint lists_household_id_fkey
  foreign key (household_id) references public.households (id) on delete cascade;

-- D3: una lista privada nunca es de una familia.
alter table public.lists
  add constraint lists_private_not_in_household
  check (type <> 'private' or household_id is null);

-- D2: una sola lista general por familia. También es el destino del
-- "on conflict" de ensure_general_list_id, así dos miembros que agregan a la
-- vez no crean dos listas.
create unique index lists_one_general_per_household
  on public.lists (household_id)
  where type = 'general' and household_id is not null;

-- Para la cascada al borrar una familia y la política de lectura, también
-- cuando existan listas de otros tipos con household_id (sublistas).
create index lists_household_id_idx on public.lists (household_id);

-- ----------------------------------------------------------------------------
-- 2. Recetas y planes de una familia que se borra: quedan personales, y
-- ninguno queda con el household_id de la familia borrada.
-- meal_plans tiene un índice único (owner_id, date, meal_type) para las filas
-- personales, así que antes de pasarlas a personales se quitan las que
-- chocarían (decisión de la dueña de la historia, 2026-10-11):
--   a) si el dueño ya tiene ese espacio personal, gana el personal y se borra
--      el de la familia;
--   b) si el dueño tiene más de un plan de la familia en el mismo espacio,
--      queda el más antiguo.
-- Hoy ninguna fila tiene household_id (permisos de columna de 008 y 019), así
-- que en la práctica no se borra nada.
-- ----------------------------------------------------------------------------
create or replace function public.release_household_personal_data()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.recipes r
  set household_id = null
  where r.household_id = old.id;

  -- a) El espacio personal gana.
  delete from public.meal_plans p
  where p.household_id = old.id
    and exists (
      select 1 from public.meal_plans personal
      where personal.owner_id = p.owner_id
        and personal.date = p.date
        and personal.meal_type = p.meal_type
        and personal.household_id is null
    );

  -- b) Entre planes de la familia del mismo dueño y espacio, queda el más antiguo.
  delete from public.meal_plans p
  where p.household_id = old.id
    and exists (
      select 1 from public.meal_plans older
      where older.household_id = old.id
        and older.owner_id = p.owner_id
        and older.date = p.date
        and older.meal_type = p.meal_type
        and (older.created_at, older.id) < (p.created_at, p.id)
    );

  update public.meal_plans p
  set household_id = null
  where p.household_id = old.id;

  return old;
end;
$$;

revoke execute on function public.release_household_personal_data() from public, anon, authenticated;

create trigger households_release_personal_data
  after delete on public.households
  for each row execute function public.release_household_personal_data();

-- ----------------------------------------------------------------------------
-- 3. Acceso por membresía. La subconsulta lee household_members con los
-- permisos de quien llama: la política "user reads own membership" (011) le
-- deja ver solo su fila, que es justo la que hace falta.
-- ----------------------------------------------------------------------------
drop policy "owner reads own lists" on public.lists;

create policy "owner or household member reads lists"
  on public.lists for select
  to authenticated
  using (
    (household_id is null and owner_id = (select auth.uid()))
    or household_id in (
      select m.household_id from public.household_members m
      where m.user_id = (select auth.uid())
    )
  );

-- "owner creates own lists" (004) no cambia: desde el cliente solo se crea la
-- lista general personal. La de la familia la crea ensure_general_list_id.

-- Un ítem se ve y se edita si su lista se ve: la política de lists de arriba
-- es la única regla de acceso.
drop policy "owner reads items of own lists" on public.list_items;
drop policy "owner adds items to own lists" on public.list_items;
drop policy "owner updates items of own lists" on public.list_items;
drop policy "owner deletes items of own lists" on public.list_items;

create policy "reads items of visible lists"
  on public.list_items for select
  to authenticated
  using (exists (select 1 from public.lists l where l.id = list_items.list_id));

create policy "adds items to visible lists"
  on public.list_items for insert
  to authenticated
  with check (exists (select 1 from public.lists l where l.id = list_items.list_id));

create policy "updates items of visible lists"
  on public.list_items for update
  to authenticated
  using (exists (select 1 from public.lists l where l.id = list_items.list_id))
  with check (exists (select 1 from public.lists l where l.id = list_items.list_id));

create policy "deletes items of visible lists"
  on public.list_items for delete
  to authenticated
  using (exists (select 1 from public.lists l where l.id = list_items.list_id));

-- Requisitos de recetas: se leen si el ítem se ve (en la lista de la familia
-- cada miembro ve lo que pidieron las recetas de los demás, y add_recipe ya
-- descuenta esos pedidos, regla 20 de 013). El nombre de una receta ajena no
-- se filtra: recipes sigue siendo solo de su dueña. Escribir sigue exigiendo
-- que la receta sea propia (013).
drop policy "owner reads requirements of own lists and recipes" on public.list_item_recipe_requirements;
drop policy "owner adds requirements to own lists and recipes" on public.list_item_recipe_requirements;
drop policy "owner updates requirements of own lists and recipes" on public.list_item_recipe_requirements;

create policy "reads requirements of visible items"
  on public.list_item_recipe_requirements for select
  to authenticated
  using (
    exists (
      select 1 from public.list_items li
      where li.id = list_item_recipe_requirements.list_item_id
    )
  );

create policy "adds requirements of own recipes to visible items"
  on public.list_item_recipe_requirements for insert
  to authenticated
  with check (
    exists (
      select 1 from public.list_items li
      where li.id = list_item_recipe_requirements.list_item_id
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "updates requirements of own recipes on visible items"
  on public.list_item_recipe_requirements for update
  to authenticated
  using (
    exists (
      select 1 from public.list_items li
      where li.id = list_item_recipe_requirements.list_item_id
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.list_items li
      where li.id = list_item_recipe_requirements.list_item_id
    )
    and exists (
      select 1 from public.recipes r
      where r.id = list_item_recipe_requirements.recipe_id
        and r.owner_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. La lista general de quien llama: la de su familia si es miembro (CA-05,
-- D3), si no la personal. find solo busca (security invoker: las políticas de
-- arriba ya muestran la correcta). ensure además la crea si no existe; es
-- security definer porque la lista de la familia no se puede insertar desde
-- el cliente ("owner creates own lists" exige household_id nulo).
-- ----------------------------------------------------------------------------
create or replace function public.find_general_list_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  general_list_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para usar la lista'
      using errcode = '42501';
  end if;

  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  if member_household_id is not null then
    select l.id into general_list_id
    from public.lists l
    where l.household_id = member_household_id
      and l.type = 'general';
  else
    select l.id into general_list_id
    from public.lists l
    where l.owner_id = current_user_id
      and l.type = 'general'
      and l.household_id is null;
  end if;

  return general_list_id;
end;
$$;

create or replace function public.ensure_general_list_id()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  general_list_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para usar la lista'
      using errcode = '42501';
  end if;

  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  if member_household_id is not null then
    insert into public.lists (owner_id, household_id, type)
    values (current_user_id, member_household_id, 'general')
    on conflict (household_id) where type = 'general' and household_id is not null
    do nothing;

    select l.id into general_list_id
    from public.lists l
    where l.household_id = member_household_id
      and l.type = 'general';
  else
    insert into public.lists (owner_id, type)
    values (current_user_id, 'general')
    on conflict (owner_id) where type = 'general' and household_id is null
    do nothing;

    select l.id into general_list_id
    from public.lists l
    where l.owner_id = current_user_id
      and l.type = 'general'
      and l.household_id is null;
  end if;

  return general_list_id;
end;
$$;

-- Las usan add_item, add_recipe y add_week (anónimos incluidos: también tienen
-- el rol authenticated y su lista personal, como hasta ahora).
revoke execute on function public.find_general_list_id() from public, anon;
grant execute on function public.find_general_list_id() to authenticated;
revoke execute on function public.ensure_general_list_id() from public, anon;
grant execute on function public.ensure_general_list_id() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Funciones de la lista general: su última versión, con la búsqueda de la
-- lista reemplazada por ensure/find. "create or replace" conserva sus permisos.
-- ----------------------------------------------------------------------------

-- add_item_to_general_list (última versión: 015).
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

  general_list_id := public.ensure_general_list_id();

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

-- add_recipe_to_general_list (última versión: 015).
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
  general_list_id := public.ensure_general_list_id();

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

-- add_week_to_general_list (última versión: 022). add_week_ingredients_to_list
-- recibe la lista por parámetro y no cambia.
create or replace function public.add_week_to_general_list(week_from date, week_to date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_range_days constant integer := 6;
  general_list_id uuid;
  slot record;
  slot_result jsonb;
  meal_count integer := 0;
  added_names text[] := '{}';
  skipped_names text[] := '{}';
  processed_names text[] := '{}';
  missing_items jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para agregar la semana a la lista'
      using errcode = '42501';
  end if;

  if week_from is null
    or week_to is null
    or week_to < week_from
    or week_to - week_from > max_range_days then
    raise exception 'El rango debe ser de 1 a 7 días'
      using errcode = '22023';
  end if;

  -- Sin comidas no hay nada que escribir: ni siquiera se crea la lista.
  if not exists (
    select 1 from public.meal_plans mp
    where mp.date between week_from and week_to
  ) then
    return jsonb_build_object(
      'meals', 0,
      'ingredients', 0,
      'added', '[]'::jsonb,
      'missing', '[]'::jsonb,
      'skipped', '[]'::jsonb
    );
  end if;

  -- Misma lista general que add_recipe_to_general_list (013): se crea si no existe.
  general_list_id := public.ensure_general_list_id();

  -- La misma clave que add_recipe_to_general_list: una receta suelta y una
  -- semana agregadas a la vez se hacen una detrás de otra, y las dos ven el
  -- mismo "disponible" (regla 20). Se toma ya acá para que toda la semana quede
  -- serializada (la interna lo vuelve a tomar sin costo). Se suelta sola al
  -- terminar la transacción.
  perform pg_advisory_xact_lock(hashtextextended(general_list_id::text, 0));

  for slot in
    select mp.recipe_id, mp.servings_multiplier
    from public.meal_plans mp
    where mp.date between week_from and week_to
    order by
      mp.date,
      case mp.meal_type when 'breakfast' then 1 when 'lunch' then 2 else 3 end
  loop
    -- El tope de 50 ingredientes y el resto de las validaciones los hace la
    -- función interna, por espacio: un 22023 aborta toda la semana.
    slot_result := public.add_week_ingredients_to_list(
      general_list_id, slot.recipe_id, slot.servings_multiplier
    );

    meal_count := meal_count + 1;
    added_names := added_names || array(select jsonb_array_elements_text(slot_result -> 'added'));
    skipped_names := skipped_names || array(select jsonb_array_elements_text(slot_result -> 'skipped'));
    processed_names := processed_names || array(select jsonb_array_elements_text(slot_result -> 'processed'));
    missing_items := missing_items || (slot_result -> 'missing');
  end loop;

  return jsonb_build_object(
    'meals', meal_count,
    -- Un producto que pide más de una comida cuenta una sola vez.
    'ingredients', (select count(distinct item_name) from unnest(processed_names) as t(item_name)),
    'added', (
      select coalesce(jsonb_agg(distinct item_name), '[]'::jsonb) from unnest(added_names) as t(item_name)
    ),
    -- Lo que falta de un mismo producto en varias comidas se suma.
    'missing', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('product_name', grouped.product_name, 'quantity', grouped.total, 'unit', grouped.unit)
          order by grouped.product_name, grouped.unit
        ),
        '[]'::jsonb
      )
      from (
        select
          item ->> 'product_name' as product_name,
          item ->> 'unit' as unit,
          sum((item ->> 'quantity')::numeric) as total
        from jsonb_array_elements(missing_items) as item
        group by item ->> 'product_name', item ->> 'unit'
      ) as grouped
    ),
    'skipped', (
      select coalesce(jsonb_agg(distinct item_name), '[]'::jsonb) from unnest(skipped_names) as t(item_name)
    )
  );
end;
$$;

-- get_recipe_coverage (última versión: 017): mira la lista de la familia si
-- quien llama es miembro.
create or replace function public.get_recipe_coverage(target_recipe_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  found_recipe_id uuid;
  general_list_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para revisar una receta'
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

  -- Si todavía no tiene lista general queda en null: ninguna fila coincide
  -- con "list_id = null" y todos los ingredientes salen notInList. No se crea
  -- una lista desde una consulta de solo lectura.
  general_list_id := public.find_general_list_id();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'ingredient_id', summary.ingredient_id,
          'product_name', summary.product_name,
          'quantity_value', summary.quantity_value,
          'quantity_unit', summary.quantity_unit,
          'status', case when summary.reason is null then 'covered' else 'missing' end,
          'reason', summary.reason,
          'missing_quantity', case when summary.reason = 'short' then summary.missing_total end
        )
        order by summary.position
      )
      from (
        select
          ri.id as ingredient_id,
          ri.position,
          pc.name as product_name,
          ri.quantity_value,
          ri.quantity_unit,
          counts.missing_total,
          case
            when counts.row_count = 0 then 'notInList'
            when counts.unchecked_count > 0 then 'notChecked'
            when counts.missing_total > 0 then 'short'
          end as reason
        from public.recipe_ingredients ri
        join public.product_catalog pc on pc.id = ri.product_catalog_id
        cross join lateral (
          select
            count(li.id) as row_count,
            count(li.id) filter (where li.checked_at is null) as unchecked_count,
            coalesce(sum(req.missing), 0) as missing_total
          from public.list_items li
          join public.product_catalog_variants v on v.id = li.product_catalog_variant_id
          left join lateral (
            select sum(r.quantity_missing) as missing
            from public.list_item_recipe_requirements r
            where r.list_item_id = li.id
              and r.recipe_id = found_recipe_id
              and r.quantity_unit = ri.quantity_unit
          ) req on true
          where li.list_id = general_list_id
            and v.product_catalog_id = ri.product_catalog_id
        ) counts
        where ri.recipe_id = found_recipe_id
      ) summary
    ),
    '[]'::jsonb
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. La decisión de HU-34b, guardada en la membresía (D5). Al salir se borra
-- con la fila (leave_household, 023): unirse a otra familia vuelve a preguntar.
-- ----------------------------------------------------------------------------
alter table public.household_members
  add column personal_lists_decision text
  check (personal_lists_decision in ('keep', 'share'));

-- El cliente ya lee su propia fila (011, select de toda la tabla); escribir la
-- decisión solo se puede con decide_personal_lists.

-- get_personal_lists_decision_state: qué mostrar después de crear o unirse.
--   'pending'            es miembro, no decidió y su lista personal tiene
--                        pendientes (D1);
--   'nothing_to_decide'  es miembro, no decidió y no hay pendientes;
--   'decided'            ya decidió en esta membresía (CA-02);
--   'not_member'         no pertenece a ninguna familia.
create or replace function public.get_personal_lists_decision_state()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member_household_id uuid;
  current_decision text;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para decidir sobre tus listas'
      using errcode = '42501';
  end if;

  select m.household_id, m.personal_lists_decision
  into member_household_id, current_decision
  from public.household_members m
  where m.user_id = current_user_id;

  if member_household_id is null then
    return 'not_member';
  end if;

  if current_decision is not null then
    return 'decided';
  end if;

  if exists (
    select 1
    from public.lists l
    join public.list_items li on li.list_id = l.id
    where l.owner_id = current_user_id
      and l.type = 'general'
      and l.household_id is null
      and li.checked_at is null
  ) then
    return 'pending';
  end if;

  return 'nothing_to_decide';
end;
$$;

-- decide_personal_lists('keep' | 'share'):
--   'kept'              guardó "mantener": ninguna lista cambia (CA-03);
--   'shared'            guardó "compartir" y pasaron todos los pendientes (CA-04);
--   'shared_partially'  guardó "compartir": pasó al menos un pendiente y alguno
--                       se quedó en la lista personal porque la familia ya lo
--                       compró (abajo);
--   'nothing_shared'    guardó "compartir", pero no pasó ningún pendiente: la
--                       familia ya había comprado todos;
--   'already_decided'   ya había decidido en esta membresía: no cambia nada
--                       (doble clic, otra pestaña: CA-02);
--   'not_member'        no pertenece a ninguna familia.
--
-- Compartir (reglas T1, SPEC SCRUM-59), en una sola transacción:
--   - pasan solo los pendientes de su lista general personal;
--   - si la lista de la familia ya tiene esa variante, se suma en esa fila con
--     la misma regla que agregar (add_units_to_list_item, 015): una fila
--     tachada se reabre con la cantidad nueva;
--   - salvo que esa fila esté tachada dentro de una compra (purchase_session_id):
--     reabrirla borraría lo que compró otra persona. No se toca y el pendiente
--     se queda en la lista personal ('shared_partially' o 'nothing_shared');
--   - la suma se hace en bigint y se limita al máximo de integer: compartir
--     nunca falla por desborde (no hay un tope de producto acordado);
--   - los requisitos de receta de cada pendiente pasan a la fila de destino;
--     si ya había uno de la misma receta y unidad, se suman (con el tope de
--     la tabla, 013);
--   - lo tachado se queda en la lista personal (es de compras personales).
--
-- Bloqueos, en este orden:
--   1) households for share: leave_household (023) toma la misma fila
--      for update antes de borrar membresías, así que una salida y una
--      decisión de la misma familia van una detrás de otra;
--   2) la fila propia de household_members for update (doble clic);
--   3) el candado de transacción de la lista de la familia, el mismo que usan
--      add_recipe_to_general_list y add_week_to_general_list.
create or replace function public.decide_personal_lists(lists_choice text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_item_quantity constant bigint := 2147483647;
  member_household_id uuid;
  current_decision text;
  household_list_id uuid;
  personal_list_id uuid;
  pending_item record;
  target_item_id uuid;
  kept_item_count integer := 0;
  shared_item_count integer := 0;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para decidir sobre tus listas'
      using errcode = '42501';
  end if;

  if lists_choice is null or lists_choice not in ('keep', 'share') then
    raise exception 'La opción tiene que ser keep o share'
      using errcode = '22023';
  end if;

  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  if member_household_id is null then
    return 'not_member';
  end if;

  perform 1
  from public.households h
  where h.id = member_household_id
  for share;

  -- Con el bloqueo tomado se vuelve a leer: pudo salir mientras esperaba.
  select m.personal_lists_decision into current_decision
  from public.household_members m
  where m.user_id = current_user_id
    and m.household_id = member_household_id
  for update;

  if not found then
    return 'not_member';
  end if;

  if current_decision is not null then
    return 'already_decided';
  end if;

  if lists_choice = 'keep' then
    update public.household_members m
    set personal_lists_decision = 'keep'
    where m.user_id = current_user_id
      and m.household_id = member_household_id;

    return 'kept';
  end if;

  insert into public.lists (owner_id, household_id, type)
  values (current_user_id, member_household_id, 'general')
  on conflict (household_id) where type = 'general' and household_id is not null
  do nothing;

  select l.id into household_list_id
  from public.lists l
  where l.household_id = member_household_id
    and l.type = 'general';

  perform pg_advisory_xact_lock(hashtextextended(household_list_id::text, 0));

  select l.id into personal_list_id
  from public.lists l
  where l.owner_id = current_user_id
    and l.type = 'general'
    and l.household_id is null;

  if personal_list_id is not null then
    for pending_item in
      select li.id, li.product_catalog_variant_id, li.quantity_requested
      from public.list_items li
      where li.list_id = personal_list_id
        and li.checked_at is null
      order by li.created_at, li.id
    loop
      -- El where del do update se evalúa con la fila de destino bloqueada: si
      -- está tachada en una compra no se actualiza, no devuelve fila y el
      -- pendiente se queda en la lista personal.
      insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
      values (household_list_id, pending_item.product_catalog_variant_id, pending_item.quantity_requested)
      on conflict (list_id, product_catalog_variant_id)
      do update set
        quantity_requested = case
          when public.list_items.checked_at is null
            then least(
              public.list_items.quantity_requested::bigint + excluded.quantity_requested,
              max_item_quantity
            )::integer
          else excluded.quantity_requested
        end,
        checked_at = null
      where public.list_items.checked_at is null
        or public.list_items.purchase_session_id is null
      returning id into target_item_id;

      if not found then
        kept_item_count := kept_item_count + 1;
        continue;
      end if;

      shared_item_count := shared_item_count + 1;

      insert into public.list_item_recipe_requirements (
        list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit
      )
      select target_item_id, r.recipe_id, r.quantity_needed, r.quantity_missing, r.quantity_unit
      from public.list_item_recipe_requirements r
      where r.list_item_id = pending_item.id
      on conflict (list_item_id, recipe_id, quantity_unit)
      do update set
        quantity_needed = least(
          public.list_item_recipe_requirements.quantity_needed + excluded.quantity_needed,
          10000000
        ),
        quantity_missing = least(
          public.list_item_recipe_requirements.quantity_missing + excluded.quantity_missing,
          public.list_item_recipe_requirements.quantity_needed + excluded.quantity_needed,
          10000000
        );

      -- Sus requisitos ya están en la fila de destino; la cascada borra los viejos.
      delete from public.list_items li
      where li.id = pending_item.id;
    end loop;
  end if;

  update public.household_members m
  set personal_lists_decision = 'share'
  where m.user_id = current_user_id
    and m.household_id = member_household_id;

  -- Sin pendientes que pasar (kept 0 y shared 0) también es 'shared': no se
  -- quedó nada por una compra.
  if kept_item_count > 0 and shared_item_count = 0 then
    return 'nothing_shared';
  end if;

  if kept_item_count > 0 then
    return 'shared_partially';
  end if;

  return 'shared';
end;
$$;

revoke execute on function public.get_personal_lists_decision_state() from public, anon;
grant execute on function public.get_personal_lists_decision_state() to authenticated;
revoke execute on function public.decide_personal_lists(text) from public, anon;
grant execute on function public.decide_personal_lists(text) to authenticated;
