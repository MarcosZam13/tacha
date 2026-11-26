-- ============================================================================
-- SCRUM-162 (HU-63, HU-64 CA-04): compartir recetas con la familia.
--
-- Una receta es personal (household_id nulo, la ve su dueño) o de la familia (la
-- ven, editan y eliminan sus miembros). owner_id siempre está.
--
--  1. current_household_id: la familia de quien llama. Una sola fuente.
--  2. recipes.household_id pasa a tener FK.
--  3. Políticas: de "soy el dueño" a "puedo ver la receta".
--  4. Fotos: una copia apunta al mismo archivo que el original.
--  5. save_recipe: una receta de la familia no lleva productos personales.
--  6. share_recipe y copy_recipe.
--  7. Trigger: quien sale de la familia conserva copia de sus recetas.
--
-- No cambia leave_household (023), remove_household_member (026) ni la
-- devolución de recetas al disolver (024): el trigger cubre toda salida.
-- Spec: features/recipes/specs/SPEC.md, sección 17.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La familia de quien llama; nulo sin sesión, sin familia o con sesión
--    anónima. security definer para que sirva igual dentro de una política y de
--    las funciones de abajo; solo responde sobre uno mismo.
-- ----------------------------------------------------------------------------
create function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.household_id
  from public.household_members m
  where m.user_id = auth.uid()
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

revoke execute on function public.current_household_id() from public, anon;
grant execute on function public.current_household_id() to authenticated;

-- ----------------------------------------------------------------------------
-- 2. FK. set null y no "no action": esa fallaría antes de que corra el trigger
--    de la 024, que hace lo mismo.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.recipes r
    where r.household_id is not null
      and not exists (select 1 from public.households h where h.id = r.household_id)
  ) then
    raise exception 'Hay recetas con household_id de una familia que no existe: revisarlas antes de aplicar la 060';
  end if;
end $$;

alter table public.recipes
  add constraint recipes_household_id_fkey
  foreign key (household_id) references public.households (id) on delete set null;

create index recipes_household_id_idx on public.recipes (household_id);

-- ----------------------------------------------------------------------------
-- 3. Políticas. El insert de recipes no cambia: toda receta nace propia y
--    personal. household_id y owner_id siguen cerrados por columna (008).
-- ----------------------------------------------------------------------------
drop policy "owner reads own recipes" on public.recipes;
drop policy "owner updates own recipes" on public.recipes;
drop policy "owner deletes own recipes" on public.recipes;

create policy "reads own personal or household recipes"
  on public.recipes for select
  to authenticated
  using (
    (household_id is null and owner_id = (select auth.uid()))
    or household_id = (select public.current_household_id())
  );

create policy "updates own personal or household recipes"
  on public.recipes for update
  to authenticated
  using (
    (household_id is null and owner_id = (select auth.uid()))
    or household_id = (select public.current_household_id())
  )
  with check (
    (household_id is null and owner_id = (select auth.uid()))
    or household_id = (select public.current_household_id())
  );

create policy "deletes own personal or household recipes"
  on public.recipes for delete
  to authenticated
  using (
    (household_id is null and owner_id = (select auth.uid()))
    or household_id = (select public.current_household_id())
  );

-- En las tablas de abajo, el exists sobre recipes ya pasa por su RLS.
drop policy "owner reads ingredients of own recipes" on public.recipe_ingredients;
drop policy "owner adds ingredients to own recipes" on public.recipe_ingredients;
drop policy "owner updates ingredients of own recipes" on public.recipe_ingredients;
drop policy "owner removes ingredients of own recipes" on public.recipe_ingredients;

create policy "reads ingredients of visible recipes"
  on public.recipe_ingredients for select
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id));

create policy "removes ingredients of visible recipes"
  on public.recipe_ingredients for delete
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id));

