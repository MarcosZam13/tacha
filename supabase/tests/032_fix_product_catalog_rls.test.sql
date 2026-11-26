-- ============================================================================
-- Prueba de la migración 032 (SCRUM-87): RLS de
-- product_catalog/product_catalog_variants/product_brands.
--
-- Cómo se corre: completo en el SQL Editor (rol dueño de las tablas),
-- después de aplicar 032. Transacción con rollback (mismo patrón que
-- supabase/tests/024_household_lists.test.sql) — no deja nada en la base
-- compartida.
--
-- Datos:
--   familia 1: A (admin), único miembro.
--   E: usuario registrado sin household, con un producto personal propio.
--   "Lácteos": categoría real, sembrada por 020.
--
-- Casos:
--   1. anon no ve ninguna fila de product_catalog (ni global ni de nadie).
--   2. authenticated sin producto propio/household sí ve el catálogo global.
--   3. authenticated (E) ve su propio producto personal sin compartir.
--   4. authenticated (A, otro usuario) NO ve el producto personal de E.
--   5. authenticated (A) ve el producto que su household comparte.
--   6. product_catalog_variants y product_brands siguen la visibilidad de
--      su producto (mismos casos 3 y 4, mirando la variante/marca).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Datos (rol dueño).
-- ----------------------------------------------------------------------------
do $$
declare
  user_a uuid := gen_random_uuid();
  user_e uuid := gen_random_uuid();
  household_1 uuid := gen_random_uuid();
  lacteos_id uuid;
  product_e uuid;
  product_shared uuid;
  variant_e uuid;
begin
  select id into lacteos_id from categories where name = 'Lácteos';
  assert lacteos_id is not null, 'No se encontró la categoría "Lácteos" (¿se aplicó la migración 020?)';

  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@prueba.tacha', '{"name": "Ana"}'),
    (user_e, 'authenticated', 'authenticated', user_e || '@prueba.tacha', '{"name": "Eva"}');

  insert into public.households (id, name) values (household_1, 'Familia 1 SCRUM-87 RLS');
  insert into public.household_members (user_id, household_id, role)
  values (user_a, household_1, 'admin');

  -- Producto personal de E, sin compartir (owner_id, household_id null),
  -- con marca, insertado directo como rol dueño (sin pasar por la RPC: a
  -- esta prueba solo le importa la policy de lectura, no la escritura).
  insert into public.product_catalog (id, owner_id, household_id, category_id, name, source)
  values (gen_random_uuid(), user_e, null, lacteos_id, 'Zzqrls personal de E', 'manual')
  returning id into product_e;

  insert into public.product_catalog_variants (id, product_catalog_id, name, base_unit, base_quantity)
  values (gen_random_uuid(), product_e, 'Zzqrls personal de E — 1 unidad', 'unidad', 1)
  returning id into variant_e;

  insert into public.product_brands (product_catalog_variant_id, name)
  values (variant_e, 'Marca de E');

  -- Producto compartido con la familia 1 (household_id, owner_id null).
  insert into public.product_catalog (id, owner_id, household_id, category_id, name, source)
  values (gen_random_uuid(), null, household_1, lacteos_id, 'Zzqrls compartido familia 1', 'manual')
  returning id into product_shared;

  perform set_config('tacha_test.user_a', user_a::text, true);
  perform set_config('tacha_test.user_e', user_e::text, true);
  perform set_config('tacha_test.product_e', product_e::text, true);
  perform set_config('tacha_test.variant_e', variant_e::text, true);
  perform set_config('tacha_test.product_shared', product_shared::text, true);
end $$;

-- ----------------------------------------------------------------------------
-- 1. anon no ve ninguna fila.
-- ----------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  assert (select count(*) from public.product_catalog) = 0,
    'anon no debe ver ninguna fila de product_catalog (ni siquiera el catálogo global)';
  assert (select count(*) from public.product_catalog_variants) = 0,
    'anon no debe ver ninguna variante';
  assert (select count(*) from public.product_brands) = 0,
    'anon no debe ver ninguna marca';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- Desde acá, con sesión real de E.
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_e'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 2. E ve el catálogo global (al menos "Leche", sembrado por 020).
-- ----------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from public.product_catalog
    where name = 'Leche' and household_id is null and owner_id is null
  ), 'E debe ver el catálogo global curado';
end $$;

-- ----------------------------------------------------------------------------
-- 3. E ve su propio producto personal, su variante y su marca.
-- ----------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from public.product_catalog where id = current_setting('tacha_test.product_e')::uuid
  ), 'E debe ver su propio producto personal sin compartir';
  assert exists (
    select 1 from public.product_catalog_variants
    where id = current_setting('tacha_test.variant_e')::uuid
  ), 'E debe ver la variante de su propio producto';
  assert exists (
    select 1 from public.product_brands
    where product_catalog_variant_id = current_setting('tacha_test.variant_e')::uuid
  ), 'E debe ver la marca de su propio producto';
end $$;

-- ----------------------------------------------------------------------------
-- 5. E (sin household) NO ve el producto compartido de la familia 1.
-- ----------------------------------------------------------------------------
do $$
begin
  assert not exists (
    select 1 from public.product_catalog where id = current_setting('tacha_test.product_shared')::uuid
  ), 'E no pertenece a la familia 1: no debe ver su producto compartido';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- Desde acá, con sesión real de A (familia 1).
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('tacha_test.user_a'), 'role', 'authenticated')::text,
  true
);

-- ----------------------------------------------------------------------------
-- 4. A NO ve el producto personal sin compartir de E (ni su variante/marca).
-- ----------------------------------------------------------------------------
do $$
begin
  assert not exists (
    select 1 from public.product_catalog where id = current_setting('tacha_test.product_e')::uuid
  ), 'A no debe ver el producto personal de E, que E nunca compartió';
  assert not exists (
    select 1 from public.product_catalog_variants
    where id = current_setting('tacha_test.variant_e')::uuid
  ), 'A no debe ver la variante del producto personal de E';
  assert not exists (
    select 1 from public.product_brands
    where product_catalog_variant_id = current_setting('tacha_test.variant_e')::uuid
  ), 'A no debe ver la marca del producto personal de E';
end $$;

-- ----------------------------------------------------------------------------
-- 5. A sí ve el producto que su household comparte.
-- ----------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from public.product_catalog where id = current_setting('tacha_test.product_shared')::uuid
  ), 'A debe ver el producto que su household comparte';
end $$;

reset role;

rollback;
