-- ============================================================================
-- Tacha — Catálogo + Web Scraping
-- Alineado a documentacion-v1_for claude.md (v2.1, sección 6) + reporte
-- AI-Generated Report/reporte-catalogo-scraping.md
--
-- Reemplaza por completo el schema anterior (products/skus/price_snapshots).
-- Este script es idempotente: usa "drop ... if exists" antes de recrear,
-- para poder correrlo tanto en un proyecto nuevo como para migrar el actual.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Limpieza del diseño anterior (obsoleto, ver reporte sección 1)
-- ----------------------------------------------------------------------------
drop view if exists latest_prices cascade;
drop table if exists price_snapshots cascade;
drop table if exists skus cascade;
drop table if exists products cascade;
drop table if exists search_cache cascade;
drop table if exists search_log cascade;

-- Extensión para búsqueda difusa/rápida por nombre de producto (sección 5.2 del reporte)
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- categories: categorías de producto, globales (documento, sección 6)
-- ----------------------------------------------------------------------------
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- stores: fija a los 3 supermercados soportados. Sin household_id — alcance
-- confirmado por el equipo, ver reporte sección 5.3.
-- ----------------------------------------------------------------------------
create table if not exists stores (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug in ('maxipali', 'walmart', 'masxmenos')),
  display_name text not null,
  base_url     text not null
);

insert into stores (slug, display_name, base_url) values
  ('maxipali',  'MaxiPali',            'https://www.maxipali.co.cr/api/catalog_system/pub/products/search'),
  ('walmart',   'Walmart Costa Rica',  'https://www.walmart.co.cr/api/catalog_system/pub/products/search'),
  ('masxmenos', 'MasXMenos',           'https://www.masxmenos.cr/api/catalog_system/pub/products/search')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- household_store_preferences: qué tiendas de las 3 soportadas sigue/muestra
-- cada household (decisión confirmada 2026-08-27 — no son tiendas propias
-- arbitrarias, el scraper no soporta eso). Sin fila = visible por defecto.
-- ----------------------------------------------------------------------------
create table if not exists household_store_preferences (
  household_id  uuid not null, -- FK real hacia households(id) cuando ese módulo exista en este proyecto
  store_id      uuid not null references stores(id) on delete cascade,
  visible       boolean not null default true,
  primary key (household_id, store_id)
);

