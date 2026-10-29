-- ============================================================================
-- SCRUM-114 (HU-76): aviso pasivo de faltante de receta o plan
--
-- RPC get_general_list_shortfalls: los faltantes de volumen o peso que dejaron
-- las recetas (SCRUM-97) y la semana (SCRUM-101) en la lista general de quien
-- llama, con el nombre de su receta. Solo lee.
--
-- No hay tablas, columnas, políticas ni funciones cambiadas. Reglas y
-- decisiones: features/shopping-list/specs/SPEC.md §16.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_general_list_shortfalls
--
-- security definer, a propósito: en la lista de la familia (024) un miembro ve
-- los registros que dejaron las recetas de otro, pero la RLS de recipes no le
-- deja leer su nombre. Abrir esa RLS haría aparecer las recetas ajenas en
-- /recetas y en el planificador, que leen sin filtrar por dueño. Esta función
-- expone solo el nombre, y solo de los registros de una lista:
--
--   - la lista sale de find_general_list_id() (024), sin parámetro: esa
--     función filtra household_members y lists por auth.uid() explícito, no
--     por RLS, así que acá adentro devuelve la misma lista que vería quien
--     llama (la de su familia si es miembro, si no la personal). No hay id
--     ajeno que se pueda probar.
--   - aviso = faltante mayor que 0 y en ml o g (reglas 22 y 23 de la SPEC):
--     los conteos no llevan aviso (HU-76 CA-03).
--
-- stable: solo lee, y su resultado no cambia dentro de una misma consulta.
-- Orden: el de las filas en la lista y, dentro de cada fila, el de los
-- registros (una línea por receta, regla 25).
-- ----------------------------------------------------------------------------

create or replace function public.get_general_list_shortfalls()
returns table (
  list_item_id uuid,
  recipe_name text,
  quantity_missing numeric,
  quantity_unit text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  general_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para ver la lista'
      using errcode = '42501';
  end if;

  general_list_id := public.find_general_list_id();
  if general_list_id is null then
    return;
  end if;

  return query
  select req.list_item_id, r.name, req.quantity_missing, req.quantity_unit
  from public.list_item_recipe_requirements req
  join public.list_items li on li.id = req.list_item_id
  join public.recipes r on r.id = req.recipe_id
  where li.list_id = general_list_id
    and req.quantity_missing > 0
    and req.quantity_unit in ('ml', 'g')
  order by li.created_at, li.id, req.created_at, req.id;
end;
$$;

revoke execute on function public.get_general_list_shortfalls() from public, anon;
grant execute on function public.get_general_list_shortfalls() to authenticated;