-- Un producto personal dejaría el ingrediente vacío para el resto de la familia.
create policy "adds ingredients to visible recipes"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (
          r.household_id is null
          or exists (
            select 1 from public.product_catalog pc
            where pc.id = recipe_ingredients.product_catalog_id
              and pc.owner_id is null
              and (pc.household_id is null or pc.household_id = r.household_id)
          )
        )
    )
  );

create policy "updates ingredients of visible recipes"
  on public.recipe_ingredients for update
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id))
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (
          r.household_id is null
          or exists (
            select 1 from public.product_catalog pc
            where pc.id = recipe_ingredients.product_catalog_id
              and pc.owner_id is null
              and (pc.household_id is null or pc.household_id = r.household_id)
          )
        )
    )
  );

drop policy "adds requirements of own recipes to visible items" on public.list_item_recipe_requirements;
drop policy "updates requirements of own recipes on visible items" on public.list_item_recipe_requirements;

create policy "adds requirements of visible recipes to visible items"
  on public.list_item_recipe_requirements for insert
  to authenticated
  with check (
    exists (select 1 from public.list_items li where li.id = list_item_recipe_requirements.list_item_id)
    and exists (select 1 from public.recipes r where r.id = list_item_recipe_requirements.recipe_id)
  );

create policy "updates requirements of visible recipes on visible items"
  on public.list_item_recipe_requirements for update
  to authenticated
  using (
    exists (select 1 from public.list_items li where li.id = list_item_recipe_requirements.list_item_id)
    and exists (select 1 from public.recipes r where r.id = list_item_recipe_requirements.recipe_id)
  )
  with check (
    exists (select 1 from public.list_items li where li.id = list_item_recipe_requirements.list_item_id)
    and exists (select 1 from public.recipes r where r.id = list_item_recipe_requirements.recipe_id)
  );

-- El plan sigue siendo personal: solo cambia qué recetas admite.
drop policy "owner adds to own meal plan" on public.meal_plans;
drop policy "owner updates own meal plan" on public.meal_plans;

create policy "owner adds to own meal plan"
  on public.meal_plans for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and household_id is null
    and (assigned_cook is null or assigned_cook = (select auth.uid()))
    and exists (select 1 from public.recipes r where r.id = meal_plans.recipe_id)
  );

create policy "owner updates own meal plan"
  on public.meal_plans for update
  to authenticated
  using (owner_id = (select auth.uid()) and household_id is null)
  with check (
    owner_id = (select auth.uid())
    and household_id is null
    and (assigned_cook is null or assigned_cook = (select auth.uid()))
    and exists (select 1 from public.recipes r where r.id = meal_plans.recipe_id)
  );

-- ----------------------------------------------------------------------------
-- 4. Fotos. La copia de una receta apunta al archivo del original, que está en
--    otra carpeta: el check solo puede exigir la forma. Por eso photo_path deja
--    de ser escribible por el cliente: si no, alguien apuntaría su receta al
--    archivo de otro para leerlo.
-- ----------------------------------------------------------------------------
revoke update (photo_path) on public.recipes from authenticated;

