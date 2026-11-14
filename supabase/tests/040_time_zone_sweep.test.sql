-- ============================================================================
-- Barrido de cambios de horario de la migración 040 (SCRUM-91).
--
-- Para cada zona con nombre, busca los días de 1970 a 2035 en que cambia su desfase y,
-- alrededor de su medianoche local, toma instantes cada 5 minutos. Cada uno tiene que
-- caer dentro de su propio día, semana y mes, y el fin de su día tiene que ser el
-- inicio del siguiente. Así D18 siempre revisa el periodo donde cuenta un total.
--
-- Cómo se corre: completo, como dueño de las tablas, después de aplicar 040. Solo lee:
-- termina en rollback y no escribe nada. Tarda unos 2 minutos en un PostgreSQL local;
-- en el SQL Editor puede pasar el tiempo máximo de una sentencia, así que conviene
-- correrlo en local. Si falla, el assert muestra cuántos casos y en qué zonas.
-- ============================================================================

begin;

do $$
declare
  transition_days bigint;
  checked bigint;
  outside bigint;
  not_contiguous bigint;
  zones_outside text;
begin
  with zones as (
    select z.name from pg_catalog.pg_timezone_names z
    where z.name ~ '/' and z.name !~* '^(posix|right)/' and z.name !~ '^(Etc|SystemV)/'
  ),
  days as (
    select zones.name, d::date as day,
      (d + interval '12 hours') at time zone zones.name - (d + interval '12 hours') as noon_offset
    from zones, generate_series('1970-01-01'::timestamp, '2035-12-31', interval '1 day') d
  ),
  changes as (
    select x.name, x.day from (
      select days.name, days.day, days.noon_offset,
        lag(days.noon_offset) over (partition by days.name order by days.day) as previous_offset
      from days
    ) x
    where x.previous_offset is distinct from x.noon_offset and x.previous_offset is not null
  ),
  instants as (
    select c.name, (c.day::timestamp at time zone c.name) + m * interval '5 minutes' as at_instant
    from changes c, generate_series(-36, 36) m
  ),
  checks as (
    select i.name, i.at_instant, s.scope, b.period_start, b.period_end
    from instants i, unnest(array['day', 'week', 'month']) s(scope),
      lateral public.spending_period_bounds(s.scope, i.at_instant, i.name) b
  )
  select
    (select count(*) from changes),
    (select count(*) from checks),
    (select count(*) from checks c where not (c.at_instant >= c.period_start and c.at_instant < c.period_end)),
    (select count(*) from checks c where c.scope = 'day' and not exists (
       select 1 from public.spending_period_bounds('day', c.period_end, c.name) n where n.period_start = c.period_end
    )),
    (select string_agg(distinct c.name, ', ') from checks c
     where not (c.at_instant >= c.period_start and c.at_instant < c.period_end))
  into transition_days, checked, outside, not_contiguous, zones_outside;

  assert transition_days > 0, 'no se encontraron cambios de horario: revisar la base de zonas';
  assert outside = 0, format('%s instantes fuera de su periodo, en: %s', outside, zones_outside);
  assert not_contiguous = 0, format('%s días que no terminan donde empieza el siguiente', not_contiguous);
  raise notice 'días con cambio: %, comprobaciones: %', transition_days, checked;
end $$;

rollback;
