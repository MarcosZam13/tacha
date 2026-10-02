-- ============================================================================
-- SCRUM-94 (HU-63): catálogo de recetas — tablas recipes + recipe_ingredients
--
-- Modelo según docs/documento-proyecto.md §6. Mismo patrón de dueño que lists:
-- owner_id siempre presente y household_id nullable. household_id queda sin
-- FK porque la tabla households todavía no existe; la FK y las políticas de
-- miembros se agregan cuando exista (ver features/recipes/specs/plan.md).
-- ============================================================================

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  household_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  base_servings integer not null check (base_servings between 1 and 50),
  image_url text,
  created_at timestamptz not null default now()
);

create index recipes_owner_id_idx on public.recipes (owner_id);

-- Un ingrediente apunta al producto madre (product_catalog), no a una
-- variante: la receta pide "500 ml de leche", no "una caja de 1 L". La
-- presentación se decide al comprar (documento-proyecto §4.9.1).
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  product_catalog_id uuid not null references public.product_catalog (id),
  quantity_value numeric not null check (quantity_value > 0),
  -- Mismas unidades base que product_catalog_variants.base_unit: sin eso no
  -- se puede sumar contra la lista (SCRUM-97).
  quantity_unit text not null check (quantity_unit in ('ml', 'g', 'unidad')),
  -- Orden en que se cargó el ingrediente: define cuáles son los "principales".
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (recipe_id, product_catalog_id)
);

create index recipe_ingredients_product_catalog_id_idx
  on public.recipe_ingredients (product_catalog_id);

-- ----------------------------------------------------------------------------
-- RLS: nace activado y sin políticas (deny por defecto); esta historia solo
-- abre la lectura. Crear y editar llegan en SCRUM-95, eliminar en SCRUM-96.
-- ----------------------------------------------------------------------------

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

-- Defensa en profundidad: anon no tiene políticas (RLS ya le niega todo),
-- pero tampoco conserva los permisos de tabla que Supabase da por defecto.
revoke all on public.recipes, public.recipe_ingredients from anon;

-- Cuando exista households se agrega otra política de select para miembros;
-- Postgres combina las políticas con OR, así que esta no cambia.
create policy "owner reads own recipes"
  on public.recipes for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "owner reads ingredients of own recipes"
  on public.recipe_ingredients for select
  to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id and r.owner_id = (select auth.uid())
    )
  );
