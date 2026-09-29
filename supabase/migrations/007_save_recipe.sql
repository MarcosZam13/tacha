-- ============================================================================
-- SCRUM-95 (HU-64): crear o editar una receta
--
-- Abre crear y editar en recipes y recipe_ingredients para el dueño, y agrega
-- save_recipe(): guarda la receta y todos sus ingredientes en una sola
-- transacción. Las políticas de lectura de 006 no cambian. Eliminar la
-- receta sigue cerrado hasta SCRUM-96.
--
-- Resuelve la deuda de seguridad anotada en features/recipes/specs/plan.md
-- (revisión de SCRUM-94, puntos 1 y 2).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- recipes: crear y editar solo lo propio, sin household.
-- household_id is null: mientras no existan households nadie puede colgar una
-- receta de un household ajeno mandando el id desde el cliente (sin FK se
-- guardaría igual). Mismo criterio que lists en 004.
-- ----------------------------------------------------------------------------

create policy "owner creates own recipes"
  on public.recipes for insert
  to authenticated
  with check (owner_id = (select auth.uid()) and household_id is null);

-- using: qué filas puede tocar. with check: cómo tienen que quedar. Sin el
-- with check alguien podría pasarle su receta a otro dueño o a un household.
create policy "owner updates own recipes"
  on public.recipes for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and household_id is null);

-- ----------------------------------------------------------------------------
-- recipe_ingredients: agregar, cambiar y quitar ingredientes de recetas propias.
-- El delete de ingredientes hace falta para editar (save_recipe los reemplaza);
-- borrar la receta completa no está abierto.
-- ----------------------------------------------------------------------------

create policy "owner adds ingredients to own recipes"
  on public.recipe_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.owner_id = (select auth.uid())
    )
  );

-- Con using y with check: sin el with check, un usuario podría mover su
-- ingrediente a una receta ajena cambiando recipe_id.
create policy "owner updates ingredients of own recipes"
  on public.recipe_ingredients for update
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.owner_id = (select auth.uid())
    )
  );

create policy "owner removes ingredients of own recipes"
  on public.recipe_ingredients for delete
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.owner_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- save_recipe: crea (target_recipe_id nulo) o edita una receta y reemplaza
-- sus ingredientes, todo o nada. security invoker: corre con los permisos de
-- quien llama, así que las políticas de arriba siguen siendo el control.
-- ingredient_list: [{ "product_catalog_id", "quantity_value", "quantity_unit" }],
-- en el orden del formulario (define position).
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
    returning id into saved_recipe_id;

    -- RLS oculta las recetas ajenas: no existe y no es tuya dan el mismo
    -- error, así no se revela cuál de las dos es.
    if saved_recipe_id is null then
      raise exception 'Receta no encontrada'
        using errcode = 'P0002';
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
