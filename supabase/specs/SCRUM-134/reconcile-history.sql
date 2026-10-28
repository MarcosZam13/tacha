-- ============================================================================
-- SCRUM-134: reescribir el historial de migraciones de la base compartida
--
-- Solo toca supabase_migrations. No vuelve a correr ninguna migración: los
-- objetos de 000-014 ya existen (verificación en SPEC.md).
--
-- 1. Copia las 14 filas actuales (con su SQL en `statements`) a
--    supabase_migrations.schema_migrations_pre_scrum134, que no está expuesta
--    por la API. Es el respaldo: lo que se corrió en la base no se pierde.
-- 2. Borra las 14 filas con timestamp.
-- 3. Inserta una fila por archivo de supabase/migrations/ (000-014).
-- 4. Verifica conteos y falla si algo no cuadra (la transacción se deshace).
--
-- Ensayo: correrlo tal cual. El bloque final termina en `raise exception`
-- con los conteos, así que no queda nada escrito.
-- Real: cambiar `ensayo boolean := true` por false. Antes: aviso al grupo.
-- ============================================================================

begin;

create table supabase_migrations.schema_migrations_pre_scrum134 as
  select * from supabase_migrations.schema_migrations;

delete from supabase_migrations.schema_migrations
where version in (
  '20260827072022', '20260828050635', '20260828051451',
  '20260904200421', '20260904200840', '20260904201002',
  '20260904201718', '20260904202420', '20260904202525',
  '20260925215449', '20260925220316', '20260926000729',
  '20260926001246', '20261003200930'
);

insert into supabase_migrations.schema_migrations (version, name, created_by) values
  ('000', 'baseline',                        'SCRUM-134'),
  ('001', 'add_search_catalog_rpc',          'SCRUM-134'),
  ('002', 'add_normalize_staging_functions', 'SCRUM-134'),
  ('003', 'add_get_recent_staging_rpc',      'SCRUM-134'),
  ('004', 'create_lists',                    'SCRUM-134'),
  ('005', 'change_item_quantity',            'SCRUM-134'),
  ('006', 'create_recipes',                  'SCRUM-134'),
  ('007', 'save_recipe',                     'SCRUM-134'),
  ('008', 'harden_recipes',                  'SCRUM-134'),
  ('009', 'close_store_preferences_writes',  'SCRUM-134'),
  ('010', 'delete_recipes',                  'SCRUM-134'),
  ('011', 'create_households_and_invites',   'SCRUM-134'),
  ('012', 'delete_list_items',               'SCRUM-134'),
  ('013', 'add_recipe_to_list',              'SCRUM-134'),
  ('014', 'accept_household_invite',         'SCRUM-134');

do $$
declare
  ensayo boolean := true;
  respaldo int := (select count(*) from supabase_migrations.schema_migrations_pre_scrum134);
  historial int := (select count(*) from supabase_migrations.schema_migrations);
  con_timestamp int := (select count(*) from supabase_migrations.schema_migrations where length(version) > 3);
begin
  if respaldo <> 14 or historial <> 15 or con_timestamp <> 0 then
    raise exception 'No cuadra: respaldo=%, historial=%, con timestamp=%', respaldo, historial, con_timestamp;
  end if;
  if ensayo then
    raise exception 'Ensayo OK (no se escribió nada): respaldo=%, historial=%', respaldo, historial;
  end if;
end $$;

commit;

-- Después (solo lectura), para la evidencia del PR:
-- select version, name from supabase_migrations.schema_migrations order by version;
-- select (select count(*) from pg_tables where schemaname = 'public') as tablas,
--        (select count(*) from pg_policies where schemaname = 'public') as politicas,
--        (select count(*) from pg_indexes where schemaname = 'public') as indices;
-- Antes de reescribir (2026-10-08): 18 tablas, 26 políticas, 43 índices, 15 funciones.
