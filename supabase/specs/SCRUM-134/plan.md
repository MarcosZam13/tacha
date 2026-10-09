# Plan — SCRUM-134

Ver [SPEC.md](SPEC.md). Las consultas de los pasos 1 y 2 son de solo lectura.

## 1. Conteo de objetos antes

```sql
select (select count(*) from pg_tables where schemaname = 'public') as tablas,
       (select count(*) from pg_policies where schemaname = 'public') as politicas,
       (select count(*) from pg_indexes where schemaname = 'public') as indices,
       (select count(*) from supabase_migrations.schema_migrations) as historial;
```

2026-10-08: 18 tablas, 26 políticas, 43 índices, 15 funciones de `public`, 14 filas de historial.

## 2. Verificar el mapeo (hecho, resultado en la SPEC)

- Funciones: `md5` de `prosrc` en la base contra el texto entre `$$` de la última definición en el repo, normalizando espacios y quitando comentarios `--` de ambos lados:

```sql
select p.proname,
       md5(btrim(regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1;
```

- Tablas, políticas, índices y triggers de `public` contra los `create` de `schema.sql` y `001`-`014`.
- Las tres entradas de agosto contra `schema.sql`: lo que falta (seis índices) va en `000_baseline.sql`.

## 3. Reescribir el historial (con aviso al grupo)

[`reconcile-history.sql`](reconcile-history.sql), una sola transacción:

1. Copia las 14 filas a `supabase_migrations.schema_migrations_pre_scrum134` (respaldo con el SQL de cada una).
2. Borra las 14 filas con timestamp.
3. Inserta `000` … `014`.
4. Verifica conteos; si no cuadran, falla y no queda nada escrito.

Primero en ensayo (`ensayo := true`, termina en `raise exception` con los conteos), después con `ensayo := false`.

## 4. Documentación

- `supabase/README.md`: sección "Migraciones" con la regla y la tabla de equivalencias.
- `CONTRIBUTING.md`: enlace a la regla desde §5.1 paso 2 y la Definition of Done.
- `.agents/skills/gitflow/SKILL.md` y `.agents/skills/security-practices/SKILL.md`: enlace a la regla.
- `features/household/specs/plan.md`: el paso "aplicar en el SQL Editor" apunta a la regla nueva.

## 5. Verificación final

- `select version, name from supabase_migrations.schema_migrations order by version;` devuelve exactamente los archivos de `supabase/migrations/`.
- El conteo del paso 1 da igual (prueba de que nada se re-ejecutó).
- Evidencia de ambas consultas en el PR.
