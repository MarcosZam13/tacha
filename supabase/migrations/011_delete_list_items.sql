-- ============================================================================
-- SCRUM-65 (HU-36d): eliminar un producto de la lista general
--
-- Abre el borrado de list_items solo para el dueño de la lista. Hasta acá
-- estaba cerrado a propósito: list_items tiene RLS (004) y ninguna política
-- de delete, así que un delete borraba 0 filas sin dar error.
--
-- La lista (lists) no se borra aunque se quede sin items: la lista general es
-- una sola por usuario y se reusa al añadir el próximo producto.
-- ============================================================================

-- authenticated ya tiene delete por el default de Supabase (004 solo le quitó
-- todo a anon). Se escribe igual para que el permiso quede visible en el repo
-- y no dependa de un default.
grant delete on public.list_items to authenticated;

-- Mismo criterio que select y update (004): el item es de una lista del
-- usuario. Solo using, sin with check: un delete no deja una fila nueva que
-- revisar. (select auth.uid()) se evalúa una vez por consulta, no por fila.
create policy "owner deletes items of own lists"
  on public.list_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = (select auth.uid())
    )
  );
