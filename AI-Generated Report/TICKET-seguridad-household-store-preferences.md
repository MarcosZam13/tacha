
---
tipo: ticket de seguimiento (no bloqueante para PR actual)
origen: QA review de @MarcosZam13 sobre Specs 1-4, punto 6 ("deuda técnica a documentar")
fecha: 2026-09-04
bloquea: no debe llegar a producción sin resolverse — bloquea el lanzamiento, no el merge de este PR
---
# Endurecer RLS de `household_store_preferences` cuando exista el módulo de auth/households

## Problema

`household_store_preferences` tiene sus policies de `insert`/`update`/`delete` completamente abiertas:

```sql
create policy "temp insert household_store_preferences" on household_store_preferences
  for insert with check (true);
create policy "temp update household_store_preferences" on household_store_preferences
  for update using (true) with check (true);
create policy "temp delete household_store_preferences" on household_store_preferences
  for delete using (true);
```

Cualquiera con la `anon key` del proyecto (que es pública por diseño, vive en el bundle del frontend) puede escribir o borrar la preferencia de tiendas de **cualquier household**, no solo el propio. Esto es intencional por ahora — no existe todavía el módulo `households`/`household_members` (lo construye Esteban, ver documento sección 12) contra el cual filtrar por membresía real.

## Por qué no es bloqueante hoy

`household_store_preferences` solo controla visibilidad de tiendas en la UI (spec 4) — no hay datos financieros, personales, ni de otro household expuestos por esta tabla en sí. El peor caso de abuso hoy es que alguien oculte/muestre tiendas de un household que no es el suyo, sin impacto de seguridad más allá de ese módulo.

## Qué hay que hacer cuando el módulo `households` exista

Reemplazar las 3 policies temporales por policies que verifiquen membresía real, por ejemplo:

```sql
drop policy "temp insert household_store_preferences" on household_store_preferences;
drop policy "temp update household_store_preferences" on household_store_preferences;
drop policy "temp delete household_store_preferences" on household_store_preferences;

create policy "household members write their preferences" on household_store_preferences
  for all
  using (
    household_id in (
      select household_id from household_members where user_id = auth.uid()
    )
  )
  with check (
    household_id in (
      select household_id from household_members where user_id = auth.uid()
    )
  );
```

(Ajustar nombres de tabla/columna exactos una vez que Esteban defina el schema real de `household_members`.)

## Dueños

- Bloqueado por: módulo de auth/households (Esteban).
- Responsable de aplicar el fix una vez desbloqueado: Daniel (dueño de `household_store_preferences`, dentro del módulo de catálogo/scraping) o quien el equipo asigne.

## Referencia

Ya estaba anotado como comentario TODO en `supabase/schema.sql`, junto a la definición de las policies — este ticket solo lo hace explícito y rastreable fuera del código.
