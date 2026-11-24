-- ============================================================================
-- SCRUM-110 (HU-73): grupos de productos de ejemplo para UN usuario de demo
--
-- Sirve para ver "Mis grupos" (/lista/grupos) con tarjetas sin armarlas a
-- mano, por ejemplo para grabar la demo. Crea 3 grupos con productos curados
-- del catálogo (SCRUM-131/133):
--   1. "Desayuno de la semana": personal.
--   2. "Repostería del domingo": compartido con la familia del usuario, si
--      tiene una; si no, personal.
--   3. Uno con nombre largo, para ver cómo se acomoda en la tarjeta.
--
-- Cómo usarlo (SQL editor de Supabase, que corre sin RLS):
--   1. Abrir la app con el usuario de demo al menos una vez, para que exista.
--   2. Buscar su id: Authentication > Users, o
--        select id, email, last_sign_in_at from auth.users
--        order by last_sign_in_at desc nulls last limit 5;
--   3. Pegar ese id en demo_user_id (abajo) y correr el script.
--   4. Recargar /lista/grupos.
--
-- Es idempotente: borra y vuelve a crear los grupos de ejemplo de ese usuario.
-- Cómo sabe cuáles son "de ejemplo": todos llevan created_at dentro de la
-- primera hora del 2000-01-01 (demo_marker), una fecha que ningún grupo real
-- puede tener (created_at es now() al crearlo). El delete solo toca esas
-- filas, así que no borra grupos reales aunque se llamen igual.
--
-- Para quitarlos: correr solo el bloque "Limpieza" del final.
--
-- No es una migración: son datos de prueba y no van a producción. Escribe en
-- la base compartida: avisar al grupo antes de correrlo.
-- ============================================================================

do $$
declare
  -- Pegar acá el id del usuario de demo (paso 2).
  demo_user_id constant uuid := '00000000-0000-0000-0000-000000000000';
  demo_marker constant timestamptz := '2000-01-01 00:00:00+00';
  demo_household_id uuid;
  expected_items integer;
  inserted_items integer;
begin
  if not exists (select 1 from auth.users where id = demo_user_id) then
    raise exception 'No existe el usuario %: pega su id en demo_user_id', demo_user_id;
  end if;

  select household_id into demo_household_id
  from public.household_members
  where user_id = demo_user_id;

  -- Los productos de cada grupo se borran en cascada con su grupo (054).
  delete from public.product_groups
  where owner_id = demo_user_id
    and created_at >= demo_marker and created_at < demo_marker + interval '1 hour';

  -- updated_at decide el orden de "Mis grupos": el primero de la lista es el
  -- más reciente.
  insert into public.product_groups (owner_id, household_id, name, created_at, updated_at)
  values
    (demo_user_id, null, 'Desayuno de la semana', demo_marker, now()),
    (demo_user_id, demo_household_id, 'Repostería del domingo', demo_marker + interval '1 minute', now() - interval '1 day'),
    (demo_user_id, null, 'Compra grande del mes para la familia y las visitas', demo_marker + interval '2 minutes', now() - interval '2 days');

  -- Producto curado, la presentación más parecida al tamaño pedido y la
  -- cantidad. position = orden dentro del grupo.
  with demo_items (group_name, product_name, preferred_quantity, base_unit, quantity, position) as (
    values
      ('Desayuno de la semana', 'Leche', 1000, 'ml', 2, 0),
      ('Desayuno de la semana', 'Cereal', 500, 'g', 1, 1),
      ('Desayuno de la semana', 'Chocolate', 100, 'g', 1, 2),
      ('Repostería del domingo', 'Leche condensada', 395, 'g', 2, 0),
      ('Repostería del domingo', 'Leche evaporada', 360, 'g', 1, 1),
      ('Repostería del domingo', 'Crema de leche', 250, 'ml', 1, 2),
      ('Repostería del domingo', 'Leche de coco', 400, 'ml', 1, 3),
      ('Compra grande del mes para la familia y las visitas', 'Arroz', 1800, 'g', 2, 0),
      ('Compra grande del mes para la familia y las visitas', 'Leche', 1000, 'ml', 6, 1),
      ('Compra grande del mes para la familia y las visitas', 'Jabón', 100, 'g', 3, 2),
      ('Compra grande del mes para la familia y las visitas', 'Helado', 1, 'unidad', 1, 3)
  )
  insert into public.product_group_items (group_id, product_catalog_variant_id, quantity, position)
  select pg.id, chosen_variant.id, di.quantity, di.position
  from demo_items di
  join public.product_groups pg
    on pg.owner_id = demo_user_id
   and pg.name = di.group_name
   and pg.created_at >= demo_marker and pg.created_at < demo_marker + interval '1 hour'
  join public.product_catalog pc
    on pc.name = di.product_name
   and pc.household_id is null and pc.owner_id is null and pc.archived_at is null
  cross join lateral (
    -- La de la misma unidad más cercana al tamaño pedido; si no hay de esa
    -- unidad, la más cercana de cualquiera.
    select pcv.id
    from public.product_catalog_variants pcv
    where pcv.product_catalog_id = pc.id
    order by (pcv.base_unit = di.base_unit) desc, abs(pcv.base_quantity - di.preferred_quantity), pcv.id
    limit 1
  ) chosen_variant;

  get diagnostics inserted_items = row_count;
  expected_items := 11;
  if inserted_items <> expected_items then
    raise exception 'Se insertaron % de % productos: alguno no está en el catálogo curado', inserted_items, expected_items;
  end if;

  raise notice 'Grupos de ejemplo creados para %; "Repostería del domingo" quedó %',
    demo_user_id,
    case when demo_household_id is null then 'personal (el usuario no tiene familia)' else 'compartido con su familia' end;
end $$;

-- ----------------------------------------------------------------------------
-- Limpieza: borra solo los grupos de ejemplo (de cualquier usuario).
-- Correr este bloque solo, cuando ya no hagan falta.
-- ----------------------------------------------------------------------------
-- delete from public.product_groups
-- where created_at >= '2000-01-01 00:00:00+00' and created_at < '2000-01-01 01:00:00+00';
