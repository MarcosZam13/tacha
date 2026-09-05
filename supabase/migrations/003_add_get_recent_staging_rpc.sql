-- ============================================================================
-- FIX QA bug #4 (2026-09-04): product_catalog_staging es intencionalmente
-- privada (RLS habilitado, sin policies — solo service_role/Edge Functions
-- la tocan, ver schema.sql). El demo de Spec 1 ("Ver filas en staging")
-- necesita leerla desde el navegador con la anon key, lo cual nunca iba a
-- funcionar sin una policy pública.
--
-- Se decidió NO agregar una policy de lectura pública directa a la tabla
-- (expondría raw_json completo — el payload crudo de VTEX — a cualquiera con
-- la anon key, algo que la decisión original de "staging es 100% interno"
-- buscaba evitar). En su lugar: una función RPC de solo lectura que expone
-- únicamente las columnas necesarias para el demo, sin tocar RLS de la tabla.
-- ============================================================================

create or replace function get_recent_staging(
  store_slug text,
  row_limit integer default 20
)
returns table (
  id uuid,
  scraped_name text,
  scraped_brand text,
  scraped_size_text text,
  image_url text,
  status text,
  scraped_at timestamptz
) as $$
begin
  return query
  select
    pcs.id,
    pcs.scraped_name,
    pcs.scraped_brand,
    pcs.scraped_size_text,
    pcs.image_url,
    pcs.status,
    pcs.scraped_at
  from product_catalog_staging pcs
  join stores s on s.id = pcs.store_id
  where s.slug = store_slug
  order by pcs.scraped_at desc
  limit greatest(0, row_limit);
end;
$$ language plpgsql stable security definer
set search_path = public;

-- security definer porque product_catalog_staging no tiene policy de SELECT
-- (intencional) — esta función corre con los privilegios de su dueño para
-- poder leerla, pero solo expone las columnas de la lista de arriba, nunca
-- raw_json completo (que puede incluir tokens/campos internos de VTEX).
revoke all on function get_recent_staging(text, integer) from public;
grant execute on function get_recent_staging(text, integer) to anon, authenticated;

comment on function get_recent_staging(text, integer) is
  'Lectura pública controlada de product_catalog_staging para el demo de Spec 1. ' ||
  'Expone solo columnas de presentación (nunca raw_json) — product_catalog_staging ' ||
  'sigue sin policy de SELECT directa, ver reporte de decisiones sección "staging es interno".';
