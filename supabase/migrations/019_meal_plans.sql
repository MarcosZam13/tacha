-- ============================================================================
-- SCRUM-100 (HU-68): asignar receta, cocinero y porciones a un espacio del plan
--
-- 1. Tabla meal_plans: una fila por espacio asignado (día + comida) del plan
--    semanal. El plan es PERSONAL por ahora: cada usuario ve y cambia solo el
--    suyo. household_id queda nullable y sin FK, igual que lists (004) y
--    recipes (006): cuando el household se integre se suman políticas de
--    miembros y un índice por household, sin cambiar esta estructura
--    (features/meal-planner/specs/SPEC.md §15).
-- 2. RLS y permisos por columna: el cliente solo escribe lo del espacio.
-- 3. RPC assign_meal_slot: crea o reemplaza un espacio (insert … on conflict),
--    todo o nada. Es una RPC y no un upsert directo porque PostgREST no puede
--    apuntar on conflict a un índice parcial.
--
-- Quitar un espacio es un delete directo (una sola sentencia, ya atómica).
-- Borrar una receta libera sus espacios por on delete cascade (SPEC regla 22);
-- las cascadas no pasan por RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- meal_plans
-- ----------------------------------------------------------------------------

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  -- Como recipes (006): el dueño sale del default, nunca del cliente.
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Sin FK hasta que exista la integración con households. Hoy siempre es nulo
  -- (lo exigen las políticas).
  household_id uuid,
  date date not null,
  -- Los mismos valores que MEAL_TYPE en features/meal-planner/constants/.
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  -- Borrar la receta libera el espacio (cascade) y el diálogo de eliminar lo
  -- avisa antes (SPEC regla 22).
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  -- Hoy solo puede ser el propio usuario o nadie (lo exigen las políticas). Si
  -- el usuario se borra, el espacio queda sin cocinero en vez de perderse.
  assigned_cook uuid references auth.users (id) on delete set null,
  -- De ×0,5 a ×4 en pasos de 0,5. numeric sin escala: un 2,04 se rechaza en
  -- vez de redondearse a 2,0, y NaN e Infinity quedan fuera del rango.
  servings_multiplier numeric not null default 1
    check (
      servings_multiplier >= 0.5
      and servings_multiplier <= 4
      and servings_multiplier * 2 = trunc(servings_multiplier * 2)
    ),
  created_at timestamptz not null default now()
);

-- Un solo espacio por día y comida en el plan personal (regla 11). Índice
-- parcial, igual que lists_one_general_per_owner en 004. Cuando exista el plan
-- del household se suma otro por (household_id, date, meal_type).
create unique index meal_plans_one_slot_per_owner
  on public.meal_plans (owner_id, date, meal_type)
  where household_id is null;

-- Los usan las cascadas y las FK (sin índice recorren toda la tabla).
create index meal_plans_recipe_id_idx on public.meal_plans (recipe_id);
create index meal_plans_assigned_cook_idx on public.meal_plans (assigned_cook);

-- ----------------------------------------------------------------------------
-- RLS y permisos. Nace activado y sin políticas (deny por defecto). RLS decide
-- qué filas; los permisos, qué columnas. owner_id, household_id y created_at
-- no se pueden fijar a mano, y la fecha y la comida de un espacio no se
-- mueven una vez creado (mismo criterio que 008 y 013).
-- ----------------------------------------------------------------------------

alter table public.meal_plans enable row level security;

revoke all on public.meal_plans from public, anon, authenticated;
grant select, delete on public.meal_plans to authenticated;
grant insert (date, meal_type, recipe_id, assigned_cook, servings_multiplier)
  on public.meal_plans to authenticated;
grant update (recipe_id, assigned_cook, servings_multiplier)
  on public.meal_plans to authenticated;

create policy "owner reads own meal plan"
  on public.meal_plans for select
  to authenticated
  using (owner_id = (select auth.uid()) and household_id is null);

-- La receta tiene que ser propia: sin eso alguien podría colgar el id de una
-- receta ajena en su plan y leer su nombre embebiendo recipes. El exists pasa
-- por la RLS de recipes de quien escribe.
-- assigned_cook solo puede ser nulo o el propio usuario: sin eso, con el
-- permiso de columna, alguien podría poner a otro usuario como cocinero.
create policy "owner adds to own meal plan"
  on public.meal_plans for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and household_id is null
    and (assigned_cook is null or assigned_cook = (select auth.uid()))
    and exists (
      select 1 from public.recipes r
      where r.id = meal_plans.recipe_id and r.owner_id = (select auth.uid())
    )
  );

-- using y with check: sin el with check, un usuario podría cambiar su espacio
-- a una receta ajena o a otro cocinero.
create policy "owner updates own meal plan"
  on public.meal_plans for update
  to authenticated
  using (owner_id = (select auth.uid()) and household_id is null)
  with check (
    owner_id = (select auth.uid())
    and household_id is null
    and (assigned_cook is null or assigned_cook = (select auth.uid()))
    and exists (
      select 1 from public.recipes r
      where r.id = meal_plans.recipe_id and r.owner_id = (select auth.uid())
    )
  );

create policy "owner removes from own meal plan"
  on public.meal_plans for delete
  to authenticated
  using (owner_id = (select auth.uid()) and household_id is null);

-- ----------------------------------------------------------------------------
-- assign_meal_slot
--
-- security invoker: corre con los permisos de quien llama, así que las
-- políticas y los permisos de arriba siguen siendo el control.
--
-- El cliente no manda ids de usuario: cook_is_self = true pone al propio
-- usuario como cocinero y false lo deja sin cocinero. Cuando existan los
-- miembros del household, este parámetro pasa a ser un id validado.
--
-- Una receta ajena y una inexistente dan el mismo error (P0002), para no
-- revelar si una receta ajena existe.
-- ----------------------------------------------------------------------------

create or replace function public.assign_meal_slot(
  slot_date date,
  slot_meal_type text,
  target_recipe_id uuid,
  cook_is_self boolean,
  slot_servings_multiplier numeric
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  found_recipe_id uuid;
  saved_slot_id uuid;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para planificar comidas'
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

  -- owner_id sale del default auth.uid() y household_id queda nulo. Un espacio
  -- ya ocupado se reemplaza: no se acumulan dos recetas en el mismo espacio.
  -- El multiplicador y el tipo de comida los valida el check de la tabla.
  insert into public.meal_plans (date, meal_type, recipe_id, assigned_cook, servings_multiplier)
  values (
    slot_date,
    slot_meal_type,
    found_recipe_id,
    case when cook_is_self then current_user_id end,
    slot_servings_multiplier
  )
  on conflict (owner_id, date, meal_type) where household_id is null
  do update set
    recipe_id = excluded.recipe_id,
    assigned_cook = excluded.assigned_cook,
    servings_multiplier = excluded.servings_multiplier
  returning id into saved_slot_id;

  return saved_slot_id;
end;
$$;

revoke execute on function public.assign_meal_slot(date, text, uuid, boolean, numeric) from public, anon;
grant execute on function public.assign_meal_slot(date, text, uuid, boolean, numeric) to authenticated;