-- ----------------------------------------------------------------------------
-- product_catalog: "producto madre" (ej. "Leche"), sin marca en su identidad.
-- household_id nullable: NULL = catálogo global, con valor = producto propio
-- de un household (sección 4.5.1 del documento — "mis productos personalizados").
-- ----------------------------------------------------------------------------
create table if not exists product_catalog (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category_id   uuid references categories(id),
  household_id  uuid, -- FK real hacia households(id) cuando ese módulo exista en este proyecto
  source        text not null default 'scraped' check (source in ('scraped', 'manual')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_product_catalog_name_trgm
  on product_catalog using gin (name gin_trgm_ops);

create index if not exists idx_product_catalog_category
  on product_catalog(category_id);

-- ----------------------------------------------------------------------------
-- product_catalog_variants: presentación/tamaño concreto del producto madre
-- (ej. "Leche — caja 1L"), con base_unit/base_quantity normalizada.
-- ----------------------------------------------------------------------------
create table if not exists product_catalog_variants (
  id                 uuid primary key default gen_random_uuid(),
  product_catalog_id uuid not null references product_catalog(id) on delete cascade,
  name               text not null,
  base_unit          text not null check (base_unit in ('ml', 'g', 'unidad')),
  base_quantity      numeric(12,2) not null,
  image_url          text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_variants_product_catalog
  on product_catalog_variants(product_catalog_id);

-- ----------------------------------------------------------------------------
-- product_brands: marca concreta de una variante (ej. "Dos Pinos"), con logo.
-- Vive como detalle, no como variante propia (corrección 2026-08-18, sección 4.5).
-- ----------------------------------------------------------------------------
create table if not exists product_brands (
  id                          uuid primary key default gen_random_uuid(),
  product_catalog_variant_id  uuid not null references product_catalog_variants(id) on delete cascade,
  name                        text not null,
  logo_url                    text,
  created_at                  timestamptz not null default now()
);

create index if not exists idx_brands_variant
  on product_brands(product_catalog_variant_id);

-- ----------------------------------------------------------------------------
-- product_catalog_staging: datos crudos de scraping (marca+tamaño+súper+imagen
-- tal como aparecen en el sitio), antes de normalizar hacia product_catalog /
-- product_catalog_variants / product_brands (sección 4.7 del documento).
-- ----------------------------------------------------------------------------
create table if not exists product_catalog_staging (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references stores(id),
  raw_json            jsonb not null,
  scraped_name        text,
  scraped_brand       text,
  scraped_size_text   text,
  image_url           text,
  status              text not null default 'pending' check (status in ('pending', 'matched', 'rejected')),
  matched_variant_id  uuid references product_catalog_variants(id),
  matched_brand_id    uuid references product_brands(id),
  scraped_at          timestamptz not null default now()
);

create index if not exists idx_staging_status
  on product_catalog_staging(status);

create index if not exists idx_staging_store
  on product_catalog_staging(store_id);

-- ----------------------------------------------------------------------------
-- product_prices: precio de una variante+marca en un súper en una fecha dada.
-- El scraping sigue siendo granular por marca (sección 4.5/4.8 del documento).
-- source: scraped | manual — para no mezclar confianza con "mis productos".
-- ----------------------------------------------------------------------------
create table if not exists product_prices (
  id                          bigserial primary key,
  product_catalog_variant_id  uuid not null references product_catalog_variants(id) on delete cascade,
  product_brand_id            uuid not null references product_brands(id) on delete cascade,
  store_id                    uuid not null references stores(id),
  price                       numeric(12,2) not null,
  list_price                  numeric(12,2),
  is_available                boolean not null default true,
  source                      text not null default 'scraped' check (source in ('scraped', 'manual')),
  captured_at                 timestamptz not null default now()
);

create index if not exists idx_prices_variant_store_latest
  on product_prices(product_catalog_variant_id, store_id, captured_at desc);

-- Último precio conocido por variante+marca+súper (rango mínimo–máximo se
-- calcula en el servicio de lectura, agrupando por variante).
create or replace view latest_prices as
select distinct on (product_catalog_variant_id, product_brand_id, store_id)
  product_catalog_variant_id, product_brand_id, store_id,
  price, list_price, is_available, source, captured_at
from product_prices
order by product_catalog_variant_id, product_brand_id, store_id, captured_at desc;

alter view latest_prices set (security_invoker = true);

-- ----------------------------------------------------------------------------
-- search_cache / search_log: infraestructura de cache-first con TTL de 6h.
-- No son parte del modelo de negocio del documento — ver reporte sección 4.
-- ----------------------------------------------------------------------------
create table if not exists search_cache (
  store_id         uuid not null references stores(id),
  normalized_query text not null,
  staging_ids      uuid[] not null,
  cached_at        timestamptz not null default now(),
  primary key (store_id, normalized_query)
);

create table if not exists search_log (
  id            bigserial primary key,
  store_id      uuid not null references stores(id),
  query         text not null,
  source        text not null check (source in ('cache', 'live', 'stale-cache')),
  result_count  integer not null default 0,
  searched_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table categories                  enable row level security;
alter table stores                      enable row level security;
alter table household_store_preferences enable row level security;
alter table product_catalog             enable row level security;
alter table product_catalog_variants    enable row level security;
alter table product_brands              enable row level security;
alter table product_prices              enable row level security;
alter table product_catalog_staging     enable row level security;
alter table search_cache                enable row level security;
alter table search_log                  enable row level security;

-- Lectura pública del catálogo ya normalizado (consumido vía PostgREST/RPC
-- por el resto de la app, sección 7 del documento).
create policy "public read categories"        on categories               for select using (true);
create policy "public read stores"            on stores                   for select using (true);
create policy "public read product_catalog"   on product_catalog          for select using (true);
create policy "public read variants"          on product_catalog_variants for select using (true);
create policy "public read brands"            on product_brands           for select using (true);
create policy "public read product_prices"    on product_prices           for select using (true);

-- household_store_preferences: lectura/escritura pública temporal (using(true))
-- porque el módulo `households`/auth de otro integrante todavía no existe en
-- este proyecto para poder filtrar por dueño real. TODO del equipo: cuando
-- `households`/`household_members` exista, reemplazar por políticas que
-- verifiquen membresía del household (household_id in (select household_id
-- from household_members where user_id = auth.uid())).
create policy "temp read household_store_preferences"  on household_store_preferences for select using (true);
create policy "temp write household_store_preferences" on household_store_preferences for all    using (true) with check (true);

-- product_catalog_staging, search_cache y search_log NO son de lectura/escritura
-- pública: son datos crudos/infraestructura interna del pipeline de scraping.
-- Solo la Edge Function (con service_role) los toca. Sin políticas -> bloqueados
-- por RLS. Esto es intencional, no un bug (INFO-level en el advisor de Supabase).
