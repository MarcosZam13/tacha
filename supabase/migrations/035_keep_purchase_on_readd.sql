-- ============================================================================
-- SCRUM-156: volver a añadir un producto tachado ya no borra su compra.
--
-- Hasta acá (regla 8 de features/shopping-list/specs/SPEC.md, migraciones 015
-- y 024): añadir un producto que estaba tachado reabría esa misma fila
-- (on conflict ... checked_at = null) y el trigger stamp_list_item_check (018)
-- le borraba la compra, quién la tachó y lo comprado. Como el registro de una
-- compra vive solo en esa fila, cada vez que se volvía a pedir un producto la
-- compra pasada lo perdía. En la lista de la familia, B agregando una receta
-- desde la casa sacaba de la compra de A lo que A acababa de tachar.
--
-- Regla nueva:
--   1. "Una fila por presentación" vale solo entre las pendientes. Añadir algo
--      tachado crea una fila pendiente nueva; la tachada se queda con su compra.
--      El unique (list_id, product_catalog_variant_id) de 004 pasa a ser un
--      índice único parcial where checked_at is null.
--   2. Destachar una fila cuando ya hay una pendiente de esa presentación las
--      junta en la pendiente: suma lo pedido, pasa los pedidos de receta y
--      borra la que se destachó. Destachar sigue siendo corregir un error.
--
-- Funciones que cambian (todas escribían con el on conflict de 004):
--   - add_item_to_general_list (buscador)
--   - add_units_to_list_item (recetas y semana: la usan add_recipe_to_general_list
--     y add_week_ingredients_to_list)
--   - decide_personal_lists ("compartir" mis listas al entrar a una familia,
--     SCRUM-59): un pendiente propio ya no se queda en la lista personal porque
--     la familia lo tenga tachado en una compra; pasa como fila pendiente nueva.
--     Por eso ya no devuelve 'nothing_shared' ni 'shared_partially'.
--   - set_list_item_checked: el caso de juntar al destachar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Una fila pendiente por presentación (antes: una fila por presentación).
--    El índice parcial es el que nombran los on conflict de abajo, con el mismo
--    where. Hoy no hay dos filas de la misma presentación en una lista (lo
--    impedía el unique de 004), así que se crea sin conflictos.
-- ----------------------------------------------------------------------------
alter table public.list_items
  drop constraint list_items_list_id_product_catalog_variant_id_key;

create unique index list_items_one_pending_per_variant
  on public.list_items (list_id, product_catalog_variant_id)
  where checked_at is null;

-- ----------------------------------------------------------------------------
-- 2. Buscador: suma a la pendiente o crea una nueva. Ya no reabre la tachada.
-- ----------------------------------------------------------------------------
create or replace function public.add_item_to_general_list(target_variant_id uuid)
returns public.list_items
language plpgsql
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
  on conflict (list_id, product_catalog_variant_id) where checked_at is null
  do update set quantity_requested = public.list_items.quantity_requested + 1
  returning * into upserted_item;

  return upserted_item;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Recetas y semana: igual, con las unidades que calculó la receta.
-- ----------------------------------------------------------------------------
create or replace function public.add_units_to_list_item(
  target_list_id uuid,
  target_variant_id uuid,
  units_to_add integer
)
returns uuid
language sql
set search_path = ''
as $$
  insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
  values (target_list_id, target_variant_id, units_to_add)
  on conflict (list_id, product_catalog_variant_id) where checked_at is null
  do update set
    quantity_requested = public.list_items.quantity_requested + excluded.quantity_requested
  returning id;
$$;

