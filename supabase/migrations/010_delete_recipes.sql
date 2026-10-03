-- ============================================================================
-- SCRUM-96 (HU-64b): eliminar una receta
--
-- Abre el borrado de recipes solo para el dueño. Hasta acá estaba cerrado a
-- propósito: recipes tiene RLS (006) y ninguna política de delete, así que un
-- delete borraba 0 filas sin dar error.
--
-- Los ingredientes no necesitan política nueva: recipe_ingredients.recipe_id
-- es "on delete cascade" (006), y las acciones en cascada de una FK no pasan
-- por RLS. Las políticas de lectura, creación y edición no cambian.
-- ============================================================================

-- authenticated ya tiene delete por el default de Supabase (008 solo restringió
-- insert y update). Se escribe igual para que el permiso quede visible en el
-- repo y no dependa de un default: si un revoke general lo quitara, el borrado
-- fallaría con 42501 en vez de quedar abierto o cerrado sin que se note.
grant delete on public.recipes to authenticated;

-- Solo using, sin with check: un delete no deja una fila nueva que revisar.
-- (select auth.uid()) igual que en 007: se evalúa una vez por consulta, no por fila.
create policy "owner deletes own recipes"
  on public.recipes for delete
  to authenticated
  using (owner_id = (select auth.uid()));
