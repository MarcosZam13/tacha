# Plan técnico: recetas

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md). Las secciones de arriba son de SCRUM-94 (catálogo); después vienen [SCRUM-95](#scrum-95-crear-o-editar-una-receta) (crear o editar), [SCRUM-96](#scrum-96-eliminar-una-receta) (eliminar) y [SCRUM-97](#scrum-97-agregar-una-receta-a-la-lista) (agregar a la lista).

> **Verificado el 2026-09-25** contra la base real: no existen `recipes`, `recipe_ingredients` ni `households`. El catálogo tiene 28 productos madre (casi todos lácteos, del scraping de "leche") y se puede leer con cualquier rol, así que el join `recipe_ingredients → product_catalog` funciona con la sesión anónima.

## Archivos

```
features/recipes/
  RecipeCatalog.tsx                    entrada ("use client"): tabs + estados + grilla (solo presentación)
  components/
    RecipesTabs.tsx                    (movido a components/recipes-tabs/ en SCRUM-99: lo usan el catálogo y el planificador)
    RecipeCard.tsx                     una tarjeta: foto o marcador, nombre, porciones, ingredientes
    RecipeCatalogEmptyState.tsx        catálogo vacío
    models/RecipeCardProps.interface.ts
  hooks/
    useRecipeCatalogViewModel.ts       carga inicial (useEffect) y deriva lo que dibuja la pantalla
  models/                              (agrupados por pantalla en SCRUM-96; antes, un archivo por tipo)
    recipe-catalog.interfaces.ts       RecipeRow: forma de una receta tal como la devuelve la consulta
                                       RecipeSummary: una receta lista para la tarjeta (textos ya armados)
                                       RecipeCatalogViewModel: lo que el ViewModel le entrega a RecipeCatalog.tsx
    recipe-catalog.types.ts            RecipeCatalogState: unión loading / error / ready
  services/
    recipes.service.ts                 getRecipeSummaries(): consulta + adaptación fila → RecipeSummary
  utils/
    toRecipeSummary.ts                 adapter puro: RecipeRow → RecipeSummary (orden, principales, "+N más", inicial)
    formatServings.ts                  4 → "4 porciones", 1 → "1 porción"
  constants/
    recipes.constants.ts               textos, límite de ingredientes, tabs, estados, tablas y select
  specs/  SPEC.md · plan.md · tasks.md

app/(app)/recetas/page.tsx                   ruta delgada: solo renderiza <RecipeCatalog />
supabase/migrations/006_create_recipes.sql
supabase/seed-demo-recipes.sql         recetas de ejemplo para la demo (no es migración)
types/database.types.ts                se agregan recipes y recipe_ingredients (regenerar al aplicar la migración)
docs/documento-proyecto.md             §6: columnas nuevas de recipes
```

## Datos

Según documento-proyecto §6 (recetas) y el patrón `owner_id` + `household_id` nullable de `lists`:

- `recipes`: `id`, `owner_id` (→ `auth.users`, default `auth.uid()`), `household_id` (nullable, sin FK hasta que exista `households`), `name` (1-120 caracteres), `base_servings` (1-50), `image_url` (nullable), `created_at`.
- `recipe_ingredients`: `id`, `recipe_id` (→ `recipes`, `on delete cascade`), `product_catalog_id` (→ `product_catalog`: el producto madre, no una variante, porque la receta expresa una medida cruda), `quantity_value` (> 0), `quantity_unit` (`ml` / `g` / `unidad`, las mismas unidades base del catálogo), `position` (orden de carga, define los "principales"), `created_at`; `unique (recipe_id, product_catalog_id)`.
- RLS en ambas, deny por defecto; esta historia solo abre **select**:
  - `recipes`: `owner_id = auth.uid()`.
  - `recipe_ingredients`: existe la receta y es del usuario.
  - `anon` sin permisos de tabla (igual que `lists`). Insert/update/delete los abre SCRUM-95.

### Consulta

Una sola petición a PostgREST que embebe ingredientes y su producto:

```
recipes(id, name, base_servings, image_url,
        recipe_ingredients(id, position, product_catalog(name)))
order by created_at desc
```

Sin `.eq("owner_id", ...)`: el filtro lo hace RLS (requerimiento 4 del spec). El orden de los ingredientes por `position` lo hace solo el adapter (`toRecipeSummary`), no la consulta, para que la regla viva en un único lugar. El `id` del ingrediente se pide para usarlo como `key`: dos productos madre pueden llamarse igual.

### Datos de demo

`supabase/seed-demo-recipes.sql` le da 4 recetas (tres leches, arroz con leche, batido, cereal) a **cada usuario que ya existe**, para no tener que buscar el id de nadie: quien prueba abre `/recetas` una vez (para que exista su usuario), corre el seed y recarga. Un usuario creado después no las tiene hasta volver a correrlo (es idempotente). Se descartó asignarlas a "el usuario más reciente": en una base compartida casi nunca es quien está probando, porque abrir la app reusa la sesión guardada en vez de crear un usuario. Las recetas de ejemplo llevan `created_at` dentro de la primera hora del `2000-01-01`, una fecha que ninguna receta real puede tener: el `delete` y el `join` del script solo tocan esas filas, así que volver a correrlo después de SCRUM-95 no borra recetas reales aunque se llamen igual (hallazgo de la revisión de seguridad). Usa productos que existen en el catálogo actual (solo lácteos) y falla si alguno no se encuentra. "Tres leches" tiene 4 ingredientes para que se vea el "+1 más"; ninguna tiene foto, así que se ve el marcador con la inicial.

## Flujo

1. `/recetas` → `RecipeCatalog` → `useRecipeCatalogViewModel`.
2. Al montar, el efecto llama `getRecipeSummaries()`: `ensureSession()` → consulta → `toRecipeSummary()` por fila.
3. Responde → `setState({ status: ready, recipes })`; si falla → `setState({ status: error })`. Si el componente se desmontó, la respuesta se descarta.
4. El ViewModel deriva `isLoading`, `errorMessage`, `isEmpty`, `hasRecipes` y `recipes`; `RecipeCatalog` solo los conecta a los componentes.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `owner_id` + `household_id` nullable | Esperar a que exista `households` | La historia se puede entregar este sprint; el mismo patrón ya está en `lists` y lo pide security-practices §3 |
| Filtrar por dueño solo con RLS | `.eq("owner_id", user.id)` en el servicio | Cuando llegue la política de household, las recetas compartidas aparecen sin tocar el frontend. Además el control real tiene que estar en la base, no en la UI |
| Ingrediente → `product_catalog` (producto madre) | → `product_catalog_variants` | Una receta pide "500 ml de leche", no "caja de 1 L"; la presentación se decide al comprar (documento-proyecto §4.9.1) |
| Unidades `ml` / `g` / `unidad` | Texto libre ("tazas") | Son las unidades base del catálogo; sin eso no se puede sumar contra la lista (SCRUM-97) |
| `position` para los ingredientes principales | Los primeros alfabéticamente | Quien escribe la receta suele cargar primero lo importante; alfabético mostraría "Azúcar" antes que "Pollo" |
| Unión `loading` / `error` / `ready` con `useState` | Tres booleanos / `useReducer` | Una sola acción (cargar) no justifica un reducer; la unión impide estados imposibles como "cargando y con error" |
| Adapter `toRecipeSummary` en `utils/` | Mapear dentro del componente | La pantalla nunca ve la forma cruda de la base (patrón Adapter, component-architecture §5), y es una función pura fácil de probar |
| `next/image` con `unoptimized` | Configurar `images.remotePatterns` / `<img>` | `<img>` lo marca el lint de Next; `remotePatterns` hoy no tiene a qué apuntar (el bucket de fotos se decide en SCRUM-95). `unoptimized` sirve cualquier URL sin tocar `next.config.ts` |
| Tabs dentro de la feature | Componente compartido | Hoy tiene un solo consumidor; se promueve cuando exista el planificador (SCRUM-99). **SCRUM-99 lo promovió** a `components/recipes-tabs/`, con sus constantes en `constants/recipes-tabs.constants.ts` |
| Seed de demo aparte de las migraciones | Insertar datos en la migración | Las migraciones son esquema; los datos de ejemplo dependen de un usuario concreto y no van a producción |

## Integración con households (pendiente)

Cuando `households` esté en `develop` (idealmente dentro de SCRUM-95, cuyo CA-04 ya habla de recetas compartidas; si no, en un ticket propio):

1. FK `recipes.household_id → households(id)`.
2. Política de lectura para miembros en `recipes`: la receta es visible si el usuario es **miembro** del `household_id` de la fila (no solo si `household_id` no es nulo). Reusar la función de membresía de la migración de households, si existe (`security definer` con `search_path` fijo si hace falta evitar recursión).
3. **Reescribir también la política de `recipe_ingredients`.** Hoy filtra por `r.owner_id` explícito; si solo se suma la política de miembros en `recipes`, los miembros verían la receta compartida sin ingredientes. Lo más simple: `exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id)`, porque esa subconsulta ya pasa por la RLS de `recipes` de quien consulta y queda sincronizada sola.
4. Políticas de insert/update para miembros (SCRUM-95, CA-04).
5. Excluir usuarios anónimos de todo lo que sea household (deuda ya anotada en `features/shopping-list/specs/plan.md`).
6. Frontend: selector "personal / del household" al crear o editar. El catálogo no cambia (requerimiento 4).

## Deuda de la revisión de seguridad de SCRUM-94

Los puntos 1, 2 y 4 se resuelven en [SCRUM-95](#scrum-95-crear-o-editar-una-receta) (ver "Seguridad" ahí). El 3 queda para el ticket de la foto.

1. **Insert en `recipes`:** `with check (owner_id = (select auth.uid()) and household_id is null)`, igual que `lists` en `004_create_lists.sql`. Sin `household_id is null`, cualquiera podría mandar un `household_id` ajeno (sin FK se guarda igual) y la receta aparecería en ese household cuando exista la política de miembros.
2. **Insert/update en `recipe_ingredients`:** el update necesita `using` **y** `with check`, ambos con el `exists` sobre una receta propia. Sin `with check`, un usuario podría mover su ingrediente a una receta ajena cambiando `recipe_id`.
3. **`image_url` (ticket de la foto):** guardar la ruta dentro de Supabase Storage, no una URL libre (con recetas compartidas, una URL propia de un miembro funcionaría como píxel de rastreo de los demás). Validar tipo y tamaño en la política del bucket, no en el `accept=` del input. No cambiar `unoptimized` por `remotePatterns` con comodín: convertiría el optimizador de Next en un proxy abierto.
4. **Validación del formulario** antes de escribir, respetando los `check` de la base (nombre 1-120, porciones 1-50, cantidad > 0, unidad `ml`/`g`/`unidad`).

## Deuda conocida

- **Nombres de producto largos:** el catálogo scrapeado guarda el nombre con marca y tamaño ("Leche entera Sabemas - 1 L"). Los ingredientes se ven así hasta que el módulo de catálogo normalice el nombre del producto madre.
- **Sin tests automatizados:** el proyecto no tiene runner. Lo primero a cubrir: `toRecipeSummary` y `formatServings` (funciones puras).

---

## SCRUM-95: crear o editar una receta

> **Verificado el 2026-09-28:** `recipes` y `recipe_ingredients` existen (migración `006`, solo lectura). El buscador del catálogo ya es compartido (SCRUM-120): `hooks/useProductSearch.ts` devuelve productos madre (`CatalogProduct`, con sus variantes y `baseUnit`) y `components/product-search/ProductSearch.tsx` dibuja opciones genéricas.

### Archivos

```
features/recipes/
  RecipeEditor.tsx                     entrada ("use client"): cargando / no encontrada / error / formulario
  components/
    RecipeBasicsFields.tsx             nombre + porciones base
    RecipeIngredientsField.tsx         buscador compartido + lista de filas de ingrediente
    RecipeIngredientRow.tsx            producto elegido + cantidad + unidad + "Quitar"
    RecipeEditorActions.tsx            "Guardar" / "Cancelar"
    models/…Props.interface.ts         props de cada mini componente (.type.ts las que son un Pick del ViewModel)
  hooks/
    useRecipeEditorViewModel.ts        facade: une useRecipeEditor + useProductSearch + navegación
    useRecipeEditor.ts                 useReducer + carga para editar (useEffect) + guardar
  models/                              (agrupados por pantalla en SCRUM-96; antes, un archivo por tipo)
    recipe-editor.interfaces.ts          RecipeEditorProps: recipeId opcional, sin id es receta nueva
                                         RecipeEditorRow: receta tal como la devuelve la consulta de edición
                                         RecipeEditorIngredient: un ingrediente en el formulario (cantidad como texto)
                                         RecipeEditorValues: nombre, porciones (texto) e ingredientes
                                         RecipeEditorErrors: un mensaje por campo; los de ingrediente por productId
                                         RecipeEditorState: status + values + errores + mensajes
                                         RecipeIngredientRowViewModel: una fila de ingrediente lista para dibujar (con su error)
                                         RecipeEditorViewModel: lo que el ViewModel le entrega a RecipeEditor.tsx
                                         SaveRecipePayload / SaveRecipeResponse: lo que se manda a save_recipe y lo que devuelve
    recipe-editor.types.ts               RecipeEditorAction: unión discriminada de acciones del reducer
  services/
    recipes.service.ts                 + getRecipeForEditing(), saveRecipe()
  utils/
    recipe-editor.reducer.ts           reducer puro + estado inicial
    validateRecipeForm.ts              validación pura (+ hasRecipeFormErrors)
    normalizeDecimal.ts                " 0,5 " → "0.5" (lo usan la validación y el payload)
    toSaveRecipePayload.ts             valores del formulario → payload (trim, números)
    toRecipeEditorValues.ts            fila de la base → valores del formulario
    getDefaultUnit.ts                  producto del catálogo → unidad preseleccionada
    getRecipeEditPath.ts               id → "/recetas/{id}/editar"
  constants/recipes.constants.ts       + límites, patrones, unidades, acciones, estados, textos, rutas, RPC

  RecipeCatalog.tsx                    + link "+ Nueva receta"
  components/RecipeCard.tsx            + link "Editar" (la ruta viene armada en RecipeSummary.editPath)

app/(app)/recetas/nueva/page.tsx             ruta delgada: <RecipeEditor />
app/(app)/recetas/[id]/editar/page.tsx       ruta delgada: await params → <RecipeEditor recipeId={id} />
supabase/migrations/007_save_recipe.sql     políticas de escritura + save_recipe
supabase/migrations/008_harden_recipes.sql  tope de cantidad, columnas escribibles, largo del nombre (revisión de seguridad)
types/database.types.ts                + Functions.save_recipe (regenerar al aplicar la migración)
```

### Datos

**Migración `007_save_recipe.sql`:**

- Políticas nuevas (las de lectura de `006` no cambian):
  - `recipes` insert: `with check (owner_id = auth.uid() and household_id is null)`.
  - `recipes` update: `using (owner_id = auth.uid())` y `with check (owner_id = auth.uid() and household_id is null)`: no se puede pasar la receta a otro dueño ni colgarla de un household.
  - `recipe_ingredients` insert, update y delete: `exists` sobre una receta propia; el update con `using` **y** `with check`. El delete de ingredientes hace falta para editar (se reemplazan); borrar la **receta** sigue cerrado hasta SCRUM-96.
- Función `save_recipe(recipe_name text, recipe_base_servings integer, ingredient_list jsonb, target_recipe_id uuid default null) returns uuid` (el parámetro no se llama `recipe_ingredients` para no confundirlo con la tabla dentro de la función; `target_recipe_id` va al final porque tiene default):
  - `security invoker` (RLS sigue aplicando) y `search_path` vacío, como `add_item_to_general_list`.
  - Sin ingredientes → error.
  - `target_recipe_id` nulo → inserta (el dueño sale del default `auth.uid()`); con valor → actualiza. Si el update no toca ninguna fila (no existe o es ajena, RLS la oculta) → error "no encontrada", sin revelar cuál de las dos.
  - Borra los ingredientes de esa receta e inserta los nuevos; `position` = orden en el arreglo.
  - Todo en una transacción: si algo falla (un producto inexistente, una unidad inválida), no queda nada a medias.
  - Solo `authenticated` puede ejecutarla.
- `ingredient_list` JSON: `[{ "product_catalog_id": uuid, "quantity_value": number, "quantity_unit": "ml" | "g" | "unidad" }]`.

**Migración `008_harden_recipes.sql`** (de la revisión de seguridad del PR; la `007` ya estaba aplicada y no se edita, clean-code-practices §4):

- **Cantidad `> 0 and <= 100000`:** el check de `006` era solo `> 0`, y en Postgres `'NaN'::numeric > 0` da verdadero y `'Infinity'::numeric` existe. Llamando a la API directo se podía guardar NaN o Infinity, que después rompería la suma contra la lista (SCRUM-97). El tope los rechaza; el formulario usa el mismo (`RECIPE_FORM_LIMIT.QUANTITY_MAX`).
- **Permisos por columna en `recipes`:** insert y update solo sobre `name` y `base_servings`. `image_url` queda cerrada hasta el ticket de la foto (con households sería un píxel de rastreo), e `id`, `owner_id`, `household_id` y `created_at` no se pueden fijar a mano. RLS decide qué filas; los permisos por columna, qué columnas.
- **Nombre:** se mide el largo total (máx. 120) y se sigue exigiendo que no quede vacío al recortar. Antes solo se medía el largo recortado, así que se podía rellenar con espacios sin límite.

**Consulta para editar:**

```
recipes(id, name, base_servings,
        recipe_ingredients(position, quantity_value, quantity_unit, product_catalog(id, name)))
where id = {recipeId}   (maybeSingle)
```

Sin fila → "no encontrada" (no existe o es de otro usuario: RLS no la devuelve). Un id que no es un uuid válido hace que Postgres responda error `22P02`; se trata igual que "no encontrada".

### Flujo

1. **Nueva:** `/recetas` → "+ Nueva receta" → `/recetas/nueva` → `RecipeEditor` sin `recipeId` → estado inicial `editing` con el formulario vacío.
2. **Editar:** tarjeta → "Editar" → `/recetas/{id}/editar` → `RecipeEditor recipeId={id}` → estado inicial `loading` → `getRecipeForEditing(id)` → `loaded` (valores precargados) / `notFound` / `loadFailed`.
3. **Ingrediente:** escribir en el buscador → `useProductSearch` → opciones (id = producto madre, sin detalle de tamaño). Elegir una → `ingredientAdded` con la unidad de `getDefaultUnit(product)` y cantidad vacía; si ya estaba → aviso, no se duplica. El buscador se limpia.
4. **Editar campos:** cada cambio es una acción del reducer y limpia el error de ese campo.
5. **Guardar:** `validateRecipeForm(values)` → si hay errores se muestran y no se llama a la base. Si no → `saving` (botón deshabilitado) → `saveRecipe(toSaveRecipePayload(values, recipeId))` → éxito: `router.push("/recetas")`; error: `saveFailed`, el formulario conserva todo.
6. **Cancelar:** link a `/recetas`, sin guardar.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Rutas propias `/recetas/nueva` y `/recetas/{id}/editar` | Modal sobre el catálogo | El botón "atrás" del navegador funciona, se puede recargar sin perder en qué receta estás, y el modal necesitaría estado compartido entre catálogo y formulario (patrón todavía sin decidir, nextjs-enterprise-patterns §3) |
| Un solo `RecipeEditor` para crear y editar | Dos pantallas | Es el mismo formulario; solo cambia si arranca vacío o cargado, y si `save_recipe` recibe id |
| Guardar con una RPC (`save_recipe`) | Varias llamadas desde el cliente (insert receta, después ingredientes) | Todo o nada en una transacción: si falla la red a mitad, no queda una receta sin ingredientes. Además es una sola petición |
| Reemplazar todos los ingredientes al editar | Calcular qué se agregó, cambió o quitó | Una receta tiene pocos ingredientes; reemplazar es simple, correcto y deja `position` siempre en el orden del formulario |
| `security invoker` en `save_recipe` | `security definer` | Con invoker, RLS sigue siendo el control: la función no puede hacer nada que el usuario no pueda hacer directo. Definer obligaría a revalidar permisos adentro |
| `useReducer` para el formulario | Varios `useState` | Varias acciones con reglas (no duplicar, limpiar el error del campo, cargar para editar); las reglas quedan en una función pura |
| Cantidad y porciones como texto en el formulario | Guardarlas como número al escribir | El input es texto: con número, "0," o un campo vacío se volverían 0 mientras se escribe. Se convierten recién al validar |
| Aceptar coma decimal ("0,5") | Solo punto | En Costa Rica se escribe con coma; rechazarla sería un error para el usuario, no para el sistema |
| Unidad preseleccionada desde las variantes del producto | Siempre `unidad` / obligar a elegir | Casi siempre acierta (la leche se mide en `ml`) y ahorra un paso; se puede cambiar |
| Validación en `utils/` + `check` de la base | Librería de esquemas (Zod) | Mismo patrón que el registro (`features/registro-manual/utils/validateRegistroForm.ts`) y sin dependencia nueva; la base repite las reglas, así que la UI es comodidad y la base la garantía |
| `<select>` nativo para la unidad, dentro de la feature | Primitivo `Select` en `components/ui` | Solo hay un uso; un primitivo nuevo se crea cuando aparezca el segundo |
| Links (`next/link`) para "+ Nueva receta", "Editar" y "Cancelar" | `Button` con `router.push` | Son navegación, no acciones: con un link se puede abrir en otra pestaña y el lector de pantalla lo anuncia bien. El `Button` compartido no navega (component-architecture §5, Liskov) |

### Seguridad

- Resuelve los puntos 1, 2 y 4 de la [deuda de SCRUM-94](#deuda-de-la-revisión-de-seguridad-de-scrum-94).
- El cliente nunca manda `owner_id` ni `household_id`: el dueño sale de `auth.uid()` y el `household_id is null` lo exige la política.
- Editar una receta ajena es imposible por RLS aunque alguien llame a `save_recipe` con un id ajeno desde la consola: el update no encuentra la fila.
- La base rechaza cantidades NaN/Infinity o enormes, nombres rellenos y escrituras sobre columnas que el formulario no usa (`008`), aunque alguien se salte el formulario.

### Deuda conocida

- **Sin tests automatizados** (no hay runner): lo primero a cubrir son `recipe-editor.reducer.ts`, `validateRecipeForm.ts` y `toSaveRecipePayload.ts` (funciones puras).
- **Catálogo chico:** con 28 productos de "leche", solo se pueden armar recetas de lácteos hasta que el catálogo crezca (Daniel).
- **Productos personalizados de otro household:** `recipe_ingredients.product_catalog_id` acepta cualquier producto del catálogo. Hoy no importa porque `product_catalog` se lee público, pero cuando los productos de household ("Mis productos") tengan RLS propia, el insert de ingredientes tiene que exigir que el producto sea visible para quien guarda (si no, se podría ligar el id de un producto ajeno y leer su nombre desde la receta).
- **Sin límite de ingredientes por receta:** `save_recipe` acepta cualquier cantidad (solo la acota el `unique` por producto). No es explotable más allá de ensuciar tus propias recetas; si hiciera falta, un tope en la función (ej. 100).
- **Sesiones anónimas:** cualquiera puede generar sesiones anónimas y crear recetas (solo lo limita el rate limit de Supabase por IP). Deuda conocida de `ensureSession`; se cierra con el login real.
- **Para SCRUM-96** (se resuelve en [esa sección](#scrum-96-eliminar-una-receta)): la política de delete de `recipes` tiene que ser `using (owner_id = (select auth.uid()))` (los ingredientes se borran en cascada). Si una receta se borra mientras otra pestaña la edita, `save_recipe` responde `P0002`; conviene mostrarlo como "no encontrada" en vez del error genérico.
- **Para households:** el `household_id is null` del `with check` del update va a bloquear las recetas compartidas: hay que sumar políticas de miembros y la FK, no solo quitar el `is null` (sin FK se podría colgar de un household ajeno). Un miembro que no es el dueño nunca debe poder cambiar `owner_id` (ya cubierto por los permisos por columna de `008`).
- **Estilo de links:** "+ Nueva receta" y "Cancelar" repiten las clases del `Button` primario y secundario porque son links. Si otra feature necesita lo mismo, conviene un primitivo `ButtonLink` en `components/ui`.

---

## SCRUM-96: eliminar una receta

> **Verificado el 2026-10-02** contra el repo: `recipes` tiene RLS con políticas de select (`006`), insert y update (`007`), y ninguna de delete. `recipe_ingredients.recipe_id` ya es `on delete cascade` (`006`). La `009` está tomada (`009_close_store_preferences_writes.sql`), así que esta historia usa la `010`. `meal_plans` no existe (SCRUM-100).

### Archivos

```
features/recipes/
  RecipeCatalog.tsx                    + <RecipeDeleteDialog> y pasa onDeleteRequest a cada tarjeta
  components/
    RecipeCard.tsx                     + botón "Eliminar" junto a "Editar"
    RecipeDeleteDialog.tsx             nuevo: Modal de confirmación (nombre, aviso, error, Eliminar/Cancelar)
    models/RecipeCardProps.interface.ts        + onDeleteRequest
    models/RecipeDeleteDialogProps.type.ts     nuevo: Omit<RecipeDeletionViewModel, "onDeleteRequest">
  hooks/
    useRecipeDeletion.ts               nuevo: estado de la eliminación + confirmar/cancelar/borrar
    useRecipeCatalogViewModel.ts       + usa useRecipeDeletion y quita la receta borrada del estado
    useRecipeEditor.ts                 + "no encontrada" al guardar → estado notFound
  models/
    recipe-deletion.types.ts           nuevo: RecipeDeletionTarget (Pick<RecipeSummary, "id" | "name">)
                                         y RecipeDeletionState (idle / confirming / deleting / failed)
    recipe-deletion.interfaces.ts      nuevo: RecipeDeletionViewModel, DeleteRecipePayload, DeleteRecipeResponse
    recipe-catalog.interfaces.ts       + deletion: RecipeDeletionViewModel en RecipeCatalogViewModel
  services/
    recipes.service.ts                 + deleteRecipe(); saveRecipe() devuelve null si la receta no existe
  constants/recipes.constants.ts       + RECIPE_DELETION_STATUS, RECIPE_DELETE_TEXT, POSTGRES_ERROR_CODE.NO_DATA_FOUND

supabase/migrations/010_delete_recipes.sql   política de delete en recipes para el dueño
```

No cambian: `types/database.types.ts` (una política no aparece en los tipos generados), `supabase/schema.sql` (no tiene las tablas de recetas) ni `docs/documento-proyecto.md` (no hay columnas ni tablas nuevas).

### Datos

**Migración `010_delete_recipes.sql`:**

```sql
grant delete on public.recipes to authenticated;

create policy "owner deletes own recipes"
  on public.recipes for delete
  to authenticated
  using (owner_id = (select auth.uid()));
```

- **Política:** solo el dueño borra. `(select auth.uid())` igual que en `007`: Postgres la evalúa una vez por consulta, no una vez por fila.
- **`grant delete` explícito:** hoy `authenticated` ya lo tiene por el default de Supabase (la `008` solo restringió insert y update), pero escribirlo deja el permiso visible en el repo en vez de depender de un default que no se ve. Es idempotente.
- **Ingredientes:** se borran por el `on delete cascade` de `006`. Las acciones en cascada de una FK no pasan por RLS, así que no hace falta tocar las políticas de `recipe_ingredients`.
- `anon` sigue sin permisos (el `revoke all` de `006`).

**Borrar desde el cliente:**

```
delete from recipes where id = {recipeId}
```

Una sola petición a PostgREST (`.delete().eq("id", recipeId)`), sin `.select()`: el resultado no cambia lo que hace la pantalla (SPEC regla 16), así que no hace falta saber cuántas filas borró.

**"No encontrada" al guardar:** `save_recipe` ya responde `P0002` cuando la receta no existe o es ajena (`007`). `saveRecipe()` lo traduce a `null`, igual que `getRecipeForEditing()` traduce `22P02`.

### Flujo

1. **Pedir:** tarjeta → "Eliminar" → `onDeleteRequest({ id, name })` → estado `confirming` con esa receta → `RecipeDeleteDialog` se abre con el nombre.
2. **Cancelar:** "Cancelar", clic fuera o Escape → `onDeleteCancel` → `idle`. Si está en `deleting`, se ignora: el diálogo no se cierra a mitad.
3. **Confirmar:** "Eliminar" del diálogo → `onDeleteConfirm`. Si ya está en `deleting`, se ignora (doble clic). Si no → `deleting` (botones deshabilitados, "Eliminando…") → `deleteRecipe({ recipeId })`:
   - **éxito:** `onDeleted(recipeId)` → el catálogo filtra la receta de su estado `ready` → `idle`. Si era la última, el catálogo deriva `isEmpty` y muestra el estado vacío solo.
   - **error:** `failed` con la misma receta → el diálogo muestra el error. "Eliminar" reintenta (`failed` → `deleting`); "Cancelar" vuelve a `idle`.
4. **Editor en otra pestaña:** "Guardar receta" → `saveRecipe()` devuelve `null` → `useRecipeEditor` despacha `NOT_FOUND` (la acción ya existe) → la pantalla muestra "No encontramos esa receta." con el link de volver.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| `delete` directo con PostgREST | RPC `delete_recipe` | Es una sola sentencia: ya es atómica y la cascada borra los ingredientes. Una RPC sumaría una función que mantener sin hacer nada más; `save_recipe` existe porque ahí sí hay varias escrituras |
| Sin `.select()` después del delete | Pedir las filas borradas para distinguir "borrada" de "no existía" | La pantalla hace lo mismo en los dos casos (SPEC regla 16), y no distinguirlos evita revelar si una receta ajena existe |
| `grant delete` explícito en la migración | Confiar en el default de Supabase | El permiso queda escrito en el repo. Si alguien hace un `revoke` general como en `008`, el borrado no se rompe en silencio |
| Hook propio `useRecipeDeletion`, compuesto por el ViewModel del catálogo | Meter el estado de la eliminación en `useRecipeCatalogViewModel` | Carga y eliminación son dos responsabilidades; separadas, cada hook se lee en una pantalla y la eliminación se puede reusar (ej. en SCRUM-100) sin arrastrar la carga del catálogo (component-architecture §5, Facade) |
| `useState` con una unión de 4 estados | `useReducer` | Son pocas transiciones y sin reglas cruzadas entre campos; el editor usa reducer porque tiene muchas acciones con reglas. La unión igual impide "eliminando sin receta" |
| Quitar la receta del estado local al borrar | Volver a pedir el catálogo completo | Una petición menos y sin parpadeo de "cargando"; la base ya confirmó el borrado |
| El catálogo le pasa `onDeleted` al hook | El hook modifica las recetas directo | El hook de eliminación no conoce la forma del estado del catálogo; solo avisa qué id se borró |
| "Eliminar" de la tarjeta con `Button` secundario, el del diálogo con `destructive` | Rojo en los dos lugares | El rojo marca la acción que de verdad borra; en la tarjeta solo abre el diálogo. Una grilla de botones rojos además compite con el contenido |
| Nombre de la receta dentro del botón como texto `sr-only` | Agregar `aria-label` al `Button` compartido | Logra lo mismo para el lector de pantalla ("Eliminar Tres leches") sin cambiar un primitivo que usan otras features |
| Modelos agrupados por pantalla y por sintaxis: `recipe-deletion.types.ts` + `recipe-deletion.interfaces.ts` | Un archivo por tipo (como estaba `models/`) / un solo archivo por pantalla | Un archivo por tipo dejaba 16 archivos de pocas líneas y costaba encontrar las cosas. Separar `types` de `interfaces` mantiene la convención de sufijos del repo (`.type.ts` / `.interface.ts`). Nombre en kebab-case plural, como `types/catalog.types.ts`, porque cada archivo tiene varios tipos. El resto de `models/` se agrupa igual en un commit `refactor` |
| Diálogo como mini componente presentacional con props | Que el diálogo llame al hook por su cuenta | Sigue el patrón de la feature: el ViewModel decide, los componentes dibujan. El diálogo no sabe de Supabase |
| `P0002` al guardar → estado `notFound` del editor | Mostrarlo como error de guardado y dejar el formulario | Reintentar nunca va a funcionar (la receta no existe); la pantalla de "no encontrada" ya existe y lleva de vuelta al catálogo |
| `saveRecipe()` devuelve `null` si no la encuentra | Lanzar un error tipado propio | Es la misma convención que `getRecipeForEditing()`; quien llama distingue con un `if`, sin revisar códigos de Postgres fuera del servicio |

### Seguridad

- El control real es la política de delete: aunque alguien llame a `.delete()` desde la consola con el id de una receta ajena, RLS no la ve y no se borra nada.
- El cliente solo manda el id; nunca `owner_id`.
- Riesgo a vigilar: si la política faltara o estuviera mal, el delete no daría error (0 filas) y la tarjeta igual desaparecería. Por eso el caso de aceptación "al recargar, la receta borrada no vuelve" es obligatorio en la validación.
- Con households (pendiente), los miembros van a necesitar su propia política de delete; no basta con sumar la de lectura. Va junto con las de [la integración](#integración-con-households-pendiente).

### Deuda conocida

- **Sin tests automatizados** (no hay runner): lo primero a cubrir es `useRecipeDeletion` (transiciones, doble clic, reintento) y la tarjeta + diálogo con un Page Object.
- **Otra pestaña con el catálogo abierto** sigue mostrando la receta borrada hasta recargar (no hay Realtime en recetas). Si la intenta borrar ahí, se quita sin error (regla 16).
- **El `Modal` compartido no atrapa el foco** (anotado en su propio hook): con el teclado se puede salir del diálogo con Tab. Es del primitivo, no de esta historia.
- **CA-02 cerrado por SCRUM-100:** el diálogo de eliminar avisa cuántos espacios del plan semanal usan la receta (`countRecipeMealPlans` y `mealPlanNotice` en `useRecipeDeletion`); ver la SPEC, sección 13.

---

## SCRUM-97: agregar una receta a la lista

> **Verificado el 2026-10-03** contra el repo y las PRs abiertas: `list_items` referencia `product_catalog_variants` con `quantity_requested` entero (`004`), y el cliente solo puede actualizar `quantity_requested` (`005`). Las migraciones `011` (households, PR #41) y `012` (borrar items de la lista, PR #34) ya están tomadas, así que esta historia usa la **`013`**; ninguna de las dos toca `recipes` ni las políticas de `lists`. La `012` abre el borrado de `list_items`: la cascada de la tabla nueva cubre ese caso.

### Archivos

```
features/recipes/
  RecipeCatalog.tsx                    + diálogo de repetir y respuesta de "agregar" por tarjeta
  components/
    RecipeCard.tsx                     + botón "Agregar receta a lista" y RecipeAddToListResult
    RecipeAddToListResult.tsx          nuevo: resumen (role="status") o error (role="alert") + link "Ver lista"
    RecipeRepeatAddDialog.tsx          nuevo: Modal "Ya agregaste X a tu lista. ¿Agregarla otra vez?"
    models/RecipeCardProps.interface.ts        + addToList (RecipeCardAddToList) y onAddToListRequest
    models/RecipeAddToListResultProps.interface.ts  nuevo
    models/RecipeRepeatAddDialogProps.type.ts  nuevo: Pick del ViewModel
  hooks/
    useRecipeListAddition.ts           nuevo: estado de agregar (unión de 5) + confirmación + llamada al servicio
    useRecipeCatalogViewModel.ts       + compone useRecipeListAddition
  models/
    recipe-list-addition.interfaces.ts nuevo: AddRecipeToListPayload/Response, resumen, ViewModel, params del hook
    recipe-list-addition.types.ts      nuevo: RecipeListAdditionState (unión) y el target (Pick de RecipeSummary)
    recipe-catalog.interfaces.ts       + listAddition en RecipeCatalogViewModel
  services/
    recipes.service.ts                 + addRecipeToList(): RPC + adapter; P0002 → null
    added-recipes.storage.ts           nuevo: leer/guardar en localStorage los ids ya agregados (try/catch)
  utils/
    toAddRecipeToListResponse.ts       nuevo: jsonb de la RPC → AddRecipeToListResponse
    toAddToListSummaryText.ts          nuevo: resumen → textos de la tarjeta ("Te falta comprar: Leche X (600 ml)")
    formatRecipeQuantity.ts            nuevo: 0.5 + "g" → "0,5 g"; 1 + "unidad" → "1 unidad"
    validateRecipeForm.ts              + máximo de 50 ingredientes (mismo tope que save_recipe)
  constants/recipes.constants.ts       + estados, textos, RPC, clave de localStorage

supabase/migrations/013_add_recipe_to_list.sql   tabla + RLS + permisos + RPC
types/database.types.ts                          regenerar (tabla y Functions.add_recipe_to_general_list)
docs/documento-proyecto.md                       §4.9.1 (reglas de conteo y de producto que no está) y §6 (tabla nueva)
```

No se toca `features/shopping-list/` (SPEC §10), ni `list_items`, ni `app/(app)/lista/page.tsx`.

### Datos

**Migración `013_add_recipe_to_list.sql`:**

- **Tabla `list_item_recipe_requirements`:**
  - `id`, `list_item_id` (→ `list_items`, `on delete cascade`), `recipe_id` (→ `recipes`, `on delete cascade`), `quantity_needed` (numeric), `quantity_missing` (numeric), `quantity_unit` (`ml` / `g` / `unidad`), `created_at`.
  - `check`: `quantity_needed > 0` con tope (rechaza NaN e Infinity, igual que la `008`); `quantity_missing >= 0 and quantity_missing <= quantity_needed`.
  - `unique (list_item_id, recipe_id, quantity_unit)`: la misma receta repetida acumula en su registro (regla 24). La unidad entra en la clave por si la receta se editó entre un agregado y otro.
  - Índice en `recipe_id` (lo usa la cascada al borrar una receta).
- **RLS** (nace activado, deny por defecto):
  - select, insert y update: la fila de la lista es de una lista propia **y** la receta es propia (`exists` sobre `recipes`, que ya pasa por su RLS).
  - delete: cerrado hasta SCRUM-115 (resolver al tachar). Las cascadas no pasan por RLS, así que borrar la receta o el item igual borra sus registros.
  - `anon` sin permisos; `authenticated` solo puede actualizar `quantity_needed` y `quantity_missing` (mismo criterio que la `005` y la `008`).
- **RPC `add_recipe_to_general_list(target_recipe_id uuid) returns jsonb`**, `security invoker` y `search_path` vacío, como `save_recipe`:
  1. Sin sesión → error `42501`. La receta no se ve (no existe o es ajena) → `P0002`.
  2. Busca o crea la lista general (mismo `insert ... on conflict do nothing` que `add_item_to_general_list`) y toma un bloqueo de transacción sobre su id (`pg_advisory_xact_lock`): dos agregados al mismo tiempo se hacen uno detrás del otro, así el "disponible" de la regla 20 no se cuenta dos veces. No es `select ... for update` porque `for update` también exige una política de update en `lists`, y no la hay.
  3. Recorre los ingredientes en orden (`position`) y aplica las reglas 19 a 22 de la SPEC con las presentaciones del producto y sus filas en la lista.
  4. Suma unidades con `insert ... on conflict (list_id, product_catalog_variant_id) do update set quantity_requested = quantity_requested + n`, el mismo merge de la `004`.
  5. Registra lo pedido y lo que falta con `insert ... on conflict (...) do update` sumando.
  6. Devuelve `{ added: [...], missing: [{ product_name, quantity, unit }], skipped: [...] }`.
  - Solo `authenticated` puede ejecutarla.

- **Funciones auxiliares** (`security invoker`, solo `authenticated`):
  - `pick_recipe_variant(producto, unidad, cantidad)`: la regla "la más chica que cubre; si ninguna cubre, la más grande", en un solo lugar para conteo y volumen/peso.
  - `add_units_to_list_item(lista, variante, unidades)`: suma unidades con el merge de la `004` y devuelve la fila. No abre nada que las políticas de `list_items` no permitan ya.
- **Tope de 50 ingredientes:** `save_recipe` se redefine con el mismo cuerpo de la `007` más ese control, y la RPC también lo revisa, porque `recipe_ingredients` se puede escribir directo (políticas de `007`) sin pasar por `save_recipe`. Sin tope, una receta con cientos de ingredientes haría cara la RPC (varias consultas por ingrediente, con la lista bloqueada). Un `statement_timeout` dentro de la función no serviría: Postgres arma ese límite al empezar la consulta, no lo cambia a mitad.

**Llamada desde el cliente:** `rpc("add_recipe_to_general_list", { target_recipe_id })` → `toAddRecipeToListResponse()` → `AddRecipeToListResponse`. Con `P0002` el servicio devuelve `null`, igual que `saveRecipe()`.

### Flujo

1. Tarjeta → "Agregar receta a lista" → `onAddRequest({ id, name })`.
2. `useRecipeListAddition` lee `added-recipes.storage`:
   - si la receta ya está → `confirmingRepeat` → `RecipeRepeatAddDialog`. "Cancelar" → `idle`; "Agregar otra vez" → paso 3;
   - si no → paso 3.
3. `adding` (todos los botones "Agregar" deshabilitados) → `addRecipeToList({ recipeId })`:
   - **éxito:** guarda el id en `localStorage` → `added` con el resumen → `RecipeAddToListFeedback` en esa tarjeta, con `toAddToListSummaryText()`;
   - **`null`:** `failed` con "No encontramos esa receta.";
   - **error:** `failed` con "No se pudo agregar la receta a tu lista. Intenta de nuevo."
4. El resumen queda en la tarjeta hasta la siguiente acción de agregar.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Una RPC con todas las reglas | Calcular en el cliente y mandar varias escrituras | Todo o nada en una transacción, y documento-proyecto §6 pide que la unificación de cantidades viva en la base. En el cliente, dos pestañas podrían calcular el mismo "disponible" a la vez |
| Bloqueo de transacción sobre la lista (`pg_advisory_xact_lock`) dentro de la RPC | Nada / `select ... for update` | Sin bloqueo, dos recetas agregadas al mismo tiempo verían el mismo "disponible" y ninguna registraría faltante (el caso de las dos recetas sobre la misma leche). `for update` no sirve: con RLS exige una política de update en `lists`, que no existe, y no encontraría la fila |
| Solo cuentan las presentaciones con cantidad base mayor que 0 | Todas | Con cantidad 0 no hay cuenta posible (división por cero en el redondeo de los conteos); si el producto no tiene ninguna usable, se trata como "sin presentación" (regla 26) |
| Tabla aparte para lo pedido y lo que falta | Columnas en `list_items` | Una fila de la lista puede tener varias recetas; no se toca la tabla de Marcos; las cascadas borran los registros solas (SPEC §12) |
| Guardar lo pedido aunque alcance (faltante 0) | Guardar solo los faltantes | Es lo que permite descontar lo que ya pidieron otras recetas (regla 20) |
| `unique` con la unidad | `unique (list_item_id, recipe_id)` | Si la receta cambia de unidad entre un agregado y otro, no se suman ml con g en el mismo registro |
| Delete de la tabla cerrado | Abrirlo ya | Nadie lo usa hasta SCRUM-115; las cascadas no lo necesitan |
| `localStorage` en un servicio (`added-recipes.storage.ts`) | Leerlo directo en el hook | Es entrada/salida, como Supabase: queda en el borde y el hook no sabe de `window` |
| Hook propio `useRecipeListAddition` compuesto por el ViewModel del catálogo | Meterlo en `useRecipeCatalogViewModel` | Mismo criterio que `useRecipeDeletion` en SCRUM-96: una responsabilidad por hook |
| Una receta a la vez | Varias en paralelo | Con el bloqueo de la lista se harían en fila igual, y un solo resumen visible es más claro |
| El resumen lo arma una función pura (`toAddToListSummaryText`) | Armarlo en el JSX | Es lógica de texto con casos (sin faltantes, con faltantes, sin presentación); pura se puede probar sin React |
| Faltante en la unidad del ingrediente ("600 ml") | Convertir a L o kg | Es la unidad que eligió quien escribió la receta; convertir es formato, y lo puede decidir SCRUM-114 al mostrarlo |

### Seguridad

- La RPC es `security invoker`: no puede hacer nada que el usuario no pueda hacer directo. Una receta ajena no se ve (`P0002`, sin revelar si existe) y no se puede escribir en la lista de otro.
- La tabla nueva exige lista propia **y** receta propia en select, insert y update. Sin la segunda condición, alguien podría colgar el id de una receta ajena en su propia lista y leer su nombre embebido desde ahí.
- El cliente solo manda el id de la receta. Cantidades, presentaciones y faltantes los calcula la base.
- `localStorage` guarda solo ids de recetas propias; no hay datos sensibles.

### Deuda conocida

- **Sin tests automatizados:** hay un runner en camino (SCRUM-128, PR #36). Lo primero a cubrir: `toAddRecipeToListResponse`, `toAddToListSummaryText` y las transiciones de `useRecipeListAddition`. Las reglas de la RPC se prueban en el SQL Editor con casos fijos (tasks).
- **El faltante no se recalcula** si después cambian las cantidades de la lista (SPEC regla 23): lo resuelve SCRUM-115.
- **Households:** la RPC usa la lista general personal (`household_id is null`). Cuando la lista sea del household (PR #41 en adelante), la RPC y las políticas de la tabla nueva siguen el mismo cambio que `add_item_to_general_list`.
- **Insert y update directos en `list_item_recipe_requirements`** (revisión de seguridad, baja): hoy el usuario puede cambiar a mano lo pedido y lo que falta de **su propia** lista, y eso altera el "disponible" de sus próximos agregados. No afecta a nadie más. Con households, un miembro podría falsear los faltantes de otros: revisarlo ahí (quitar insert/update directos y dejar solo la RPC, pasándola a `security definer` con las validaciones adentro).
- **Topes acumulados** (revisión de seguridad, baja): agregar la misma receta muchísimas veces puede llevar `quantity_needed` a su tope (10 000 000) o `quantity_requested` al máximo de `integer`, y ese agregado falla. Solo afecta al propio usuario; SCRUM-115 abre el borrado de los registros.
- **La respuesta de la RPC no se valida en el cliente** (revisión de código y de seguridad, baja): se tipa con el contrato de la `013`, igual que `searchCatalog`. Si la RPC cambia de forma, el error aparece en el adapter y no en el borde; un guard de pocas líneas lo resolvería.

---

## SCRUM-98: ver qué falta de una receta

> **Verificado el 2026-10-09** contra `develop` (con SCRUM-66 y SCRUM-135 mergeadas): `list_items.checked_at` existe (`015`), `list_item_recipe_requirements` existe (`013`) y la última migración es la `015`. En todo el repo no hay ningún uso de Realtime ni la publicación `supabase_realtime`. La rama `ticket/SCRUM-67-modo-compra` está abierta y ya tomó la `016` (`016_create_purchase_sessions.sql`), por eso esta historia usa la `017`.

### Archivos

```
features/recipes/
  RecipeCatalog.tsx                    + conecta coverage a cada tarjeta
  components/
    RecipeCard.tsx                     + botón "Ver qué falta" (aria-expanded) y RecipeCoveragePanel
    RecipeCoveragePanel.tsx            nuevo: resumen + lista de ingredientes, o cargando / error / no encontrada
    RecipeCoverageIngredient.tsx       nuevo: una fila (nombre, cantidad, etiqueta Cubierto/Falta, motivo)
    models/RecipeCardProps.interface.ts        + coverage y onCoverageToggle
    models/RecipeCoveragePanelProps.type.ts    nuevo: Pick del ViewModel
    models/RecipeCoverageIngredientProps.interface.ts  nuevo
  hooks/
    useRecipeCoverage.ts               nuevo: estado (unión de 5) + abrir/cerrar + carga + suscripción con limpieza
    useRecipeCatalogViewModel.ts       + compone useRecipeCoverage
  models/
    recipe-coverage.interfaces.ts      nuevo: CoverageIngredient, RecipeCoverageViewModel, params del hook
    recipe-coverage.types.ts           nuevo: RecipeCoverageState (unión), CoverageStatus, CoverageReason
    recipe-catalog.interfaces.ts       + coverage en RecipeCatalogViewModel
  services/
    recipe-coverage.service.ts         nuevo: getRecipeCoverage() (RPC + adapter, P0002 → null) y subscribeToListChanges()
  utils/
    toCoverageIngredients.ts           nuevo: jsonb de la RPC → CoverageIngredient[]
    toCoverageSummaryText.ts           nuevo: ingredientes → "Te faltan 2 de 4 ingredientes" / "Tienes todo para cocinarla"
    toCoverageReasonText.ts            nuevo: motivo + faltante → "No está en tu lista" / "Te falta comprar 600 ml"
  constants/recipes.constants.ts       + estados, textos, motivos, RPC, nombre del canal

supabase/migrations/017_recipe_coverage.sql   RPC + publicación de Realtime
types/database.types.ts                       regenerar (Functions.get_recipe_coverage)
```

No se toca `features/shopping-list/` (SPEC §10): la lista no sabe que el panel la escucha.

### Datos

**Migración `017_recipe_coverage.sql`:**

- **RPC `get_recipe_coverage(target_recipe_id uuid) returns jsonb`**, `stable`, `security invoker`, `search_path` vacío, solo `authenticated`:
  1. Sin sesión → `42501`. La receta no se ve → `P0002` (igual que `add_recipe_to_general_list`).
  2. Toma la lista general del usuario (`household_id is null`); si no tiene, todos los ingredientes salen `missing / notInList`.
  3. Por cada ingrediente (orden `position`): filas = `list_items` de esa lista con alguna presentación (`product_catalog_variants`) del mismo producto madre.
     - sin filas → `missing`, `notInList`;
     - alguna con `checked_at is null` → `missing`, `notChecked`;
     - todas tachadas y `sum(quantity_missing)` de los registros de esta receta sobre esas filas `> 0` → `missing`, `short`, con esa suma;
     - si no → `covered`.
  4. Devuelve el arreglo de la SPEC §12.
- **Publicación de Realtime:** `alter publication supabase_realtime add table public.list_items`, dentro de un bloque `do` que primero revisa `pg_publication_tables`, para que sea idempotente. No cambia permisos: Realtime aplica la RLS de `list_items`.
- Sin tablas, columnas ni políticas nuevas.

**Llamada desde el cliente:** `rpc("get_recipe_coverage", { target_recipe_id })` → `toCoverageIngredients()` → `CoverageIngredient[]`. Con `P0002` el servicio devuelve `null`.

### Flujo

1. Tarjeta → "Ver qué falta" → `onCoverageToggle({ id, name })`.
   - Si esa receta ya estaba abierta → `closed` y se cancela la suscripción.
   - Si no → se cierra la anterior (una a la vez) y pasa a `loading`.
2. `getRecipeCoverage()`:
   - **éxito:** `ready` con los ingredientes → `RecipeCoveragePanel` con `toCoverageSummaryText()`;
   - **`null`:** `notFound`;
   - **error:** `error`, con "Reintentar".
3. En `ready` abre la suscripción (`subscribeToListChanges`). Cada evento dispara una nueva llamada; la respuesta **reemplaza** los datos de `ready` sin pasar por `loading`. Si esa llamada falla, se conserva lo último visto.
4. El `useEffect` cancela la suscripción al cerrar, al cambiar de receta y al desmontar. Una bandera de cancelación descarta respuestas que lleguen después.
5. Eventos muy seguidos (tachar varios): los que llegan con una consulta en curso no lanzan otra; al terminar se hace una sola más (**coalescencia**, sin librería).

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Calcular en una RPC de solo lectura | Calcular en el cliente con varias consultas | Una sola regla (la 29) en un solo lugar. Mismo criterio que SCRUM-97 |
| Realtime como **señal** y volver a pedir | Aplicar el contenido del evento al estado local | El evento trae una fila de `list_items`, no el estado de la receta (depende de presentaciones y registros). Recalcular en el cliente duplicaría la regla 29 |
| Una sola suscripción, solo con el panel abierto | Una por tarjeta, siempre | Cada canal es una conexión; solo importa la receta que se mira |
| Panel dentro de la tarjeta | Ruta `/recetas/[id]` | Decidido con el responsable (2026-10-09). La ruta se puede crear después sin cambiar la RPC |
| Cubierto = en la lista y tachado | Cualquier fila en la lista / tabla de inventario | Decidido con el responsable. "Ya lo compré" es lo que dice la historia y no exige datos que no existen |
| Reemplazar sin pasar por `loading` | "Cargando…" en cada cambio | El panel parpadearía cada vez que se tacha algo |
| Coalescencia de eventos | Debounce con temporizador | Más simple de razonar y de probar (sin tiempo): una consulta en curso y a lo más una pendiente |
| Hook propio `useRecipeCoverage` compuesto por el ViewModel | Meterlo en `useRecipeCatalogViewModel` | Mismo criterio que `useRecipeDeletion` y `useRecipeListAddition` |
| `status` y `reason` como uniones desde constantes | Cadenas sueltas | constants-standards; la RPC devuelve esos mismos valores |

### Seguridad

- La RPC es `security invoker` y de solo lectura: no puede devolver nada que el usuario no pueda leer directo. Receta ajena → `P0002`, sin revelar si existe.
- Realtime respeta la RLS de `list_items`: un usuario solo recibe eventos de su propia lista. Se prueba con dos sesiones y lo revisa `security-reviewer` (toca RLS y publicación).
- El cliente solo manda el id de la receta; el nombre del canal lleva ese id y nada sensible.
- La publicación expone `list_items` a Realtime. Insert y update respetan la RLS; **los eventos delete no** (limitación de Supabase): llegan a todos los suscriptores, solo con el `id` de la fila, y cada panel abierto vuelve a consultar. No se filtra ningún dato; es una amplificación de carga acotada por la coalescencia. Aceptado en la revisión de seguridad (Medium); detalle y siguiente paso en SPEC §15. `REPLICA IDENTITY FULL` queda prohibido en esta tabla.
- Al quedar activa la suscripción se hace una consulta más (`SUBSCRIBED` → `onChange`), para no perder un cambio que ocurra entre la primera consulta y la suscripción.

### Deuda conocida

- **Primer uso de Realtime en el repo:** si otra feature lo necesita, conviene extraer `subscribeToListChanges` a `services/`.
- **Borrados ajenos disparan una consulta por panel abierto** (revisión de seguridad, Medium): ver Seguridad y SPEC §15. Siguiente paso si molesta: debounce de ~300 ms en `refresh`.
- **Una consulta por cambio:** la coalescencia limita las llamadas, pero no es incremental. Suficiente para una lista de decenas de filas.
- **Cubierto no mide cantidad** (regla 31). Si el usuario cambia las cantidades de la lista después de agregar la receta, el faltante no se recalcula (regla 23, SCRUM-115).
- **La RPC se prueba en el SQL Editor** con casos fijos (tasks). El runner cubre `toCoverageIngredients`, `toCoverageSummaryText`, `toCoverageReasonText` y las transiciones de `useRecipeCoverage` con un servicio simulado.

---

## SCRUM-161: foto de una receta

> **Verificado el 2026-11-24** contra `develop` (8a6e69a): el único bucket es `avatars` (036), `recipes` solo permite escribir `name` y `base_servings` (008) y no hay E2E de recetas. Las PRs abiertas tienen la `050`, `056`, `057` y `058`: esta historia usa la **`059`** o la siguiente libre.

### Archivos

```
supabase/
  migrations/059_recipe_photos.sql                 columna, permiso, RPC, bucket y políticas
  tests/059_recipe_photos.test.sql                 prueba con rollback

constants/image-files.constants.ts                 nuevo: tipo MIME → extensión, promovido desde features/profile (+ barrel)
features/profile/                                  solo el import de esa constante (revisión de Esteban)

features/recipes/
  components/
    RecipePhotoField.tsx                           nuevo: vista previa, elegir, cambiar, quitar, error
    RecipePhoto.tsx                                nuevo: foto 4:3, o la inicial si no hay o no carga
    RecipeCard.tsx                                 usa RecipePhoto
    models/…Props
  hooks/
    useRecipePhoto.ts                              nuevo: cambio pendiente, vista previa, error
    useRecipeEditor.ts                             + foto al guardar y el id ya guardado
    useRecipeEditorViewModel.ts                    + foto, aviso y cambios sin guardar
  models/recipe-photo.interfaces.ts, .types.ts     nuevos
  models/recipe-catalog.* y recipe-editor.*        + foto
  services/
    recipe-photos.service.ts                       nuevo: firmar, guardar el cambio y borrar archivos
    recipes.service.ts                             pide los enlaces y borra la foto al eliminar
  utils/
    validateRecipePhoto.ts                         nuevo
    toRecipeSummary.ts, toRecipeEditorValues.ts    + foto
    recipe-editor.reducer.ts                       + PHOTO_FAILED y savedRecipeId
  constants/recipes.constants.ts                   + límites, textos, estados, bucket, RPC
  specs/E2E.md                                     nuevo
  tests/                                           los de la historia y los pendientes de 94 y 95

e2e/features/recipes/                              nuevo: recipes.spec.ts y recipes.helpers.ts
types/database.types.ts                            + photo_path y set_recipe_photo (solo esas líneas)
docs/documento-proyecto.md                         §6: recipes.photo_path y el bucket
```

### Datos

**Migración `059`:**

1. `recipes.photo_path text` con `check`: nulo, o `{id de la fila}/{uuid}.{jpg|png|webp}`. La regla vive en la tabla, así vale también para una escritura directa.
2. `grant update (photo_path) on public.recipes to authenticated`. Sin permiso de insert. Las políticas de `recipes` (007) ya limitan el update al dueño.
3. `set_recipe_photo(target_recipe_id uuid, new_photo_path text) returns text`, `security invoker`, `search_path` vacío: sesión (`42501`), lee la ruta actual con `for update` (sin fila: `P0002`), guarda la nueva y devuelve la anterior. Una ruta inválida la rechaza el `check` (`23514`).
4. Bucket `recipe-photos`: privado, 5 242 880 bytes, tres tipos.
5. Políticas de `storage.objects`:

| Operación | Condición además del bucket |
|---|---|
| select | `exists` la receta de la carpeta (pasa por la RLS de `recipes`), **o** `owner_id = auth.uid()::text` |
| insert | nombre `{uuid}/{uuid}.{ext}` y receta de la carpeta con `owner_id = auth.uid()` |
| delete | `owner_id = auth.uid()::text` |

Cuidados:
- Dentro del `exists`, `name` sería el de la **receta**: siempre `storage.objects.name`. La prueba lo cubre con una receta cuyo nombre parece una ruta.
- La carpeta se convierte a `uuid` dentro de un `case` que antes revisa su forma, para que un nombre raro dé "no" y no un error.
- `owner_id` de `storage.objects` lo pone Storage con la sesión, no el cliente.

**Lectura:** `CATALOG_SELECT` cambia `image_url` por `photo_path` y `EDITOR_SELECT` la suma. `createSignedUrls(rutas, 3600)` una vez por carga.

### Flujo

1. **Catálogo:** recetas → rutas que no son nulas → enlaces. Si firmar falla, el mapa queda vacío y el catálogo se muestra igual.
2. **Elegir:** `validateRecipePhoto(file)`; con error se avisa y no cambia nada; si no, `replace` con `URL.createObjectURL`. El enlace local se libera al cambiar o salir.
3. **Guardar:** `saveRecipe` → `SAVED` con el id → si la foto cambió, `saveRecipePhoto({ recipeId, change })`.
4. **`saveRecipePhoto`** (no lanza): con `replace`, sube a `{recipeId}/{uuid}.{ext}`; llama a `set_recipe_photo`; borra la anterior. Si la base rechaza la ruta, borra la recién subida. Devuelve `saved`, `notFound` o `failed`.
5. **Foto fallida:** `PHOTO_FAILED` guarda `savedRecipeId`, vuelve a `editing` con el aviso y sin navegar. El próximo guardado usa ese id, así que edita en vez de crear.
6. **Eliminar:** `delete … select("photo_path")` devuelve la ruta de la fila borrada; después se borra el archivo, sin esperar ni mostrar un fallo.

### Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| RPC aparte para la foto | Un parámetro más en `save_recipe` | Cambiar la firma crea una sobrecarga, y la ruta necesita el id que `save_recipe` devuelve |
| RPC y no un update directo | `update` desde el cliente | Devuelve la ruta anterior en la misma operación: dos pestañas no dejan archivos perdidos |
| `security invoker` | `security definer` | La RLS y el `check` ya dicen quién y qué; no hace falta más poder |
| Borrar la receta con `select("photo_path")` | Leer la ruta antes | Una operación: es la ruta de lo que de verdad se borró |
| Guardar dos veces la receta al reintentar | Un botón que reintente solo la foto | Editar es repetible y el usuario pudo cambiar algo más; un solo botón, un solo camino |
| Foto en su propio hook y servicio | Todo en `useRecipeEditor` | El editor ya tiene reducer, carga y guardado; la foto tiene su propio ciclo |
| Promover solo el mapa de tipos | Compartir el campo o la validación con el perfil | Es el mismo dato con dos consumidores; el campo (4:3 y cuadrado), los límites y los textos son distintos |
| Sin tope de archivos por receta | Contar archivos en la política | No frena a quien crea muchas recetas, y archivos sueltos podrían bloquear a un usuario legítimo |

### Seguridad

- Bucket privado nuevo, políticas de Storage y una columna escribible: `security-reviewer` antes de `waiting qa`.
- El cliente manda una ruta, nunca una URL; el `check` exige la carpeta de esa receta.
- Para sumar a los miembros (D1) alcanza con la RLS de `recipes`: la lectura la sigue. **Subir y borrar quedan solo del dueño**, y ahí se decide si se abren.
- Los enlaces firmados valen una hora: quien reciba uno ve la foto hasta que venza.

### Deuda conocida

- **Archivos sueltos** si falla la limpieza, si se cierra la pestaña justo al guardar o eliminar (la limpieza no se espera), o si se borra la cuenta: no hay un proceso que los junte (seguridad, Medio, aceptado).
- **Subidas sin tope** (seguridad, Medio, aceptado): el dueño de una receta, también con sesión anónima como en `avatars`, puede subir por la API archivos que nadie usa. Un tope por receta no lo frena. Si molesta: un proceso que borre lo que no esté en `photo_path` y tenga más de un día.
- **Ubicación en los metadatos:** decidir antes de D1.
- **Sin caché ni miniaturas:** hasta 5 MB por tarjeta.
- **`image_url`** queda sin uso hasta que `main` deje de leerla.
- **Receta borrada por otra vía** (API o cascada al borrar la cuenta): su archivo queda suelto.

---

## SCRUM-162: compartir recetas con la familia

> **Verificado el 2026-11-24** contra `develop` (7f7c46b): la última migración es la `059`; la PR abierta 108 tiene la `050`. Esta historia usa la **`060`** o la siguiente libre. Reemplaza "Integración con households (pendiente)".

### Archivos

```
supabase/
  migrations/060_share_recipes.sql                 funciones, políticas, RPC, trigger
  tests/060_share_recipes.test.sql                 prueba con rollback y varios usuarios

features/recipes/
  components/
    RecipeAudienceField.tsx                        nuevo: "¿Para quién es?"
    RecipeCopyAction.tsx                           nuevo: "Guardar copia personal" y su resultado
    RecipeCard.tsx                                 + etiqueta "Familia" y la copia
    RecipeDeleteDialog.tsx                         + aviso para toda la familia
    RecipeEditor.tsx                               + el campo
    models/…Props
  hooks/
    useRecipeCopy.ts                               nuevo: estado por tarjeta, doble clic
    useRecipeEditor.ts, useRecipeEditorViewModel.ts  + destino y guardado completo
    useRecipeCatalogViewModel.ts                   + copia y recarga
  models/
    recipe-sharing.interfaces.ts, .types.ts        nuevos
    recipe-catalog.*, recipe-editor.*, recipe-photo.*  + destino y ruta de la foto
  services/
    recipe-sharing.service.ts                      nuevo: tengo familia, compartir, copiar
    recipe-save.service.ts                         nuevo: receta → foto → compartir
    recipe-photos.service.ts                       + limpiar al subir, + limpiar la guardada
    recipes.service.ts                             + household_id y el error de productos personales
  utils/
    removePhotoMetadata.ts                         nuevo
    toRecipeSummary.ts, recipe-editor.reducer.ts   + destino y SHARE_FAILED
  constants/recipes.constants.ts                   textos, RPC, estados
  tests/

types/database.types.ts                            solo las funciones y la relación nuevas
docs/documento-proyecto.md                         §6: recetas personales y de la familia
```

`features/meal-planner/` y `features/household/` no cambian de código: el selector del planificador y la lista ya leen lo que la RLS deja ver. Se agrega un test al planificador solo si algún texto da por hecho "tus recetas".

### Datos: migración `060`

1. **`current_household_id() returns uuid`**, `stable`, `security definer`, `search_path` vacío: la familia de quien llama; nulo sin sesión o con sesión anónima. Una sola fuente para políticas y RPC.
2. **FK** `recipes.household_id → households (id) on delete set null` e índice. Antes, un `do` que se detiene si hay filas con una familia que no existe. `set null` y no `no action`: con `no action` la FK fallaría antes de que corra el trigger de la `024`.
3. **Políticas.** Receta visible = `(household_id is null and owner_id = (select auth.uid())) or household_id = (select public.current_household_id())`.

| Tabla | Operación | Regla nueva |
|---|---|---|
| `recipes` | select, update, delete | receta visible (el insert no cambia: propia y personal) |
| `recipe_ingredients` | select, delete | `exists` la receta, que ya pasa por su RLS |
| `recipe_ingredients` | insert, update | lo anterior y, si la receta es de la familia, producto común o de esa familia |
| `list_item_recipe_requirements` | insert, update | item visible y receta visible |
| `meal_plans` | insert, update | las de hoy, con receta visible en vez de propia |
| `storage.objects` | select | la subió, o una receta visible tiene `photo_path = storage.objects.name` |
| `storage.objects` | insert | la forma de hoy y receta visible en vez de propia |
| `storage.objects` | delete | la subió **y** ninguna receta la usa |

4. **`is_recipe_photo_in_use(text) returns boolean`**, `security definer`: la política de borrado debe contar también recetas que no ve quien borra. Índice en `photo_path`.
5. **`photo_path`:** se quita el permiso de update; el `check` pasa a `{uuid}/{uuid}.{ext}` porque una copia apunta a otra carpeta.
6. **`set_recipe_photo`** pasa a `security definer` (ya no hay permiso de columna): repite la regla de visible, exige la carpeta de la receta (`23514`) y conserva firma y errores.
7. **`save_recipe`**: misma firma, sigue `invoker`. Tras el update, si la receta es de la familia y hay productos personales, lanza `22023` con hint `recipe_personal_products` y los nombres en `detail`. La política del punto 3 lo cubre por la API directa.
8. **`share_recipe(target_recipe_id uuid) returns text[]`**, `security definer`: cuenta registrada (`42501`); bloquea la familia y después la propia fila de `household_members` (`for key share`, el orden de 023 y 026) y sin familia responde `42501` con hint `recipe_no_household`; bloquea la receta propia y personal (`for update`; si no, `P0002`, salvo que ya sea de esa familia, que cuenta como hecho). Devuelve los nombres de los productos personales y, si no hay, comparte y devuelve vacío.
9. **`copy_recipe(target_recipe_id uuid) returns uuid`**, `security definer`: receta de la familia de quien llama, o `P0002`.
10. **`clone_recipe(source_id, new_owner_id, excluded_household_id)`**, sin permiso de ejecución para nadie: la usan la 9 y el trigger. Con `excluded_household_id` omite los productos de esa familia, y devuelve nulo si no queda ninguno.
11. **Trigger** `after delete on household_members`, `security definer`. Sale sin hacer nada si la familia ya no existe (disolución) o el usuario ya no existe (cuenta borrada). Si no:
    1. por cada receta de la familia de la que era dueño: clona, mueve sus espacios de plan a la copia y pasa el original al admin;
    2. borra sus espacios de plan que sigan en recetas de esa familia.

**Concurrencia:** compartir y salir a la vez se ordenan por el bloqueo de la membresía (regla 66); compartir y guardar, por el de la receta. Un insert directo de ingrediente en el mismo instante se puede colar (aceptado: lo hace el propio dueño por la API y solo deja un ingrediente vacío).

### Flujo del editor

1. Al cargar se pide `current_household_id` (¿tiene familia?) y, si se edita, el destino guardado. Si falla la primera, el campo no aparece.
2. `saveRecipeWithExtras` (no lanza) hace receta → foto → compartir y devuelve una unión discriminada: `saved`, `notFound`, `saveFailed`, `personalProducts` (nombres), `photoFailed`, `shareFailed`, `noHousehold`. El hook solo traduce cada una a una acción; las que ya guardaron la receta llevan su id.
3. **Foto:** `removePhotoMetadata(file)` antes de toda subida: `createImageBitmap` con la orientación aplicada → canvas → `toBlob`. El lado mayor baja a 2048 px, porque los navegadores de celular no dibujan fotos muy grandes. La extensión sale del tipo del resultado (Safari puede devolver PNG al pedir WebP). Si pesa más de 5 MB o el tipo no sirve, foto fallida.
4. **Al compartir con la foto guardada sin cambios:** se descarga, se limpia y se guarda como una nueva. Si falla: `shareFailed`.
5. Reintentar vuelve a hacer los pasos: todos son repetibles.

### Catálogo

`household_id` se suma a `CATALOG_SELECT`; `toRecipeSummary` da `isShared`. Copiar llama a la RPC y vuelve a pedir el catálogo, para que la copia traiga su foto y orden. Si la recarga falla, la copia igual se anuncia.

### Decisiones

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Función de familia, usada en las políticas | Repetir el `in (select …)` de la `024` | Falta excluir anónimos en cinco tablas; con `(select …)` se calcula una vez por consulta |
| RPC `share_recipe` aparte | Un parámetro en `save_recipe` | La foto va entre guardar y compartir, y cambiar la firma crea una sobrecarga |
| Devolver los nombres | Solo un error | La interfaz tiene que decir cuáles cambiar |
| Archivo compartido por referencia | Copiar el archivo | La base no copia archivos, y al remover no está el dueño |
| Trigger | Editar `023` y `026` | Cubre toda salida sin tocar lo de Laura |
| Consultar la familia desde esta feature | Importar el servicio de `household` | Una feature no importa de otra; la respuesta es un booleano |
| Servicio que orquesta el guardado | Dejarlo en `useRecipeEditor` | Siete desenlaces; se prueba sin React |

### Seguridad

- `security-reviewer` obligatorio: cinco tablas con RLS nueva, Storage y siete funciones, varias `security definer`. Todas con `search_path` vacío, `revoke … from public, anon` y el usuario desde `auth.uid()`.
- Prueba SQL con: dueño, miembro, admin, exmiembro, otra familia, anónimo y `anon`.
- Un miembro puede borrar lo de todos: decidido por producto y avisado en la ayuda y el diálogo.

### Deuda conocida

- **Archivos sueltos** (regla 74).
- **Productos de la familia:** tras disolverla quedan sin dueño visible (`product_catalog.household_id` no tiene FK ni la `024` los libera). Una receta que los usaba conserva el ingrediente, pero sin nombre: verificar que las pantallas lo toleren. Arreglarlo es del módulo de productos; avisar a su responsable.
- **Cuenta borrada:** tarea aparte (17.11).
- **PNG grande:** recodificado puede pesar más de 5 MB; con el tope de 2048 px es raro.