-- ----------------------------------------------------------------------------
-- 4. "Compartir" mis listas (SCRUM-59). Solo cambia el on conflict del loop:
--    cada pendiente personal se suma a la pendiente de la familia o entra como
--    fila pendiente nueva. Lo que la familia tenga tachado no se toca.
-- ----------------------------------------------------------------------------
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
      insert into public.list_items (list_id, product_catalog_variant_id, quantity_requested)
      values (household_list_id, pending_item.product_catalog_variant_id, pending_item.quantity_requested)
      on conflict (list_id, product_catalog_variant_id) where checked_at is null
      do update set
        quantity_requested = least(
          public.list_items.quantity_requested::bigint + excluded.quantity_requested,
          max_item_quantity
        )::integer
      returning id into target_item_id;

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

  return 'shared';
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Tachar / destachar. Tachar no cambia. Destachar, si ya hay una pendiente
--    de la misma presentación, las junta en la pendiente y devuelve esa fila
--    (con otro id: el cliente lo usa para saber que hubo que juntar).
--
--    security definer: al juntar se mueven los pedidos de receta de la fila
--    destachada, que en la lista de la familia pueden ser de recetas de otro
--    miembro, y la RLS de list_item_recipe_requirements solo deja escribir
--    los de recetas propias. Por eso el acceso se comprueba a mano: la fila
--    tiene que estar en una lista que quien llama ve (la suya o la de su
--    familia), la misma regla que la política "owner or household member
--    reads lists" (024).
--
--    Carrera: si otro miembro crea la pendiente justo entre el select y el
--    update, el update choca con el índice parcial (unique_violation) y se
--    junta igual.
-- ----------------------------------------------------------------------------
create or replace function public.set_list_item_checked(target_item_id uuid, is_checked boolean)
returns public.list_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  max_item_quantity constant bigint := 2147483647;
  target_item public.list_items;
  pending_item_id uuid;
  changed_item public.list_items;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para tachar productos'
      using errcode = '42501';
  end if;

  select li.* into target_item
  from public.list_items li
  join public.lists l on l.id = li.list_id
  where li.id = target_item_id
    and (
      (l.household_id is null and l.owner_id = current_user_id)
      or l.household_id in (
        select m.household_id from public.household_members m
        where m.user_id = current_user_id
      )
    )
  for update of li;

  if target_item.id is null then
    raise exception 'El producto no está en tu lista'
      using errcode = 'P0002';
  end if;

  -- Tachar, o destachar algo que ya está pendiente: como siempre.
  if is_checked or target_item.checked_at is null then
    update public.list_items
    set checked_at = case when is_checked then now() end
    where id = target_item_id
    returning * into changed_item;

    return changed_item;
  end if;

  select li.id into pending_item_id
  from public.list_items li
  where li.list_id = target_item.list_id
    and li.product_catalog_variant_id = target_item.product_catalog_variant_id
    and li.checked_at is null
  for update;

  if pending_item_id is null then
    begin
      update public.list_items
      set checked_at = null
      where id = target_item_id
      returning * into changed_item;

      return changed_item;
    exception
      when unique_violation then
        select li.id into pending_item_id
        from public.list_items li
        where li.list_id = target_item.list_id
          and li.product_catalog_variant_id = target_item.product_catalog_variant_id
          and li.checked_at is null
        for update;

        -- No debería pasar (el choque fue justo con esa pendiente), pero si
        -- no aparece no se borra nada: mejor un error que perder la fila.
        if pending_item_id is null then
          raise;
        end if;
    end;
  end if;

  -- Juntar en la pendiente.
  update public.list_items
  set quantity_requested = least(
    quantity_requested::bigint + target_item.quantity_requested,
    max_item_quantity
  )::integer
  where id = pending_item_id
  returning * into changed_item;

  insert into public.list_item_recipe_requirements (
    list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit
  )
  select pending_item_id, r.recipe_id, r.quantity_needed, r.quantity_missing, r.quantity_unit
  from public.list_item_recipe_requirements r
  where r.list_item_id = target_item_id
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

  -- Sus pedidos de receta ya están en la pendiente; la cascada borra los viejos.
  delete from public.list_items where id = target_item_id;

  return changed_item;
end;
$$;

revoke execute on function public.set_list_item_checked(uuid, boolean) from public, anon;
grant execute on function public.set_list_item_checked(uuid, boolean) to authenticated;
