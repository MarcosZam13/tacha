-- ============================================================================
-- SCRUM-91 (HU-60): editar el total de una compra o de un periodo
--
-- Contrato y reglas: features/finance/specs/SPEC.md §5 (reglas 32 a 60) y §12.
--
-- Partes:
-- 1. stamp_purchase_session_close conserva el closed_at de una compra cerrada.
-- 2. Tabla spending_time_zones: la zona confirmada por cada persona. Es la única
--    referencia de sus periodos: el navegador no la cambia. No hay backfill: sin
--    confirmación no hay fila, porque ningún dato existente dice cuál es su zona.
-- 3. Tabla spending_adjustments: los ajustes manuales de un periodo (D10).
-- 4. Funciones internas: zona, límites, total y revisión de negativos.
-- 5. get_spending_period_bounds: los límites del periodo según la zona guardada.
-- 6. get_period_finance: límites, compras, ajustes y total del periodo, en una sola
--    lectura coherente.
-- 7. set_spending_time_zone: confirma o cambia la zona, si ningún periodo con
--    ajustes queda negativo en ella.
-- 8. set_purchase_session_total: edita el total de una compra cerrada propia.
-- 9. set_period_total: crea, reemplaza o quita el ajuste del periodo en curso.
--
-- D18 (regla 54): las únicas escrituras que pueden bajar un total son las de esta
-- migración, y todas revisan los periodos afectados en la misma transacción y bajo
-- el mismo bloqueo por usuario. Cerrar una compra solo suma.
--
-- Número 040: el reservado para esta historia.
--
-- No cambia los permisos ni las políticas de purchase_sessions: un PATCH directo
-- sobre una compra cerrada sigue sin encontrar la fila. Las RPC son security
-- definer porque la política de update de 016 solo acepta compras abiertas; abrirla
-- dejaría cambiar closed_at o vaciar el total por API, con el permiso de columna
-- que ya existe.
--
-- Errores: sin cuenta registrada, 42501. Parámetros inválidos, 22023. Sin zona
-- confirmada, TZ001. Zona guardada que PostgreSQL ya no reconoce, TZ002. Compra
-- inexistente, ajena o abierta, P0002. Dejaría un periodo con ajustes en negativo,
-- 23514. Un periodo que ya era negativo no se oculta ni se agrava: toda operación que
-- lo toque se rechaza (regla 60).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Sin esto, cualquier update de una compra cerrada la movería a hoy: el trigger
-- de 018 ponía now() siempre que closed_at no fuera nulo. Cerrar sigue igual.
-- ----------------------------------------------------------------------------

create or replace function public.stamp_purchase_session_close()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.closed_at is not null then
    new.closed_at := old.closed_at;
  elsif new.closed_at is not null then
    new.closed_at := now();
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. La zona de cada persona (regla 59). El cliente solo la lee; escribirla es solo
-- por set_spending_time_zone, una acción explícita.
-- ----------------------------------------------------------------------------

create table public.spending_time_zones (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  time_zone text not null
);

alter table public.spending_time_zones enable row level security;

revoke all on public.spending_time_zones from public, anon, authenticated;
grant select on public.spending_time_zones to authenticated;

create policy "registered owner reads own time zone"
  on public.spending_time_zones for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );

-- ----------------------------------------------------------------------------
-- 3. Ajustes manuales. Un ajuste es la diferencia entre el total que escribió la
-- persona y el total calculado de un periodo; las compras no cambian (D10). Cuenta
-- en su nivel y en los mayores que contienen effective_at (regla 52). Sus periodos
-- no se guardan: salen de effective_at y de la zona de su dueño, así que cambiar de
-- zona no deja datos viejos.
-- ----------------------------------------------------------------------------

create table public.spending_adjustments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Los mismos valores que SPENDING_PERIOD en features/finance/constants/.
  scope text not null check (scope in ('day', 'week', 'month')),
  effective_at timestamptz not null,
  -- Con signo y con centavos: una compra antigua puede tener decimales, y el
  -- periodo tiene que dar exactamente lo que se escribió. Un ajuste de 0 no existe:
  -- se quita la fila (regla 50). Mayor que total_amount porque suma muchas compras.
  amount numeric(18, 2) not null check (amount <> 'NaN' and amount <> 0)
);

-- Lo que pide Finanzas y la FK de owner_id: los ajustes de un dueño por fecha.
create index spending_adjustments_owner_effective_idx
  on public.spending_adjustments (owner_id, effective_at);

