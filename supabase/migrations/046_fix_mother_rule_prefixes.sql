-- ============================================================================
-- Migración 046 (SCRUM-132): dos prefijos de categoría de product_mother_rules
-- que no coincidían con las categorías reales de VTEX.
--
-- Con la 045 la categoría es obligatoria siempre que la fila trae una, así que
-- estas dos madres quedaron sin ninguna variante en la corrida del 2026-11-13.
-- Antes solo entraban por el respaldo por keyword. Evidencia: categorías de
-- las filas pending de esa corrida (ver supabase/specs/SCRUM-132/tasks.md,
-- tarea 10).
--   - "Repostería": el prefijo decía "Panadería y tortillería" con t
--     minúscula; VTEX usa "Panadería y Tortillería" (el like distingue
--     mayúsculas).
--   - "Leche de coco": la leche de coco real (Goya, Roland) está en
--     "/Cervezas, Vinos y Licores/Licores/Brandy/" en las 3 tiendas, no en
--     "/Lácteos/Leche/".
-- Mismo cambio en supabase/data/madres.json.
-- ============================================================================

update product_mother_rules pmr
set vtex_category_prefix = '/Panadería y Tortillería/Repostería y Pastelería/'
from product_catalog pc
where pc.id = pmr.product_catalog_id
  and pc.name = 'Repostería'
  and pc.household_id is null
  and pc.owner_id is null;

update product_mother_rules pmr
set vtex_category_prefix = '/Cervezas, Vinos y Licores/Licores/Brandy/'
from product_catalog pc
where pc.id = pmr.product_catalog_id
  and pc.name = 'Leche de coco'
  and pc.household_id is null
  and pc.owner_id is null;
