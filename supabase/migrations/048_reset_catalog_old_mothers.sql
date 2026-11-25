-- ============================================================================
-- Migración 048 (SCRUM-133): reset del catálogo. Retira las madres viejas a
-- nivel SKU (anteriores a SCRUM-131) después de mover lo que las referencia.
--
-- Solo datos: no crea tablas ni funciones. Decisiones y mapeos en
-- supabase/specs/SCRUM-133/SPEC.md §3; pasos en plan.md §2.
--
--   1. Borra las 36 recetas demo originales (ventana de tiempo de la primera
--      corrida del seed, sin el marcador 2000-01-01).
--   2. Ingredientes de receta: madre vieja → madre curada (SPEC §3.1).
--   3. Ítems de lista: variante vieja → variante curada del mismo producto,
--      identificada por madre + tamaño (SPEC §3.2). Si dos ítems pendientes
--      de una lista terminan en la misma variante se fusionan como en la 035
--      (suma de cantidades y de requisitos de receta). Los ítems sin
--      equivalente se borran.
--   4. Borra las madres viejas (cascada: variantes, marcas, precios).
--
-- Madre vieja = madre global (owner_id y household_id null) sin regla en
-- product_mother_rules. Las FKs de recipe_ingredients y list_items son
-- NO ACTION a propósito: si quedara una referencia, el paso 4 fallaría; las
-- guardas abortan antes con un mensaje claro. En una base nueva (sin madres
-- viejas ni recetas) la migración no cambia nada.
--
-- Probar con supabase/tests/048_reset_catalog_old_mothers.test.sql.
-- ============================================================================

do $$
declare
  -- Primera corrida del seed de recetas demo (SCRUM-94), 9 usuarios x 4:
  -- todas tienen created_at dentro de este rango y ninguna otra receta lo tiene
  -- (verificado 2026-11-15, SPEC §2).
  c_demo_window_start constant timestamptz := '2026-09-28 05:41:00+00';
  c_demo_window_end constant timestamptz := '2026-09-28 05:46:00+00';
  -- Topes de los checks, mismos valores que la migración 035.
  c_max_item_quantity constant bigint := 2147483647;
  c_max_quantity_needed constant numeric := 10000000;

  n_demo_recipes integer;
  n_ingredients_deleted integer;
  n_ingredients_moved integer;
  n_items_merged integer;
  n_items_moved integer;
  n_items_deleted integer;
  n_mothers_deleted integer;
  n_left integer;
