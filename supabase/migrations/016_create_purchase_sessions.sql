-- ============================================================================
-- SCRUM-67 (HU-36f): modo compra — sesiones de compra
--
-- Una compra (purchase_sessions) es "el súper donde estoy comprando hoy".
-- Mismo patrón de dueño que lists (documento-proyecto §6): owner_id siempre,
-- household_id y list_id nullable. Mientras no existan listas de household ni
-- listas privadas, los dos quedan en null (lo exige la política de insert).
--
-- Partes:
-- 1. Tabla purchase_sessions con RLS del dueño y permisos por columna.
-- 2. list_items.purchase_session_id + quantity_bought (lo realmente comprado).
-- 3. El trigger de 015 también limpia y valida esas dos columnas.
-- 4. RPC: iniciar o retomar, tachar dentro de una compra, ajustar lo
--    comprado y cerrar con el total.
-- ============================================================================

create table public.purchase_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  list_id uuid references public.lists (id) on delete set null,
  store_id uuid not null references public.stores (id),
  started_at timestamptz not null default now(),
  -- null = abierta. Se cierra una sola vez (close_purchase_session).
  closed_at timestamptz,
  -- Lo que se gastó, en colones. null = "sin total" (documento-proyecto §4.6):
  -- se puede cerrar sin ponerlo. Solo tiene sentido en una compra cerrada.
  total_amount numeric(12, 2) check (total_amount >= 0),
  check (total_amount is null or closed_at is not null)
);

-- Lo que busca start_purchase_session: la compra abierta del dueño en un súper.
create index purchase_sessions_owner_store_started_idx
  on public.purchase_sessions (owner_id, store_id, started_at desc);

create index purchase_sessions_list_id_idx on public.purchase_sessions (list_id);
create index purchase_sessions_household_id_idx on public.purchase_sessions (household_id);
create index purchase_sessions_store_id_idx on public.purchase_sessions (store_id);

-- ----------------------------------------------------------------------------
-- RLS: nace activado (deny por defecto). Solo el dueño ve y cambia sus compras.
-- Los permisos por columna dicen QUÉ se puede escribir; las políticas, en QUÉ filas.
-- ----------------------------------------------------------------------------

alter table public.purchase_sessions enable row level security;

revoke all on public.purchase_sessions from anon, authenticated;
grant select on public.purchase_sessions to authenticated;
-- owner_id y started_at salen de sus defaults: el cliente solo elige el súper.
grant insert (store_id) on public.purchase_sessions to authenticated;
grant update (closed_at, total_amount) on public.purchase_sessions to authenticated;

create policy "owner reads own purchase sessions"
  on public.purchase_sessions for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- household_id y list_id en null: todavía no existen compras de household ni
-- de listas privadas (HU-36f CA-08 fuera de alcance). Nace abierta y sin total.
create policy "owner starts own purchase sessions"
  on public.purchase_sessions for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and household_id is null
    and list_id is null
    and closed_at is null
    and total_amount is null
  );

