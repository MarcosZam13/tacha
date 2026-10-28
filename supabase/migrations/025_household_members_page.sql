-- ============================================================================
-- SCRUM-60 (HU-35): consultar a los integrantes de la familia.
--
-- Agrega get_household_members_page(search_query, page_size, page_offset):
-- los integrantes de la familia de quien llama, de a una página, con búsqueda
-- por nombre. La puede llamar cualquier miembro registrado (decisión de la
-- dueña de la historia, 2026-10-17), y solo devuelve su propia familia.
--
-- No cambia get_household_members() (023): es solo del administrador y la usa
-- el diálogo de salir (SCRUM-58). No crea tablas ni cambia políticas o
-- permisos de tabla: household_members sigue dejando leer solo la fila propia;
-- esta función es la única puerta para ver a los demás.
--
-- Contrato (features/household/specs/SPEC.md §12, SCRUM-60):
--   - devuelve user_id, display_name (nombre del registro, o null), role e
--     is_current_user; nunca el correo ni otros datos de auth.users;
--   - orden estable: el admin primero, después por antigüedad y por user_id,
--     para que ninguna página repita ni salte filas;
--   - búsqueda sin distinguir mayúsculas sobre el nombre recortado; %, _ y \
--     se buscan como texto; vacía o nula = sin filtro; un miembro sin nombre
--     no coincide con ninguna búsqueda;
--   - límites: búsqueda de hasta 60 caracteres (contando los espacios de los
--     extremos), página de 1 a 50, desplazamiento no negativo. Fuera de rango:
--     22023;
--   - sin cuenta registrada (sin sesión o anónima): 42501; sin familia: ninguna
--     fila.
-- ============================================================================

create or replace function public.get_household_members_page(
  search_query text default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (user_id uuid, display_name text, role text, is_current_user boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
-- user_id y role son a la vez columnas de salida y de la tabla: ante un nombre
-- sin calificar, usar la columna. Además todo va calificado con alias (023).
declare
  current_user_id uuid := auth.uid();
  max_search_length constant integer := 60;
  max_page_size constant integer := 50;
  member_household_id uuid;
  normalized_search text;
  search_pattern text;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para ver a los integrantes'
      using errcode = '42501';
  end if;

  if page_size is null or page_size < 1 or page_size > max_page_size then
    raise exception 'El tamaño de página tiene que estar entre 1 y %', max_page_size
      using errcode = '22023';
  end if;

  if page_offset is null or page_offset < 0 then
    raise exception 'El desplazamiento no puede ser negativo'
      using errcode = '22023';
  end if;

  -- El largo se mide antes de recortar: una búsqueda rodeada de espacios
  -- también cuenta sus espacios.
  if char_length(search_query) > max_search_length then
    raise exception 'La búsqueda puede tener hasta % caracteres', max_search_length
      using errcode = '22023';
  end if;

  normalized_search := nullif(btrim(search_query), '');

  -- %, _ y \ se buscan como texto: se escapan con \, el escape por defecto de
  -- ilike. Nada se arma como SQL: el patrón es un valor.
  if normalized_search is not null then
    search_pattern := '%'
      || replace(replace(replace(normalized_search, '\', '\\'), '%', '\%'), '_', '\_')
      || '%';
  end if;

  -- La familia sale de la sesión: ningún parámetro la elige.
  select m.household_id into member_household_id
  from public.household_members m
  where m.user_id = current_user_id;

  if member_household_id is null then
    return;
  end if;

  return query
  select
    m.user_id,
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    m.role,
    m.user_id = current_user_id
  from public.household_members m
  join auth.users u on u.id = m.user_id
  where m.household_id = member_household_id
    and (
      search_pattern is null
      or nullif(btrim(u.raw_user_meta_data ->> 'name'), '') ilike search_pattern
    )
  order by (m.role = 'admin') desc, m.created_at, m.user_id
  limit page_size
  offset page_offset;
end;
$$;

-- Supabase da execute a anon y authenticated por defecto en las funciones de
-- public: se quita a public y anon y se deja solo a authenticated.
revoke execute on function public.get_household_members_page(text, integer, integer) from public, anon;
grant execute on function public.get_household_members_page(text, integer, integer) to authenticated;
