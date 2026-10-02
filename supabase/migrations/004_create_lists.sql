-- ============================================================================
-- SCRUM-62 (HU-36a): lista general — tablas lists + list_items y RPC para añadir
--
-- Modelo según docs/documento-proyecto.md §6, solo con las columnas que usa
-- este sprint. household_id queda nullable y sin FK: la tabla households
-- todavía no existe (se construye este sprint); la FK y las políticas de
-- miembros se agregan en esa migración.
-- ============================================================================

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  household_id uuid,
  type text not null check (type in ('general', 'date', 'private')),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Una sola lista general por usuario sin household. Además de la regla de
-- negocio, evita que dos llamadas simultáneas a la RPC creen dos listas.
create unique index lists_one_general_per_owner
  on public.lists (owner_id)
  where type = 'general' and household_id is null;

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  product_catalog_variant_id uuid not null references public.product_catalog_variants (id),
  quantity_requested integer not null default 1 check (quantity_requested >= 1),
  created_at timestamptz not null default now(),
  -- Base de la regla de merge (documento-proyecto §6): misma variante en la
  -- misma lista = una sola fila.
  unique (list_id, product_catalog_variant_id)
);

create index list_items_product_catalog_variant_id_idx
  on public.list_items (product_catalog_variant_id);

-- ----------------------------------------------------------------------------
-- RLS: nace activado y sin políticas (deny por defecto); se abre solo lo que
-- este sprint usa. Eliminar items y listas llega en Sprint 2.
-- ----------------------------------------------------------------------------

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- Defensa en profundidad: anon no tiene políticas (RLS ya le niega todo),
-- pero tampoco conserva los permisos de tabla que Supabase da por defecto.
revoke all on public.lists, public.list_items from anon;

create policy "owner reads own lists"
  on public.lists for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- household_id is null: mientras no existan households nadie puede colgar
-- una lista de un household ajeno mandando el id desde el cliente.
-- type = 'general': este sprint solo existe la lista general (la crea la RPC);
-- las listas por fecha y privadas abren su propio insert cuando existan.
create policy "owner creates own lists"
  on public.lists for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and household_id is null
    and type = 'general'
    and status = 'active'
  );

create policy "owner reads items of own lists"
  on public.list_items for select
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = (select auth.uid())
    )
  );

create policy "owner adds items to own lists"
  on public.list_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = (select auth.uid())
    )
  );

create policy "owner updates items of own lists"
  on public.list_items for update
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- RPC add_item_to_general_list: busca o crea la lista general del usuario y
-- añade la variante; si ya estaba, suma 1 (regla de merge en la base).
-- security invoker: corre con los permisos de quien llama, así que las
-- políticas de arriba siguen siendo el control de acceso.
-- ----------------------------------------------------------------------------

create or replace function public.add_item_to_general_list(target_variant_id uuid)
returns public.list_items
language plpgsql
security invoker
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

  insert into public.lists (owner_id, type)
  values (current_user_id, 'general')
  on conflict (owner_id) where type = 'general' and household_id is null
  do nothing;

  select l.id into general_list_id
  from public.lists l
  where l.owner_id = current_user_id
    and l.type = 'general'
    and l.household_id is null;

  insert into public.list_items (list_id, product_catalog_variant_id)
  values (general_list_id, target_variant_id)
  on conflict (list_id, product_catalog_variant_id)
  do update set quantity_requested = public.list_items.quantity_requested + 1
  returning * into upserted_item;

  return upserted_item;
end;
$$;

revoke execute on function public.add_item_to_general_list(uuid) from public, anon;
grant execute on function public.add_item_to_general_list(uuid) to authenticated;