alter table public.recipes
  drop constraint recipes_photo_path_check,
  add constraint recipes_photo_path_check check (
    photo_path is null
    or photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

create index recipes_photo_path_idx on public.recipes (photo_path) where photo_path is not null;

-- security definer porque el cliente ya no escribe la columna: repite la regla de
-- la política de update y exige la carpeta de la receta.
create or replace function public.set_recipe_photo(target_recipe_id uuid, new_photo_path text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  previous_photo_path text;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para cambiar la foto'
      using errcode = '42501';
  end if;

  select r.photo_path into previous_photo_path
  from public.recipes r
  where r.id = target_recipe_id
    and (
      (r.household_id is null and r.owner_id = current_user_id)
      or r.household_id = public.current_household_id()
    )
  for update;

  if not found then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  if new_photo_path is not null and not starts_with(new_photo_path, target_recipe_id || '/') then
    raise exception 'La foto no es de esa receta'
      using errcode = '23514';
  end if;

  update public.recipes
  set photo_path = new_photo_path
  where id = target_recipe_id;

  return previous_photo_path;
end;
$$;

revoke execute on function public.set_recipe_photo(uuid, text) from public, anon;
grant execute on function public.set_recipe_photo(uuid, text) to authenticated;

-- Cuenta también las recetas que no ve quien borra. Solo responde sí o no sobre
-- una ruta exacta, que lleva dos uuid.
create function public.is_recipe_photo_in_use(target_photo_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.recipes r where r.photo_path = target_photo_path);
$$;

revoke execute on function public.is_recipe_photo_in_use(text) from public, anon;
grant execute on function public.is_recipe_photo_in_use(text) to authenticated;

drop policy "recipe_photos_select_visible_recipe_or_own" on storage.objects;
drop policy "recipe_photos_insert_own_recipe" on storage.objects;
drop policy "recipe_photos_delete_own" on storage.objects;

-- Siempre storage.objects.name: dentro del exists, name sería el de la receta.
create policy "recipe_photos_select_visible_recipe_or_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (
      owner_id = (select auth.uid())::text
      or exists (select 1 from public.recipes r where r.photo_path = storage.objects.name)
    )
  );

create policy "recipe_photos_insert_visible_recipe"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and exists (
      select 1 from public.recipes r
      where r.id = case
        when storage.objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
          then split_part(storage.objects.name, '/', 1)::uuid
      end
    )
  );

create policy "recipe_photos_delete_own_unused"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'recipe-photos'
    and owner_id = (select auth.uid())::text
    and not public.is_recipe_photo_in_use(storage.objects.name)
  );

