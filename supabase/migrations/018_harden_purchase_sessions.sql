-- ============================================================================
-- SCRUM-67 (HU-36f): endurecer las compras de 016 (revisión de seguridad)
--
-- Número 018 y no 017: el 017 lo reservó otra historia (aviso en el grupo,
-- 2026-10-09). No depende de 017 ni 017 de esta.
--
-- 1. Bug: borrar una compra con filas compradas fallaba. La FK de 016 pone
--    purchase_session_id en null (on delete set null) pero deja
--    quantity_bought, y list_items_purchase_pair_check lo rechaza (23514).
--    Hoy no se veía porque al borrar una cuenta se borran antes sus listas;
--    con listas de household fallaría siempre. Ahora lo comprado se va con
--    la compra.
-- 2. closed_at lo pone la base: un PATCH directo ya no puede fechar el
--    cierre en otro momento.
-- 3. Una compra cerrada queda como quedó: sus filas no cambian lo comprado
--    ni se pasan a otra compra. Destachar o volver a añadir la fila sí la
--    sacan de la compra (regla 8 de SCRUM-66); qué hacer con eso es de la
--    historia de Historial de compras (SPEC de shopping-list §14).
-- 4. El total no acepta NaN: numeric lo admite y NaN >= 0 da verdadero.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 y 3. stamp_list_item_check (015, extendido en 016), otra vez extendido.
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

  -- 1. Sin compra no hay "lo comprado". Cubre el set null de la FK cuando
  -- se borra la compra: este trigger también corre en ese update.
  if new.purchase_session_id is null then
    new.quantity_bought := null;
  end if;

  -- 3. Una fila que sigue en una compra cerrada no cambia lo comprado ni se
  -- pasa a otra compra. Sacarla (null) sí se permite (ver encabezado).
  if tg_op = 'UPDATE'
    and old.purchase_session_id is not null
    and new.purchase_session_id is not null
    and (new.purchase_session_id is distinct from old.purchase_session_id
      or new.quantity_bought is distinct from old.quantity_bought)
    and exists (
      select 1 from public.purchase_sessions s
      where s.id = old.purchase_session_id and s.closed_at is not null
    ) then
    raise exception 'Esa compra ya está cerrada'
      using errcode = '42501';
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
-- 2. stamp_purchase_session_close: cerrar pone la hora de la base. La
-- política de update (016) ya solo deja tocar compras abiertas, así que acá
-- solo llega "abierta → cerrada" (o un update que no cierra).
-- ----------------------------------------------------------------------------

create or replace function public.stamp_purchase_session_close()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.closed_at is not null then
    new.closed_at := now();
  end if;
  return new;
end;
$$;

create trigger purchase_sessions_stamp_close
  before update on public.purchase_sessions
  for each row execute function public.stamp_purchase_session_close();

-- ----------------------------------------------------------------------------
-- 4. Sin NaN en el total.
-- ----------------------------------------------------------------------------

alter table public.purchase_sessions
  add constraint purchase_sessions_total_amount_not_nan check (total_amount <> 'NaN');
