# Plan — SCRUM-134

Ver [SPEC.md](SPEC.md). Todas las consultas de los pasos 1 y 2 son de solo lectura.

## 1. Exportar el historial actual

```sql
select version, name, statements
from supabase_migrations.schema_migrations
order by version;
```

Guardar el resultado en `historial-2026-10.sql` (como comentarios o `insert` de referencia, no ejecutable).

## 2. Verificar el mapeo

- Para cada fila de la tabla de la SPEC, comparar `statements` con el archivo `NNN_` correspondiente. Cuando varias entradas caen en un archivo (`001`, `002`, `004`, `005`), el archivo debe ser la versión final de esos objetos.
- Para `006`-`011`, `013`, `014`: comprobar que tablas, políticas y funciones existen y que el cuerpo de cada función coincide con el archivo:

```sql
select p.proname, md5(pg_get_functiondef(p.oid))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1;
```

  y comparar contra el `md5` del `create or replace function` de cada archivo, aplicado en una base local o leído a mano.
- Las tres entradas de agosto contra `schema.sql`: si falta algo (índices o políticas de `fix_advisor_warnings_policies_and_indexes`), se agrega `000_baseline.sql`.
- Si algo no coincide, se para y se decide antes de seguir (puede ser un cambio hecho a mano en la base que no está en el repo).

## 3. Reescribir el historial (con OK y aviso al grupo)

Una sola transacción. Primero en modo ensayo: terminar con `raise exception` que muestre el conteo final, así no queda nada escrito; después la versión real con `commit`.

```sql
begin;
delete from supabase_migrations.schema_migrations
where version in (
  '20260827072022','20260828050635','20260828051451',
  '20260904200421','20260904200840','20260904201002',
  '20260904201718','20260904202420','20260904202525',
  '20260925215449','20260925220316','20260926000729',
  '20260926001246','20261003200930'
);
insert into supabase_migrations.schema_migrations (version, name) values
  ('001','add_search_catalog_rpc'),
  ('002','add_normalize_staging_functions'),
  ('003','add_get_recent_staging_rpc'),
  ('004','create_lists'),
  ('005','change_item_quantity'),
  ('006','create_recipes'),
  ('007','save_recipe'),
  ('008','harden_recipes'),
  ('009','close_store_preferences_writes'),
  ('010','delete_recipes'),
  ('011','create_households_and_invites'),
  ('012','delete_list_items'),
  ('013','add_recipe_to_list'),
  ('014','accept_household_invite');
-- ensayo: descomentar para no escribir nada
-- do $$ begin raise exception 'filas: %', (select count(*) from supabase_migrations.schema_migrations); end $$;
commit;
```

Como se agregó `000_baseline.sql`, sumar `('000','baseline')`.

## 4. Documentación

- `supabase/README.md`: sección "Migraciones" con la tabla de equivalencias y la regla.
- `CONTRIBUTING.md`: la regla de aplicar migraciones, al lado del paso 2 de QA que ya habla de migraciones.
- `.agents/skills/gitflow/SKILL.md` y `.agents/skills/security-practices/SKILL.md`: enlace a la regla.
- `features/household/specs/plan.md`: el paso "aplicar en el SQL Editor" apunta a la regla nueva.

## 5. Verificación final

- `select version, name from supabase_migrations.schema_migrations order by version;` devuelve exactamente los archivos de `supabase/migrations/`.
- Conteo de objetos de `public` igual antes y después (prueba de que nada se re-ejecutó).
- Evidencia de ambas consultas en el PR.