-- Cada revisión de D18 suma las compras de un dueño en un periodo. Sin este índice,
-- cambiar de zona recorre todas las compras por cada periodo con ajustes: con diez
-- años de datos tardaba unos 4 segundos en local. No cambia permisos ni políticas.
create index purchase_sessions_owner_closed_idx
  on public.purchase_sessions (owner_id, closed_at);

alter table public.spending_adjustments enable row level security;

revoke all on public.spending_adjustments from public, anon, authenticated;
grant select on public.spending_adjustments to authenticated;

-- Misma condición que spending_budgets (027): dueño y sesión no anónima.
create policy "registered owner reads own adjustments"
  on public.spending_adjustments for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );

-- ----------------------------------------------------------------------------
-- 4. Funciones internas. Sin execute para el cliente: las llaman solo las RPC, que
-- corren como dueño de las tablas. Supabase da execute por defecto en public, por
-- eso se revoca también a authenticated.
-- ----------------------------------------------------------------------------

-- Lanza 42501 sin cuenta registrada y devuelve el id de quien llama. El dueño
-- siempre sale de acá, nunca del cliente.
create function public.require_registered_user()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada'
      using errcode = '42501';
  end if;

  return current_user_id;
end;
$$;

-- Colones enteros de 0 a 9.999.999.999 (regla 46), o 22023.
create function public.assert_valid_spending_total(spending_total numeric)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  -- El NaN primero: cualquier comparación con NaN da un resultado engañoso.
  if spending_total is null
    or spending_total = 'NaN'
    or spending_total < 0
    or spending_total > 9999999999
    or spending_total <> trunc(spending_total) then
    raise exception 'Total inválido'
      using errcode = '22023';
  end if;
end;
$$;

-- Una zona con nombre que PostgreSQL reconozca, o 22023 (regla 58). No se concatena
-- en ningún SQL. No se usa pg_timezone_names porque carga todas las zonas en cada
-- llamada (unos 40 ms medidos). La forma descarta lo que `at time zone` aceptaría sin
-- ser una zona con nombre, como 'UTC+5' o 'CST', y las copias posix/ y right/, que
-- pueden mover los límites unos segundos.
create function public.assert_valid_time_zone(time_zone_name text)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if time_zone_name is null
    or time_zone_name !~ '^(UTC|GMT|[A-Za-z_]+(/[A-Za-z0-9_+-]+){1,2})$'
    or time_zone_name ~* '^(posix|right)/' then
    raise exception 'Zona horaria desconocida'
      using errcode = '22023';
  end if;

  perform now() at time zone time_zone_name;
exception
  when invalid_parameter_value then
    raise exception 'Zona horaria desconocida'
      using errcode = '22023';
end;
$$;