begin
  create temporary table _old_mothers on commit drop as
  select pc.id, pc.name
  from public.product_catalog pc
  where pc.owner_id is null
    and pc.household_id is null
    and not exists (select 1 from public.product_mother_rules r where r.product_catalog_id = pc.id);

  create temporary table _curated_mothers on commit drop as
  select pc.id, pc.name
  from public.product_catalog pc
  where pc.owner_id is null
    and pc.household_id is null
    and exists (select 1 from public.product_mother_rules r where r.product_catalog_id = pc.id);

  -- Las variantes viejas se llaman "<producto> — <producto>": la primera parte
  -- es el nombre del producto en el súper.
  create temporary table _old_variants on commit drop as
  select v.id, split_part(v.name, ' — ', 1) as product_name
  from public.product_catalog_variants v
  where v.product_catalog_id in (select id from _old_mothers);

  -- 1. Recetas demo originales (cascada: ingredientes, meal_plans, requisitos).
  delete from public.recipes
  where created_at >= c_demo_window_start
    and created_at < c_demo_window_end;
  get diagnostics n_demo_recipes = row_count;

  -- 2. Ingredientes de receta (SPEC §3.1). new_mother null = sin equivalente,
  -- se borra el ingrediente.
  create temporary table _mother_map (old_mother text primary key, new_mother text) on commit drop;
  insert into _mother_map (old_mother, new_mother) values
    ('Leche entera Sabemas - 1 L',                         'Leche'),
    ('Leche Semidescremada Dos Pinos -1 L',                'Leche'),
    ('Leche Dos Pinos Pinito - 1000 ml',                   'Leche'),
    ('Leche Coronado 100% Nutritiva 3 Pack - 3 L',         'Leche'),
    ('Crema de Leche Nestlé - 236g',                       'Crema de leche'),
    ('Leche Condensada La Lechera Original -335g',         'Leche condensada'),
    ('Leche condensada El Ángel doypack - 385 g',          'Leche condensada'),
    ('Leche Evaporada Ideal Nestlé lata -360g',            'Leche evaporada'),
    ('Chocolate Milka de Leche - 90 g',                    'Chocolate'),
    ('Froot Loops Mas Leche Pinito 520 g',                 'Cereal'),
    ('Leche De Coco Goya Lata - 400ml',                    'Leche de coco'),
    ('Jabón Dove Leche de Coco - 90 g',                    'Jabón'),
    ('Leche De Magnesia Phillips, Sabor Original -360 ml', null);

  if exists (
    select 1 from _mother_map m
    where m.new_mother is not null
      and not exists (select 1 from _curated_mothers c where c.name = m.new_mother)
  ) then
    raise exception 'SCRUM-133: una madre curada del mapeo de ingredientes no existe';
  end if;

  delete from public.recipe_ingredients ri
  using _old_mothers o, _mother_map m
  where ri.product_catalog_id = o.id
    and m.old_mother = o.name
    and m.new_mother is null;
  get diagnostics n_ingredients_deleted = row_count;

  -- Si una receta quedara con dos ingredientes en la misma madre, la
  -- restricción unique (recipe_id, product_catalog_id) aborta todo
  -- (verificado 2026-11-15: no pasa).
  update public.recipe_ingredients ri
  set product_catalog_id = c.id
  from _old_mothers o
  join _mother_map m on m.old_mother = o.name
  join _curated_mothers c on c.name = m.new_mother
  where ri.product_catalog_id = o.id;
  get diagnostics n_ingredients_moved = row_count;

  select count(*) into n_left
  from public.recipe_ingredients
  where product_catalog_id in (select id from _old_mothers);
  if n_left > 0 then
    raise exception 'SCRUM-133: % ingredientes siguen en madres viejas sin mapeo', n_left;
  end if;

  -- 3. Ítems de lista (SPEC §3.2). Destino = variante curada de la madre y el
  -- tamaño donde el normalizador puso ese mismo producto; madre + tamaño es
  -- único entre las variantes curadas. new_mother null = sin equivalente,
  -- se borra el ítem.
  create temporary table _variant_map (
    product_name text primary key, new_mother text, base_quantity numeric, base_unit text
  ) on commit drop;
  insert into _variant_map (product_name, new_mother, base_quantity, base_unit) values
    ('Caramelos Diana de leche - 154 g',                       'Dulces',           154,  'g'),
    ('Chocolate Milka de Leche - 90 g',                        'Chocolate',        90,   'g'),
    ('Crema de Leche Nestlé - 236g',                           'Crema de leche',   236,  'g'),
    ('Jabón Dove Leche de Coco - 90 g',                        'Jabón',            90,   'g'),
    ('Leche condensada El Ángel doypack - 385 g',              'Leche condensada', 385,  'g'),
    ('Leche Condensada La Lechera Original -335g',             'Leche condensada', 335,  'g'),
    ('Leche Dos Pinos condensada Pinito - 397 g',              'Leche condensada', 397,  'g'),
    ('Leche Evaporada Ideal Nestlé lata -360g',                'Leche evaporada',  360,  'g'),
    ('Leche De Coco Goya Lata - 400ml',                        'Leche de coco',    400,  'ml'),
    ('Leche Descremada Dos Pinos Liquida 0% Grasa - 250 ml',   'Leche',            250,  'ml'),
    ('Leche Dos Pinos Calciolac Extra Calcio - 946 ml',        'Leche',            946,  'ml'),
    ('Leche Dos Pinos Pinito - 1000 ml',                       'Leche',            1000, 'ml'),
    ('Leche entera Sabemas - 1 L',                             'Leche',            1000, 'ml'),
    ('Leche Semidescremada Dos Pinos -1 L',                    'Leche',            1000, 'ml'),
    ('Leche Coronado 100% Nutritiva 3 Pack - 3 L',             'Leche',            3000, 'ml'),
    ('Leche Dos pinos semidescremada 3 pack- 3000 ml',         'Leche',            3000, 'ml'),
    ('Torta Dulce Leche Economica Bucca 938g',                 'Repostería',       938,  'g'),
    ('Arrollado Moofy dulce de leche - 275 g',                 null, null, null),
    ('Froot Loops Mas Leche Pinito 520 g',                     null, null, null),
    ('Rice Krispies Mas Fresco Leche 382 g',                   null, null, null),
    ('Burbujakisses Cyc y Kisses Leche 180g',                  null, null, null),
    ('Leche De Magnesia Phillips, Sabor Original -360 ml',     null, null, null);

  create temporary table _variant_target on commit drop as
  select ov.id as old_variant_id, m.new_mother, cv.id as new_variant_id
  from _old_variants ov
  join _variant_map m on lower(m.product_name) = lower(ov.product_name)
  left join _curated_mothers c on c.name = m.new_mother
  left join public.product_catalog_variants cv
    on cv.product_catalog_id = c.id
   and cv.base_quantity = m.base_quantity
   and cv.base_unit = m.base_unit;

  if exists (select 1 from _variant_target where new_mother is not null and new_variant_id is null) then
    raise exception 'SCRUM-133: una variante curada del mapeo de ítems no existe';
  end if;

  select count(*) into n_left
  from public.list_items li
  where li.product_catalog_variant_id in (select id from _old_variants)
    and li.product_catalog_variant_id not in (select old_variant_id from _variant_target);
  if n_left > 0 then
    raise exception 'SCRUM-133: % ítems de lista están en productos viejos fuera del mapeo', n_left;
  end if;

  -- 3a. Fusión: ítems pendientes que terminan en la misma (lista, variante).
  -- Se queda el más viejo; los demás le pasan cantidad y requisitos de receta.
  create temporary table _merge on commit drop as
  with pending as (
    select li.id, li.list_id, li.created_at, li.quantity_requested,
      coalesce(t.new_variant_id, li.product_catalog_variant_id) as variant_id
    from public.list_items li
    left join _variant_target t on t.old_variant_id = li.product_catalog_variant_id
    where li.checked_at is null
      and (t.new_variant_id is not null or t.old_variant_id is null)
  )
  select p.id,
    first_value(p.id) over (partition by p.list_id, p.variant_id order by p.created_at, p.id) as keeper_id,
    sum(p.quantity_requested::bigint) over (partition by p.list_id, p.variant_id) as total_quantity,
    count(*) over (partition by p.list_id, p.variant_id) as group_size
  from pending p;
  delete from _merge where group_size = 1;

  insert into public.list_item_recipe_requirements (
    list_item_id, recipe_id, quantity_needed, quantity_missing, quantity_unit
  )
  select m.keeper_id, r.recipe_id,
    least(sum(r.quantity_needed), c_max_quantity_needed),
    least(sum(r.quantity_missing), sum(r.quantity_needed), c_max_quantity_needed),
    r.quantity_unit
  from public.list_item_recipe_requirements r
  join _merge m on m.id = r.list_item_id
  where m.id <> m.keeper_id
  group by m.keeper_id, r.recipe_id, r.quantity_unit
  on conflict (list_item_id, recipe_id, quantity_unit)
  do update set
    quantity_needed = least(
      public.list_item_recipe_requirements.quantity_needed + excluded.quantity_needed,
      c_max_quantity_needed
    ),
    quantity_missing = least(
      public.list_item_recipe_requirements.quantity_missing + excluded.quantity_missing,
      public.list_item_recipe_requirements.quantity_needed + excluded.quantity_needed,
      c_max_quantity_needed
    );

  update public.list_items li
  set quantity_requested = least(m.total_quantity, c_max_item_quantity)::integer
  from _merge m
  where li.id = m.id
    and m.id = m.keeper_id;

  -- Sus requisitos ya están en el ítem que queda; la cascada borra los viejos.
  delete from public.list_items li
  using _merge m
  where li.id = m.id
    and m.id <> m.keeper_id;
  get diagnostics n_items_merged = row_count;

  -- 3b. Mover el resto.
  update public.list_items li
  set product_catalog_variant_id = t.new_variant_id
  from _variant_target t
  where li.product_catalog_variant_id = t.old_variant_id
    and t.new_variant_id is not null;
  get diagnostics n_items_moved = row_count;

  -- 3c. Ítems sin equivalente (cascada: requisitos y snapshots).
  delete from public.list_items li
  using _variant_target t
  where li.product_catalog_variant_id = t.old_variant_id
    and t.new_variant_id is null;
  get diagnostics n_items_deleted = row_count;

  select count(*) into n_left
  from public.list_items
  where product_catalog_variant_id in (select id from _old_variants);
  if n_left > 0 then
    raise exception 'SCRUM-133: % ítems de lista siguen en variantes viejas', n_left;
  end if;

  select count(*) into n_left
  from public.product_catalog_staging
  where matched_variant_id in (select id from _old_variants);
  if n_left > 0 then
    raise exception 'SCRUM-133: % filas de staging siguen en variantes viejas', n_left;
  end if;

  -- 4. Madres viejas (cascada: variantes, marcas, precios, snapshots).
  delete from public.product_catalog
  where id in (select id from _old_mothers);
  get diagnostics n_mothers_deleted = row_count;

  raise notice 'SCRUM-133: % recetas demo borradas; ingredientes: % movidos, % borrados; ítems de lista: % fusionados, % movidos, % borrados; % madres viejas borradas',
    n_demo_recipes, n_ingredients_moved, n_ingredients_deleted,
    n_items_merged, n_items_moved, n_items_deleted, n_mothers_deleted;
end;
$$;
