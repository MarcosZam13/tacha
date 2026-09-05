-- ============================================================================
-- Spec 2: Datos de prueba para search_catalog
--
-- Inserta un catálogo mínimo:
-- - 1 producto madre: "Leche"
-- - 2 variantes: "Leche — caja 1L" y "Leche — botella 1.5L"
-- - 2 marcas por variante: "Dos Pinos" y "Finca Suiza"
-- - Precios en las 3 tiendas (maxipali, walmart, masxmenos)
--
-- Esto permite probar la función search_catalog sin depender del matching
-- automático (spec 3).
-- ============================================================================

-- Limpiar datos previos (idempotente)
delete from product_prices
  where product_brand_id in (
    select id from product_brands
      where product_catalog_variant_id in (
        select id from product_catalog_variants
          where product_catalog_id = (
            select id from product_catalog where name = 'Leche' limit 1
          )
      )
  );

delete from product_brands
  where product_catalog_variant_id in (
    select id from product_catalog_variants
      where product_catalog_id = (
        select id from product_catalog where name = 'Leche' limit 1
      )
  );

delete from product_catalog_variants
  where product_catalog_id = (
    select id from product_catalog where name = 'Leche' limit 1
  );

delete from product_catalog where name = 'Leche';
delete from categories where name = 'Lácteos';

-- Insertar categoría
insert into categories (name) values ('Lácteos');
set session app.temp_category_id = (
  select id from categories where name = 'Lácteos' limit 1
);

-- Insertar producto madre
insert into product_catalog (name, category_id, source)
values ('Leche', (select id from categories where name = 'Lácteos'), 'manual')
returning id as temp_product_id;

set session app.temp_product_id = (
  select id from product_catalog where name = 'Leche' limit 1
);

-- Insertar variantes
with variant_caja as (
  insert into product_catalog_variants (product_catalog_id, name, base_unit, base_quantity, image_url)
  values (
    (select (current_setting('app.temp_product_id'))::uuid),
    'Leche — caja 1L',
    'ml',
    1000,
    'https://example.com/leche-caja-1l.jpg'
  )
  returning id
),
variant_botella as (
  insert into product_catalog_variants (product_catalog_id, name, base_unit, base_quantity, image_url)
  values (
    (select (current_setting('app.temp_product_id'))::uuid),
    'Leche — botella 1.5L',
    'ml',
    1500,
    'https://example.com/leche-botella-1.5l.jpg'
  )
  returning id
)
select 'variants inserted';

-- Insertar marcas para variante "caja 1L"
with variant_id as (
  select id from product_catalog_variants
  where product_catalog_id = (select (current_setting('app.temp_product_id'))::uuid)
    and name = 'Leche — caja 1L'
  limit 1
)
insert into product_brands (product_catalog_variant_id, name, logo_url)
select v.id, 'Dos Pinos', 'https://example.com/dos-pinos-logo.png'
from variant_id v
union all
select v.id, 'Finca Suiza', 'https://example.com/finca-suiza-logo.png'
from variant_id v;

-- Insertar marcas para variante "botella 1.5L"
with variant_id as (
  select id from product_catalog_variants
  where product_catalog_id = (select (current_setting('app.temp_product_id'))::uuid)
    and name = 'Leche — botella 1.5L'
  limit 1
)
insert into product_brands (product_catalog_variant_id, name, logo_url)
select v.id, 'Dos Pinos', 'https://example.com/dos-pinos-logo.png'
from variant_id v
union all
select v.id, 'Finca Suiza', 'https://example.com/finca-suiza-logo.png'
from variant_id v;

-- Insertar precios: variante "caja 1L"
with variant_id as (
  select id from product_catalog_variants
  where product_catalog_id = (select (current_setting('app.temp_product_id'))::uuid)
    and name = 'Leche — caja 1L'
  limit 1
),
dos_pinos_id as (
  select id from product_brands
  where name = 'Dos Pinos'
    and product_catalog_variant_id = (select id from variant_id)
  limit 1
),
finca_suiza_id as (
  select id from product_brands
  where name = 'Finca Suiza'
    and product_catalog_variant_id = (select id from variant_id)
  limit 1
)
insert into product_prices (product_catalog_variant_id, product_brand_id, store_id, price, is_available, source)
-- Dos Pinos - caja 1L
select v.id, dp.id, s.id,
  case s.slug
    when 'maxipali' then 850.00
    when 'walmart' then 880.00
    when 'masxmenos' then 820.00
  end,
  true, 'manual'
from variant_id v, dos_pinos_id dp, stores s
union all
-- Finca Suiza - caja 1L
select v.id, fs.id, s.id,
  case s.slug
    when 'maxipali' then 950.00
    when 'walmart' then 990.00
    when 'masxmenos' then 920.00
  end,
  true, 'manual'
from variant_id v, finca_suiza_id fs, stores s;

-- Insertar precios: variante "botella 1.5L"
with variant_id as (
  select id from product_catalog_variants
  where product_catalog_id = (select (current_setting('app.temp_product_id'))::uuid)
    and name = 'Leche — botella 1.5L'
  limit 1
),
dos_pinos_id as (
  select id from product_brands
  where name = 'Dos Pinos'
    and product_catalog_variant_id = (select id from variant_id)
  limit 1
),
finca_suiza_id as (
  select id from product_brands
  where name = 'Finca Suiza'
    and product_catalog_variant_id = (select id from variant_id)
  limit 1
)
insert into product_prices (product_catalog_variant_id, product_brand_id, store_id, price, is_available, source)
-- Dos Pinos - botella 1.5L
select v.id, dp.id, s.id,
  case s.slug
    when 'maxipali' then 1200.00
    when 'walmart' then 1250.00
    when 'masxmenos' then 1180.00
  end,
  true, 'manual'
from variant_id v, dos_pinos_id dp, stores s
union all
-- Finca Suiza - botella 1.5L
select v.id, fs.id, s.id,
  case s.slug
    when 'maxipali' then 1400.00
    when 'walmart' then 1450.00
    when 'masxmenos' then 1380.00
  end,
  true, 'manual'
from variant_id v, finca_suiza_id fs, stores s;

-- Limpiar variables de sesión
reset session;

select 'Demo catalog seeded successfully' as status;