-- Solo una compra abierta se puede cambiar: una cerrada queda como quedó.
create policy "owner closes own open purchase sessions"
  on public.purchase_sessions for update
  to authenticated
  using (owner_id = (select auth.uid()) and closed_at is null)
  with check (owner_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- list_items: en qué compra se compró y cuánto se compró de verdad
-- (documento-proyecto §4.2: "se distingue cantidad pedida de cantidad
-- realmente comprada"). Las dos van juntas: una fila comprada en una compra
-- tiene las dos; una fila pendiente o tachada fuera de modo compra, ninguna.
-- ----------------------------------------------------------------------------

alter table public.list_items
  add column purchase_session_id uuid references public.purchase_sessions (id) on delete set null,
  add column quantity_bought integer check (quantity_bought >= 1),
  add constraint list_items_purchase_pair_check
    check ((purchase_session_id is null) = (quantity_bought is null));

create index list_items_purchase_session_id_idx on public.list_items (purchase_session_id);

grant update (purchase_session_id, quantity_bought) on public.list_items to authenticated;

-- ----------------------------------------------------------------------------
-- stamp_list_item_check (015), extendido:
-- - destachar también borra la compra y lo comprado;
-- - si la fila pasa a una compra, esa compra tiene que ser del que llama y
--   estar abierta. La FK no mira RLS: sin esta validación, un PATCH a mano
--   podría colgar una fila propia de la compra de otra persona.
-- ----------------------------------------------------------------------------

create or replace function public.stamp_list_item_check()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.checked_at is null then
    new.checked_by := null;
    new.purchase_session_id := null;
    new.quantity_bought := null;
  elsif tg_op = 'UPDATE' and old.checked_at is not null then
    new.checked_at := old.checked_at;
    new.checked_by := old.checked_by;
  else
    new.checked_at := now();
    new.checked_by := auth.uid();
  end if;

  if new.purchase_session_id is not null
    and (tg_op = 'INSERT' or new.purchase_session_id is distinct from old.purchase_session_id) then
    -- security invoker: RLS ya esconde las compras ajenas; el owner_id lo deja explícito.
    if not exists (
      select 1 from public.purchase_sessions s
      where s.id = new.purchase_session_id
        and s.owner_id = (select auth.uid())
        and s.closed_at is null
    ) then
      raise exception 'Esa compra no está abierta'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- start_purchase_session: retoma la compra abierta del que llama en ese súper
-- iniciada desde local_day_start (la medianoche local, la calcula el cliente
-- como en SCRUM-66); si no hay, crea una. HU-36f CA-05.
-- ----------------------------------------------------------------------------

create or replace function public.start_purchase_session(target_store_id uuid, local_day_start timestamptz)
returns public.purchase_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  found_session public.purchase_sessions;
begin
  if current_user_id is null then
    raise exception 'Se requiere una sesión para iniciar una compra'
      using errcode = '42501';
  end if;

  -- Una medianoche de cualquier zona horaria cae dentro de las últimas 36 horas.
  -- Fuera de eso no es "hoy": se rechaza en vez de retomar una compra vieja.
  if local_day_start is null or local_day_start > now() or local_day_start < now() - interval '36 hours' then
    raise exception 'Inicio de día inválido'
      using errcode = '22023';
  end if;

  -- Dos pestañas que inician a la vez se ordenan: la segunda ve la compra que
  -- creó la primera. Bloqueo de transacción por usuario, se suelta al terminar.
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  select s.* into found_session
  from public.purchase_sessions s
  where s.owner_id = current_user_id
    and s.store_id = target_store_id
    and s.closed_at is null
    and s.started_at >= local_day_start
  order by s.started_at desc
  limit 1;

  if found_session.id is null then
    insert into public.purchase_sessions (store_id)
    values (target_store_id)
    returning * into found_session;
  end if;

  return found_session;
end;
$$;

revoke execute on function public.start_purchase_session(uuid, timestamptz) from public, anon;
grant execute on function public.start_purchase_session(uuid, timestamptz) to authenticated;

-- ----------------------------------------------------------------------------
-- check_list_item_in_session: tachar en modo compra. Tacha la fila (si ya
-- estaba tachada conserva su hora, trigger), la asocia a la compra y lo
-- comprado arranca igual a lo pedido. El trigger valida la compra.
-- ----------------------------------------------------------------------------

create or replace function public.check_list_item_in_session(target_item_id uuid, target_session_id uuid)
returns public.list_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  checked_item public.list_items;
begin
  update public.list_items
  set checked_at = coalesce(checked_at, now()),
      purchase_session_id = target_session_id,
      quantity_bought = coalesce(quantity_bought, quantity_requested)
  where id = target_item_id
  returning * into checked_item;

  if checked_item.id is null then
    raise exception 'El producto no está en tu lista'
      using errcode = 'P0002';
  end if;

  return checked_item;
end;
$$;

revoke execute on function public.check_list_item_in_session(uuid, uuid) from public, anon;
grant execute on function public.check_list_item_in_session(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- change_bought_quantity: como change_item_quantity (005), sobre lo comprado.
-- Solo ±1 y solo mientras la compra de la fila esté abierta. El mínimo de 1
-- lo garantiza el check de quantity_bought.
-- ----------------------------------------------------------------------------

create or replace function public.change_bought_quantity(target_item_id uuid, quantity_delta integer)
returns public.list_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_item public.list_items;
begin
  if quantity_delta not in (-1, 1) then
    raise exception 'La cantidad solo cambia de a 1'
      using errcode = '22023';
  end if;

  update public.list_items li
  set quantity_bought = li.quantity_bought + quantity_delta
  where li.id = target_item_id
    and exists (
      select 1 from public.purchase_sessions s
      where s.id = li.purchase_session_id and s.closed_at is null
    )
  returning li.* into changed_item;

  if changed_item.id is null then
    raise exception 'El producto no está en una compra abierta'
      using errcode = 'P0002';
  end if;

  return changed_item;
end;
$$;

revoke execute on function public.change_bought_quantity(uuid, integer) from public, anon;
grant execute on function public.change_bought_quantity(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- close_purchase_session: cierra la compra con el total (o sin él). La política
-- de update solo deja tocar una compra propia y abierta: cerrar dos veces no
-- encuentra la fila.
-- ----------------------------------------------------------------------------

create or replace function public.close_purchase_session(target_session_id uuid, spent_total numeric)
returns public.purchase_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  closed_session public.purchase_sessions;
begin
  update public.purchase_sessions
  set closed_at = now(),
      total_amount = spent_total
  where id = target_session_id
  returning * into closed_session;

  if closed_session.id is null then
    raise exception 'Esa compra no está abierta'
      using errcode = 'P0002';
  end if;

  return closed_session;
end;
$$;

revoke execute on function public.close_purchase_session(uuid, numeric) from public, anon;
grant execute on function public.close_purchase_session(uuid, numeric) to authenticated;
