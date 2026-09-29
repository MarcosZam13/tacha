-- ============================================================================
-- SCRUM-95 (HU-64): endurecer recetas (revisión de seguridad del PR #10)
--
-- 1. Cantidad: el check de 006 era "quantity_value > 0", pero en Postgres
--    'NaN'::numeric > 0 da true y 'Infinity'::numeric existe, así que alguien
--    llamando a la API directo podía guardar NaN o Infinity. Con un tope
--    superior el check los rechaza (NaN <= tope da false). El formulario usa
--    el mismo tope (RECIPE_FORM_LIMIT.QUANTITY_MAX).
-- 2. Columnas escribibles de recipes: las políticas de 007 abren insert y
--    update sobre todas las columnas. image_url no tiene que ser escribible
--    hasta el ticket de la foto (con recetas compartidas, una URL propia
--    serviría de píxel de rastreo contra el resto del household), y id,
--    owner_id, household_id y created_at nunca. Se deja solo name y
--    base_servings, que es lo que usa save_recipe.
-- 3. Nombre: el check de 006 medía el largo recortado (btrim), así que un
--    nombre podía rellenarse con espacios sin límite. Ahora se mide el largo
--    total y se sigue exigiendo que no quede vacío al recortar.
-- ============================================================================

alter table public.recipe_ingredients
  drop constraint if exists recipe_ingredients_quantity_value_check,
  add constraint recipe_ingredients_quantity_value_check
    check (quantity_value > 0 and quantity_value <= 100000);

-- Permisos por columna: RLS decide qué filas, esto decide qué columnas.
-- select no se toca (la lectura sigue igual); returning id de save_recipe
-- usa select, no insert.
revoke insert, update on public.recipes from authenticated;
grant insert (name, base_servings) on public.recipes to authenticated;
grant update (name, base_servings) on public.recipes to authenticated;

alter table public.recipes
  drop constraint if exists recipes_name_check,
  add constraint recipes_name_check
    check (char_length(name) <= 120 and char_length(btrim(name)) >= 1);