-- ----------------------------------------------------------------------------
-- 5. save_recipe: igual que en 007, más el aviso con los nombres de los productos
--    personales. Solo da un mensaje útil: la regla la pone la política de arriba.
-- ----------------------------------------------------------------------------
create or replace function public.save_recipe(
  recipe_name text,
  recipe_base_servings integer,
  ingredient_list jsonb,
  target_recipe_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_recipe_id uuid;
  saved_household_id uuid;
  personal_names text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión para guardar recetas'
      using errcode = '42501';
  end if;

  if ingredient_list is null
    or jsonb_typeof(ingredient_list) <> 'array'
    or jsonb_array_length(ingredient_list) = 0 then
    raise exception 'La receta necesita al menos un ingrediente'
      using errcode = '22023';
  end if;

  if target_recipe_id is null then
    -- owner_id sale del default auth.uid(); household_id queda nulo.
    insert into public.recipes (name, base_servings)
    values (btrim(recipe_name), recipe_base_servings)
    returning id into saved_recipe_id;
  else
    update public.recipes
    set name = btrim(recipe_name), base_servings = recipe_base_servings
    where id = target_recipe_id
    returning id, household_id into saved_recipe_id, saved_household_id;

    -- RLS oculta las recetas ajenas: no existe y no es tuya dan el mismo
    -- error, así no se revela cuál de las dos es.
    if saved_recipe_id is null then
      raise exception 'Receta no encontrada'
        using errcode = 'P0002';
    end if;
  end if;

  if saved_household_id is not null then
    select array_agg(pc.name order by pc.name) into personal_names
    from jsonb_array_elements(ingredient_list) as ingredient(item)
    join public.product_catalog pc on pc.id = (ingredient.item ->> 'product_catalog_id')::uuid
    where pc.owner_id is not null;

    if personal_names is not null then
      raise exception 'Una receta de la familia no lleva productos personales'
        using errcode = '22023',
          hint = 'recipe_personal_products',
          detail = to_jsonb(personal_names)::text;
    end if;
  end if;

  delete from public.recipe_ingredients
  where recipe_id = saved_recipe_id;

  insert into public.recipe_ingredients
    (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
  select
    saved_recipe_id,
    (ingredient.item ->> 'product_catalog_id')::uuid,
    (ingredient.item ->> 'quantity_value')::numeric,
    ingredient.item ->> 'quantity_unit',
    (ingredient.item_order - 1)::integer
  from jsonb_array_elements(ingredient_list) with ordinality as ingredient(item, item_order);

  return saved_recipe_id;
end;
$$;

revoke execute on function public.save_recipe(text, integer, jsonb, uuid) from public, anon;
grant execute on function public.save_recipe(text, integer, jsonb, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. share_recipe y copy_recipe. security definer: household_id y owner_id no los
--    escribe el cliente. Ninguna recibe la familia: sale de la membresía.
-- ----------------------------------------------------------------------------

-- Devuelve los productos que impiden compartir; vacío = quedó compartida. Con una
-- que ya es de la familia no hace nada: así se puede reintentar.
create function public.share_recipe(target_recipe_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  -- Acota lo que copia el trigger al salir alguien: sin tope, miles de recetas lo
  -- harían pasar el tiempo límite y no se podría remover a quien las compartió.
  max_household_recipes constant integer := 300;
  member_household_id uuid;
  recipe_household_id uuid;
  blocked_names text[];
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para compartir recetas'
      using errcode = '42501';
  end if;

  -- Primero la familia y después la membresía, como 023 y 026 (al revés habría
  -- deadlock con una salida). Se relee porque pudo salir mientras esperaba. Con la
  -- membresía bloqueada, si sale después su trigger ya ve esta receta.
  perform 1
  from public.households h
  where h.id = public.current_household_id()
  for key share;

  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id
  for key share;

  if member_household_id is null then
    raise exception 'Quien comparte no pertenece a una familia'
      using errcode = '42501', hint = 'recipe_no_household';
  end if;

  -- Espera a un save_recipe en curso, que también toma la fila. Un insert directo
  -- de ingrediente en el mismo instante se puede colar: es el propio dueño, y lo
  -- único que pasa es que la familia ve ese ingrediente vacío.
  select r.household_id into recipe_household_id
  from public.recipes r
  where r.id = target_recipe_id
    and (
      (r.household_id is null and r.owner_id = current_user_id)
      or r.household_id = member_household_id
    )
  for update;

  if not found then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  if recipe_household_id is not null then
    return '{}';
  end if;

  if (
    select count(*) from public.recipes r where r.household_id = member_household_id
  ) >= max_household_recipes then
    raise exception 'La familia puede tener hasta % recetas', max_household_recipes
      using errcode = '22023', hint = 'recipe_household_limit';
  end if;

  -- Acá no corre la RLS del catálogo: sin el case, alguien pondría el id de un
  -- producto que no ve para leer su nombre.
  select array_agg(distinct case
    when pc.owner_id = current_user_id then pc.name
    else 'Un producto que no puedes ver'
  end) into blocked_names
  from public.recipe_ingredients ri
  join public.product_catalog pc on pc.id = ri.product_catalog_id
  where ri.recipe_id = target_recipe_id
    and not (pc.owner_id is null and (pc.household_id is null or pc.household_id = member_household_id));

  if blocked_names is not null then
    return blocked_names;
  end if;

  update public.recipes
  set household_id = member_household_id
  where id = target_recipe_id;

  return '{}';
end;
$$;

revoke execute on function public.share_recipe(uuid) from public, anon;
grant execute on function public.share_recipe(uuid) to authenticated;

-- Copia personal de una receta para new_owner_id, con la foto por referencia. Con
-- excluded_household_id omite los productos de esa familia; nulo si no queda
-- ninguno. Sin permiso para nadie: la llaman copy_recipe y el trigger.
create function public.clone_recipe(
  source_recipe_id uuid,
  new_owner_id uuid,
  excluded_household_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cloned_recipe_id uuid;
begin
  if not exists (
    select 1
    from public.recipe_ingredients ri
    join public.product_catalog pc on pc.id = ri.product_catalog_id
    where ri.recipe_id = source_recipe_id
      and (excluded_household_id is null or pc.household_id is distinct from excluded_household_id)
  ) then
    return null;
  end if;

  insert into public.recipes (owner_id, household_id, name, base_servings, photo_path)
  select new_owner_id, null, r.name, r.base_servings, r.photo_path
  from public.recipes r
  where r.id = source_recipe_id
  returning id into cloned_recipe_id;

  insert into public.recipe_ingredients
    (recipe_id, product_catalog_id, quantity_value, quantity_unit, position)
  select cloned_recipe_id, ri.product_catalog_id, ri.quantity_value, ri.quantity_unit, ri.position
  from public.recipe_ingredients ri
  join public.product_catalog pc on pc.id = ri.product_catalog_id
  where ri.recipe_id = source_recipe_id
    and (excluded_household_id is null or pc.household_id is distinct from excluded_household_id)
  order by ri.position
  -- El tope del editor: por la API directa una receta podría llevar más.
  limit 50;

  return cloned_recipe_id;
end;
$$;

revoke execute on function public.clone_recipe(uuid, uuid, uuid) from public, anon, authenticated;

create function public.copy_recipe(target_recipe_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  copied_recipe_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para copiar recetas'
      using errcode = '42501';
  end if;

  -- for share: la copia no mezcla un guardado a medias de otro miembro.
  perform 1
  from public.recipes r
  where r.id = target_recipe_id
    and r.household_id = public.current_household_id()
  for share;

  if not found then
    raise exception 'Receta no encontrada'
      using errcode = 'P0002';
  end if;

  copied_recipe_id := public.clone_recipe(target_recipe_id, current_user_id);

  if copied_recipe_id is null then
    raise exception 'La receta no tiene ingredientes'
      using errcode = '22023';
  end if;

  return copied_recipe_id;
end;
$$;

revoke execute on function public.copy_recipe(uuid) from public, anon;
grant execute on function public.copy_recipe(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Al dejar de ser miembro (salir o ser removido): copia de las recetas propias,
--    el original pasa al admin, y el plan no queda apuntando a algo que ya no ve.
--    El original cambia de dueño porque la 024, al disolver, devuelve cada receta
--    a su owner_id: volvería a quien ya se fue.
--
--    No hace nada si la familia se está borrando (la 024 devuelve las recetas) ni
--    si se está borrando la cuenta (no hay a quién darle la copia).
-- ----------------------------------------------------------------------------
create function public.keep_recipes_on_household_exit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_user_id uuid;
  shared_recipe_id uuid;
  copied_recipe_id uuid;
begin
  if not exists (select 1 from public.households h where h.id = old.household_id)
    or not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;

  select m.user_id into admin_user_id
  from public.household_members m
  where m.household_id = old.household_id
  -- Si no queda admin (se borró su cuenta), el miembro más antiguo.
  order by (m.role = 'admin') desc, m.created_at, m.user_id
  limit 1;

  for shared_recipe_id in
    select r.id
    from public.recipes r
    where r.household_id = old.household_id and r.owner_id = old.user_id
    order by r.id
    for update
  loop
    copied_recipe_id := public.clone_recipe(shared_recipe_id, old.user_id, old.household_id);

    if copied_recipe_id is not null then
      update public.meal_plans mp
      set recipe_id = copied_recipe_id
      where mp.recipe_id = shared_recipe_id and mp.owner_id = old.user_id;
    end if;

    if admin_user_id is not null then
      update public.recipes
      set owner_id = admin_user_id
      where id = shared_recipe_id;
    end if;
  end loop;

  delete from public.meal_plans mp
  using public.recipes r
  where r.id = mp.recipe_id
    and r.household_id = old.household_id
    and mp.owner_id = old.user_id;

  return old;
end;
$$;

revoke execute on function public.keep_recipes_on_household_exit() from public, anon, authenticated;

create trigger household_members_keep_recipes
  after delete on public.household_members
  for each row execute function public.keep_recipes_on_household_exit();
