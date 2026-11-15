-- ============================================================================
-- SCRUM-127: endurecer household_store_preferences (seguimiento de SCRUM-123).
--
-- Estado antes de esta migración (verificado en la base el 2026-10-29):
--   - una sola política, "temp read household_store_preferences", con
--     using (true): cualquiera, incluso sin sesión, lee las preferencias de
--     cualquier household (y con eso, sus ids);
--   - sin política de escritura desde 009: RLS rechaza toda escritura;
--   - anon y authenticated con todos los permisos de tabla, TRUNCATE incluido
--     (RLS no controla TRUNCATE);
--   - FK solo en store_id, ninguna en household_id;
--   - tabla vacía.
--
-- Qué hace:
--   1. Permisos (B1): anon queda solo con SELECT y authenticated con SELECT,
--      INSERT, UPDATE y DELETE. Sin TRUNCATE, REFERENCES ni TRIGGER para
--      ninguno de los dos. anon conserva SELECT porque search_catalog y
--      list_catalog_by_category son security invoker y hacen left join a esta
--      tabla: sin el permiso, un visitante que busca en el catálogo recibiría
--      "permission denied" en vez de resultados. RLS le devuelve 0 filas.
--   2. FK household_id → households (B2): una preferencia no puede apuntar a
--      un household que no existe, y se borra con él.
--   3. Acceso por membresía (B2 + B3): la lectura pública temporal se
--      reemplaza por una política para miembros. Cualquier miembro (admin o
--      no) lee y cambia las preferencias de su household; nadie más ve ni
--      toca las de otro. B3 es seguro porque la app no pasa household_id al
--      catálogo (solo la demo de /debug lo hace).
--
-- La subconsulta lee household_members con los permisos de quien llama: la
-- política "user reads own membership" (011) le deja ver solo su propia fila,
-- que es justo la que hace falta (mismo patrón que lists en 024).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Permisos de tabla.
-- ----------------------------------------------------------------------------
revoke all on public.household_store_preferences from anon, authenticated;
grant select on public.household_store_preferences to anon;
grant select, insert, update, delete on public.household_store_preferences to authenticated;

-- ----------------------------------------------------------------------------
-- 2. FK a households.
-- ----------------------------------------------------------------------------
alter table public.household_store_preferences
  add constraint household_store_preferences_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 3. Lectura y escritura solo para miembros del household.
-- ----------------------------------------------------------------------------
drop policy if exists "temp read household_store_preferences" on public.household_store_preferences;

create policy "household member manages store preferences"
  on public.household_store_preferences for all
  to authenticated
  using (
    household_id in (
      select m.household_id from public.household_members m
      where m.user_id = (select auth.uid())
    )
  )
  with check (
    household_id in (
      select m.household_id from public.household_members m
      where m.user_id = (select auth.uid())
    )
  );
