// SQL Query para lectura de preferencias de household
// Reutilizable por cualquier módulo (catálogo, listas, dashboard, etc.)
//
// Patrón: LEFT JOIN + coalesce(visible, true)
// Garantiza que: tiendas sin fila en household_store_preferences se muestran como visibles (true)
//
// SELECT s.*,
//   coalesce(hsp.visible, true) as visible
// FROM stores s
// LEFT JOIN household_store_preferences hsp
//   ON hsp.store_id = s.id AND hsp.household_id = $1
// WHERE coalesce(hsp.visible, true) = true;
//
// Parámetro: $1 = household_id (uuid)
// Devuelve: todas las tiendas que este household debe ver (filtradas por visible=true)

export const HOUSEHOLD_PREFERENCES_SQL_QUERY = `
select s.id as store_id,
  s.slug as store_slug,
  s.display_name,
  coalesce(hsp.visible, true) as visible
from stores s
left join household_store_preferences hsp
  on hsp.store_id = s.id and hsp.household_id = $1
where coalesce(hsp.visible, true) = true
order by s.slug asc;
`;

export const HOUSEHOLD_PREFERENCES_UPSERT_QUERY = `
insert into household_store_preferences (household_id, store_id, visible)
values ($1, $2, $3)
on conflict (household_id, store_id) do update
set visible = $3,
    updated_at = now()
returning household_id, store_id, visible;
`;