-- Un nivel de periodo válido, o 22023.
create function public.assert_valid_period_scope(period_scope text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if period_scope is null or period_scope not in ('day', 'week', 'month') then
    raise exception 'Periodo inválido'
      using errcode = '22023';
  end if;

  return period_scope;
end;
$$;

-- El inicio de una lectura: quien llama (42501) y después el nivel (22023), en ese
-- orden. Se usa como fuente de filas porque, en la lista de un select, PostgreSQL puede
-- evaluar antes una función con un argumento constante al planificar, y un anónimo
-- vería 22023 en vez de 42501.
create function public.start_period_read(target_scope text)
returns table (owner_id uuid, period_scope text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := public.require_registered_user();
begin
  return query select current_user_id, public.assert_valid_period_scope(target_scope);
end;
$$;

-- La zona guardada de una persona, o null si no confirmó ninguna. TZ002 si PostgreSQL
-- ya no la reconoce: ahí sí puede haber ajustes, y no se cae a ninguna otra zona.
create function public.find_spending_time_zone(target_owner_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  stored_time_zone text;
begin
  select t.time_zone into stored_time_zone
  from public.spending_time_zones t
  where t.owner_id = target_owner_id;

  if stored_time_zone is null then
    return null;
  end if;

  begin
    perform public.assert_valid_time_zone(stored_time_zone);
  exception
    when invalid_parameter_value then
      raise exception 'La zona horaria guardada ya no se reconoce'
        using errcode = 'TZ002';
  end;

  return stored_time_zone;
end;
$$;

-- La zona guardada, o TZ001 si no confirmó ninguna (TZ002 si no se reconoce). La salida
-- de los dos es confirmar una zona con set_spending_time_zone.
create function public.require_spending_time_zone(target_owner_id uuid)
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  stored_time_zone text := public.find_spending_time_zone(target_owner_id);
begin
  if stored_time_zone is null then
    raise exception 'Falta confirmar la zona horaria'
      using errcode = 'TZ001';
  end if;

  return stored_time_zone;
end;
$$;

-- El instante en que empieza una hora local. Si el horario retrocede justo ahí, como en
-- La Habana, esa hora ocurre dos veces y `at time zone` da la segunda: los instantes de
-- la primera quedarían fuera de su propio periodo y D18 no los revisaría. Se usa
-- siempre la primera, así un fin coincide con el inicio siguiente.
--
-- Sirve para un retroceso de cualquier duración: se prueba la hora con el desfase de
-- un día antes y con el de un día después, y gana el instante más antiguo que de
-- verdad es esa hora local. Si la hora no existe (un salto adelante, o el día que
-- Samoa se saltó en 2011), queda el instante que da `at time zone`, que es el mismo
-- para el fin de un periodo y el inicio del siguiente.
create function public.spending_local_time_instant(local_time timestamp, time_zone_name text)
returns timestamptz
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  resolved_instant timestamptz := local_time at time zone time_zone_name;
  earliest_instant timestamptz := resolved_instant;
  probe_instant timestamptz;
  candidate_instant timestamptz;
begin
  -- 24 horas exactas: un día de calendario dependería de la zona de la sesión.
  foreach probe_instant in array array[resolved_instant - interval '24 hours', resolved_instant + interval '24 hours'] loop
    -- local_time menos el desfase que regía en probe_instant, como instante.
    candidate_instant := (
      local_time - ((probe_instant at time zone time_zone_name) - (probe_instant at time zone 'UTC'))
    ) at time zone 'UTC';

    if candidate_instant at time zone time_zone_name = local_time and candidate_instant < earliest_instant then
      earliest_instant := candidate_instant;
    end if;
  end loop;

  return earliest_instant;
end;
$$;

-- El periodo que contiene un instante (regla 8): inicio incluido y fin excluido,
-- semana de lunes a lunes (date_trunc('week') empieza en lunes) y mes del día 1 al
-- día 1 siguiente. Se suma sobre la hora local para no depender de cambios de horario.
--
-- La fecha local de un instante no siempre alcanza: si el horario retrocede después de
-- medianoche (Terranova lo hacía a las 00:01) o cruzándola (Casey, en la Antártida,
-- retrocedió 3 horas), la fecha local vuelve a ser la de ayer un rato. Como el fin de
-- cada periodo es el inicio del siguiente, se avanza o retrocede un periodo hasta el
-- que de verdad contiene al instante: así D18 revisa siempre el periodo donde cuenta.
create function public.spending_period_bounds(period_scope text, at_instant timestamptz, time_zone_name text)
returns table (period_start timestamptz, period_end timestamptz)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  period_length interval := case period_scope
    when 'day' then interval '1 day'
    when 'week' then interval '7 days'
    else interval '1 month'
  end;
  local_start timestamp := date_trunc(
    case period_scope when 'day' then 'day' when 'week' then 'week' else 'month' end,
    at_instant at time zone time_zone_name
  );
  start_instant timestamptz;
  end_instant timestamptz;
begin
  -- Un cambio de horario mueve a lo sumo un periodo; tres pasos sobran.
  for step in 1..3 loop
    start_instant := public.spending_local_time_instant(local_start, time_zone_name);
    end_instant := public.spending_local_time_instant(local_start + period_length, time_zone_name);

    if at_instant >= end_instant then
      local_start := local_start + period_length;
    elsif at_instant < start_instant then
      local_start := local_start - period_length;
    else
      return query select start_instant, end_instant;
      return;
    end if;
  end loop;

  raise exception 'No se encontró el periodo de %', at_instant
    using errcode = 'XX000';
end;
$$;

-- Compras con total + ajustes que cuentan en el periodo (reglas 49 y 52).
create function public.spending_period_total(
  target_owner_id uuid,
  period_scope text,
  bound_start timestamptz,
  bound_end timestamptz
)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((
      select sum(s.total_amount)
      from public.purchase_sessions s
      where s.owner_id = target_owner_id
        and s.closed_at >= bound_start
        and s.closed_at < bound_end
    ), 0)
    + coalesce((
      select sum(a.amount)
      from public.spending_adjustments a
      where a.owner_id = target_owner_id
        and a.effective_at >= bound_start
        and a.effective_at < bound_end
        and array_position(array['day', 'week', 'month'], a.scope)
          <= array_position(array['day', 'week', 'month'], period_scope)
    ), 0);
$$;

-- Lanza 23514 si el día, la semana o el mes que contienen un instante, con ajustes
-- que cuenten, quedó en negativo (D18, regla 54). Sin ajustes, un total es una suma de
-- montos no negativos. Corre después de escribir: el error deshace la escritura.
create function public.assert_adjusted_periods_not_negative(
  target_owner_id uuid,
  at_instant timestamptz,
  time_zone_name text
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  period_scope text;
  bound_start timestamptz;
  bound_end timestamptz;
begin
  foreach period_scope in array array['day', 'week', 'month'] loop
    select b.period_start, b.period_end into bound_start, bound_end
    from public.spending_period_bounds(period_scope, at_instant, time_zone_name) b;

    if exists (
      select 1 from public.spending_adjustments a
      where a.owner_id = target_owner_id
        and a.effective_at >= bound_start
        and a.effective_at < bound_end
        and array_position(array['day', 'week', 'month'], a.scope)
          <= array_position(array['day', 'week', 'month'], period_scope)
    ) and public.spending_period_total(target_owner_id, period_scope, bound_start, bound_end) < 0 then
      raise exception 'Ese total dejaría un periodo en negativo'
        using errcode = '23514';
    end if;
  end loop;
end;
$$;

revoke execute on function public.require_registered_user() from public, anon, authenticated;
revoke execute on function public.assert_valid_spending_total(numeric) from public, anon, authenticated;
revoke execute on function public.assert_valid_time_zone(text) from public, anon, authenticated;
revoke execute on function public.assert_valid_period_scope(text) from public, anon, authenticated;
revoke execute on function public.start_period_read(text) from public, anon, authenticated;
revoke execute on function public.find_spending_time_zone(uuid) from public, anon, authenticated;
revoke execute on function public.require_spending_time_zone(uuid) from public, anon, authenticated;
revoke execute on function public.spending_local_time_instant(timestamp, text) from public, anon, authenticated;
revoke execute on function public.spending_period_bounds(text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.spending_period_total(uuid, text, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.assert_adjusted_periods_not_negative(uuid, timestamptz, text)
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. get_spending_period_bounds: los límites del periodo en curso según la zona
-- guardada, para que el Dashboard y el Historial lean los mismos periodos que usan
-- las RPC, sin importar dónde esté el navegador.
-- ----------------------------------------------------------------------------

create function public.get_spending_period_bounds(target_scope text)
returns table (period_start timestamptz, period_end timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := public.require_registered_user();
begin
  perform public.assert_valid_period_scope(target_scope);

  return query
  select b.period_start, b.period_end
  from public.spending_period_bounds(target_scope, now(), public.require_spending_time_zone(current_user_id)) b;
end;
$$;

revoke execute on function public.get_spending_period_bounds(text) from public, anon;
grant execute on function public.get_spending_period_bounds(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. get_period_finance: lo que dibujan el Dashboard y el Historial, en una sola
-- sentencia. Como es una sola sentencia, ve una sola foto de la base: límites,
-- compras, ajustes y total son del mismo momento, aunque otra transacción guarde un
-- total en el medio. Las funciones que llama son estables: no toman otra foto.
--
-- "Ahora" es now(), una sola vez, para todo el resultado. Sin zona confirmada no hay
-- ajustes (regla 59): responde time_zone null, sin límites, compras ni total, y la
-- pantalla lee como antes. Con una zona que PostgreSQL ya no reconoce, TZ002: ahí sí
-- puede haber ajustes, y no se cae a ninguna otra zona.
-- ----------------------------------------------------------------------------

create function public.get_period_finance(target_scope text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with request as (
    select start.owner_id, start.period_scope, now() as at_instant
    from public.start_period_read(target_scope) start
  ),
  zone as (
    select r.owner_id, r.period_scope, r.at_instant, public.find_spending_time_zone(r.owner_id) as time_zone
    from request r
  ),
  period as (
    select z.owner_id, z.period_scope, z.time_zone, b.period_start, b.period_end
    from zone z
    -- Sin zona no se calculan límites: el filtro va adentro, antes de llamar la función.
    left join lateral (
      select bounds.period_start, bounds.period_end
      from public.spending_period_bounds(z.period_scope, z.at_instant, z.time_zone) bounds
      where z.time_zone is not null
    ) b on true
  ),
  purchases as (
    select
      s.id,
      s.closed_at,
      s.total_amount,
      -- Regla 29: un nombre nulo o en blanco llega como null; la fila se conserva.
      nullif(btrim(st.display_name), '') as store_name
    from period p
    join public.purchase_sessions s
      on s.owner_id = p.owner_id
      and s.closed_at >= p.period_start
      and s.closed_at < p.period_end
    left join public.stores st on st.id = s.store_id
  ),
  adjustments as (
    select a.id, a.scope, a.effective_at, a.amount
    from period p
    join public.spending_adjustments a
      on a.owner_id = p.owner_id
      and a.effective_at >= p.period_start
      and a.effective_at < p.period_end
      and array_position(array['day', 'week', 'month'], a.scope)
        <= array_position(array['day', 'week', 'month'], p.period_scope)
  )
  select jsonb_build_object(
    'time_zone', p.time_zone,
    'period_start', p.period_start,
    'period_end', p.period_end,
    'purchases', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', x.id, 'closed_at', x.closed_at, 'total_amount', x.total_amount, 'store_name', x.store_name
        )
        order by x.closed_at desc, x.id
      )
      from purchases x
    ), '[]'::jsonb),
    'adjustments', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', y.id, 'scope', y.scope, 'effective_at', y.effective_at, 'amount', y.amount)
        order by y.effective_at, y.id
      )
      from adjustments y
    ), '[]'::jsonb),
    'total', case when p.time_zone is not null then
      coalesce((select sum(x.total_amount) from purchases x), 0)
        + coalesce((select sum(y.amount) from adjustments y), 0)
    end,
    'closed_count', (select count(*) from purchases x where x.total_amount is not null),
    'without_total_count', (select count(*) from purchases x where x.total_amount is null),
    'adjustment_count', (select count(*) from adjustments y)
  )
  from period p;
$$;

revoke execute on function public.get_period_finance(text) from public, anon;
grant execute on function public.get_period_finance(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. set_spending_time_zone: confirma la zona o la cambia. La llama solo una acción
-- explícita de la persona; nada la asigna solo. Con otra zona, los ajustes de siempre
-- caen en otros periodos, así que se revisan todos los periodos que tienen algún
-- ajuste, cada uno una sola vez: si alguno queda negativo, el error deshace el cambio
-- y sigue la zona anterior. También es la salida si PostgreSQL deja de reconocer la
-- zona guardada, porque no la necesita.
--
-- Bloqueo por usuario (el mismo de start_purchase_session y de las demás RPC de acá),
-- tomado antes de leer y conservado hasta terminar la transacción: ninguna otra
-- escritura de esta historia puede cambiar un total mientras este se revisa.
-- ----------------------------------------------------------------------------

create function public.set_spending_time_zone(new_time_zone text)
returns public.spending_time_zones
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := public.require_registered_user();
  saved_time_zone public.spending_time_zones;
  adjusted_period record;
begin
  perform public.assert_valid_time_zone(new_time_zone);

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  insert into public.spending_time_zones (owner_id, time_zone)
  values (current_user_id, new_time_zone)
  on conflict (owner_id) do update
    set time_zone = excluded.time_zone
  returning * into saved_time_zone;

  -- Cada periodo de la zona nueva en el que cuenta algún ajuste (regla 52), una vez.
  for adjusted_period in
    select distinct levels.period_scope, b.period_start, b.period_end
    from public.spending_adjustments a
    cross join unnest(array['day', 'week', 'month']) as levels (period_scope)
    cross join lateral public.spending_period_bounds(levels.period_scope, a.effective_at, new_time_zone) b
    where a.owner_id = current_user_id
      and array_position(array['day', 'week', 'month'], a.scope)
        <= array_position(array['day', 'week', 'month'], levels.period_scope)
  loop
    if public.spending_period_total(
      current_user_id, adjusted_period.period_scope, adjusted_period.period_start, adjusted_period.period_end
    ) < 0 then
      raise exception 'Ese total dejaría un periodo en negativo'
        using errcode = '23514';
    end if;
  end loop;

  return saved_time_zone;
end;
$$;

revoke execute on function public.set_spending_time_zone(text) from public, anon;
grant execute on function public.set_spending_time_zone(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. set_purchase_session_total: cualquier compra cerrada propia, sin límite de
-- fecha (regla 48). D15 restringe el total del periodo, no las compras.
-- ----------------------------------------------------------------------------

create function public.set_purchase_session_total(target_session_id uuid, new_total numeric)
returns public.purchase_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := public.require_registered_user();
  stored_time_zone text;
  saved_session public.purchase_sessions;
begin
  perform public.assert_valid_spending_total(new_total);

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  stored_time_zone := public.require_spending_time_zone(current_user_id);

  -- Mismo error si es ajena, abierta o inexistente: no revela que exista.
  select s.* into saved_session
  from public.purchase_sessions s
  where s.id = target_session_id
    and s.owner_id = current_user_id
    and s.closed_at is not null
  for update;

  if saved_session.id is null then
    raise exception 'Esa compra no está disponible'
      using errcode = 'P0002';
  end if;

  update public.purchase_sessions s
  set total_amount = new_total
  where s.id = saved_session.id
  returning s.* into saved_session;

  perform public.assert_adjusted_periods_not_negative(current_user_id, saved_session.closed_at, stored_time_zone);

  return saved_session;
end;
$$;

revoke execute on function public.set_purchase_session_total(uuid, numeric) from public, anon;
grant execute on function public.set_purchase_session_total(uuid, numeric) to authenticated;

-- ----------------------------------------------------------------------------
-- 9. set_period_total: el periodo en curso, calculado acá (D15): el cliente manda el
-- total deseado, nunca la diferencia ni los límites (regla 51). Devuelve el ajuste
-- guardado, o ninguna fila si la diferencia dio 0 y se quitó (regla 50).
--
-- Reemplazar conserva la fecha del ajuste, así que sigue contando en los mismos
-- periodos: una semana que cruza meses no le quita el ajuste al mes anterior. Cambiar
-- de zona puede dejar dos ajustes del mismo nivel en un periodo; esta operación los
-- une en el más antiguo.
--
-- "Ahora" es la hora real después de tomar el bloqueo (clock_timestamp), no la del
-- inicio de la transacción (now()): una llamada que empezó antes de medianoche y
-- esperó el bloqueo edita el periodo de cuando de verdad se guarda.
-- ----------------------------------------------------------------------------

create function public.set_period_total(target_scope text, target_total numeric)
returns setof public.spending_adjustments
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := public.require_registered_user();
  stored_time_zone text;
  bound_start timestamptz;
  bound_end timestamptz;
  previous_amount numeric;
  previous_instants timestamptz[];
  kept_adjustment_id uuid;
  difference numeric;
  current_instant timestamptz;
  affected_instant timestamptz;
  saved_adjustment public.spending_adjustments;
begin
  perform public.assert_valid_period_scope(target_scope);

  perform public.assert_valid_spending_total(target_total);

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  current_instant := clock_timestamp();
  stored_time_zone := public.require_spending_time_zone(current_user_id);

  select b.period_start, b.period_end into bound_start, bound_end
  from public.spending_period_bounds(target_scope, current_instant, stored_time_zone) b;

  select
    coalesce(sum(a.amount), 0),
    coalesce(array_agg(a.effective_at), array[]::timestamptz[]),
    (array_agg(a.id order by a.effective_at, a.id))[1]
  into previous_amount, previous_instants, kept_adjustment_id
  from public.spending_adjustments a
  where a.owner_id = current_user_id
    and a.scope = target_scope
    and a.effective_at >= bound_start
    and a.effective_at < bound_end;

  difference := target_total
    - (public.spending_period_total(current_user_id, target_scope, bound_start, bound_end) - previous_amount);

  delete from public.spending_adjustments a
  where a.owner_id = current_user_id
    and a.scope = target_scope
    and a.effective_at >= bound_start
    and a.effective_at < bound_end
    and (difference = 0 or a.id <> kept_adjustment_id);

  if difference <> 0 then
    if kept_adjustment_id is null then
      insert into public.spending_adjustments (owner_id, scope, effective_at, amount)
      values (current_user_id, target_scope, current_instant, difference)
      returning * into saved_adjustment;
    else
      update public.spending_adjustments a
      set amount = difference
      where a.id = kept_adjustment_id
      returning a.* into saved_adjustment;
    end if;
  end if;

  perform public.assert_adjusted_periods_not_negative(current_user_id, current_instant, stored_time_zone);
  foreach affected_instant in array previous_instants loop
    perform public.assert_adjusted_periods_not_negative(current_user_id, affected_instant, stored_time_zone);
  end loop;

  if saved_adjustment.id is not null then
    return next saved_adjustment;
  end if;
end;
$$;

revoke execute on function public.set_period_total(text, numeric) from public, anon;
grant execute on function public.set_period_total(text, numeric) to authenticated;
