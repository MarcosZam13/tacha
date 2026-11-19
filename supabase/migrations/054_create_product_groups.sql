-- ============================================================================
-- SCRUM-109 (HU-72): ver "Mis grupos" — tablas de grupos de productos.
--
-- Un grupo de productos es una lista corta y nombrada de presentaciones del
-- catálogo, cada una con su cantidad por defecto, para agregarlas juntas a la
-- lista (docs/documento-proyecto.md §4.11 y §6). Esta migración crea solo las
-- tablas y la lectura; crear, editar, agregar a la lista y eliminar llegan con
-- HU-73, HU-75, HU-74 y HU-75b.
--
-- Partes:
-- 1. product_groups: mismo patrón de dueño que lists (004/024): owner_id
--    siempre presente y household_id nulo (personal) o el de la familia
--    (compartido).
-- 2. product_group_items: una fila por presentación (variante) del grupo, con
--    su cantidad en unidades de esa presentación, igual que
--    list_items.quantity_requested.
-- 3. RLS y permisos: nacen activados y el cliente solo puede leer. No hay
--    políticas de escritura: crear y editar se hará por funciones que validan
--    quién puede compartir o dejar de compartir, algo que una política de
--    UPDATE no puede comparar (no ve el valor anterior de la fila).
--
-- Contrato: features/product-groups/specs/SPEC.md §12.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. product_groups
-- ----------------------------------------------------------------------------

create table public.product_groups (
  id uuid primary key default gen_random_uuid(),
  -- Quien lo creó. Si sale de la familia, el grupo compartido se queda con la
  -- familia (igual que la lista general) y deja de verlo.
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Nulo = personal. Con valor = compartido con esa familia. Si la familia se
  -- borra, el grupo vuelve a ser personal de su dueño en vez de perderse,
  -- igual que recetas y planes (release_household_personal_data, 024/025).
  household_id uuid references public.households (id) on delete set null,
  -- Sin espacios a los costados y de 1 a 60 caracteres (PRODUCT_GROUP_LIMIT en
  -- features/product-groups/constants/).
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  -- Ordena "Mis grupos" (el último modificado primero). Lo actualizan las
  -- funciones de escritura de HU-73/HU-75, que son el único camino para
  -- escribir.
  updated_at timestamptz not null default now()
);

create index product_groups_owner_id_idx on public.product_groups (owner_id);
create index product_groups_household_id_idx on public.product_groups (household_id);

-- ----------------------------------------------------------------------------
-- 2. product_group_items
-- ----------------------------------------------------------------------------

create table public.product_group_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_groups (id) on delete cascade,
  -- Sin on delete, igual que list_items: borrar un producto que está en un
  -- grupo falla en vez de vaciar el grupo en silencio. Eliminar un producto
  -- personal en uso lo archiva (SCRUM-89); HU-73 suma los grupos a ese chequeo.
  product_catalog_variant_id uuid not null references public.product_catalog_variants (id),
  -- Unidades de esa presentación, de 1 a 99.
  quantity integer not null check (quantity between 1 and 99),
  -- Orden en que se agregaron al grupo.
  position integer not null check (position >= 0),
  -- Una presentación aparece una sola vez por grupo. También es el índice de
  -- la FK de group_id (es su primera columna).
  unique (group_id, product_catalog_variant_id)
);

-- Lo usa el chequeo de "producto en uso" al eliminar un producto personal.
create index product_group_items_variant_id_idx on public.product_group_items (product_catalog_variant_id);

-- ----------------------------------------------------------------------------
-- 3. RLS y permisos: deny por defecto; el cliente solo lee.
-- ----------------------------------------------------------------------------

alter table public.product_groups enable row level security;
alter table public.product_group_items enable row level security;

revoke all on public.product_groups, public.product_group_items from public, anon, authenticated;
grant select on public.product_groups, public.product_group_items to authenticated;

-- Mismo predicado que la lectura de lists (024): el dueño ve sus grupos
-- personales; los miembros de una familia ven los compartidos con ella. Un
-- grupo personal de otro miembro no se ve. Los (select ...) hacen que se
-- evalúe una vez por consulta y no por fila.
create policy "owner or household member reads product groups"
  on public.product_groups for select
  to authenticated
  using (
    (household_id is null and owner_id = (select auth.uid()))
    or household_id in (
      select m.household_id
      from public.household_members m
      where m.user_id = (select auth.uid())
    )
  );

-- Un item se ve si se ve su grupo (la subconsulta pasa por la política de
-- arriba).
create policy "reads items of visible product groups"
  on public.product_group_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.product_groups g
      where g.id = product_group_items.group_id
    )
  );
