# Plan técnico: catálogo de recetas

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

> **Verificado el 2026-09-25** contra la base real: no existen `recipes`, `recipe_ingredients` ni `households`. El catálogo tiene 28 productos madre (casi todos lácteos, del scraping de "leche") y se puede leer con cualquier rol, así que el join `recipe_ingredients → product_catalog` funciona con la sesión anónima.

## Archivos

```
features/recipes/
  RecipeCatalog.tsx                    entrada ("use client"): tabs + estados + grilla (solo presentación)
  components/
    RecipesTabs.tsx                    sub-tabs "Recetas" / "Planificador semanal"
    RecipeCard.tsx                     una tarjeta: foto o marcador, nombre, porciones, ingredientes
    RecipeCatalogEmptyState.tsx        catálogo vacío
    models/RecipeCardProps.interface.ts
    models/RecipesTabsProps.interface.ts
  hooks/
    useRecipeCatalogViewModel.ts       carga inicial (useEffect) y deriva lo que dibuja la pantalla
  models/
    RecipeRow.interface.ts             forma de una receta tal como la devuelve la consulta
    RecipeSummary.interface.ts         una receta lista para la tarjeta (textos ya armados)
    RecipeCatalogState.type.ts         unión loading / error / ready
    RecipeCatalogViewModel.interface.ts lo que el ViewModel le entrega a RecipeCatalog.tsx
  services/
    recipes.service.ts                 getRecipeSummaries(): consulta + adaptación fila → RecipeSummary
  utils/
    toRecipeSummary.ts                 adapter puro: RecipeRow → RecipeSummary (orden, principales, "+N más", inicial)
    formatServings.ts                  4 → "4 porciones", 1 → "1 porción"
  constants/
    recipes.constants.ts               textos, límite de ingredientes, tabs, estados, tablas y select
  specs/  SPEC.md · plan.md · tasks.md

app/recetas/page.tsx                   ruta delgada: solo renderiza <RecipeCatalog />
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
| Tabs dentro de la feature | Componente compartido | Hoy tiene un solo consumidor; se promueve cuando exista el planificador (SCRUM-99) |
| Seed de demo aparte de las migraciones | Insertar datos en la migración | Las migraciones son esquema; los datos de ejemplo dependen de un usuario concreto y no van a producción |

## Integración con households (pendiente)

Cuando `households` esté en `develop` (idealmente dentro de SCRUM-95, cuyo CA-04 ya habla de recetas compartidas; si no, en un ticket propio):

1. FK `recipes.household_id → households(id)`.
2. Política de lectura para miembros en `recipes`: la receta es visible si el usuario es **miembro** del `household_id` de la fila (no solo si `household_id` no es nulo). Reusar la función de membresía de la migración de households, si existe (`security definer` con `search_path` fijo si hace falta evitar recursión).
3. **Reescribir también la política de `recipe_ingredients`.** Hoy filtra por `r.owner_id` explícito; si solo se suma la política de miembros en `recipes`, los miembros verían la receta compartida sin ingredientes. Lo más simple: `exists (select 1 from public.recipes r where r.id = recipe_ingredients.recipe_id)`, porque esa subconsulta ya pasa por la RLS de `recipes` de quien consulta y queda sincronizada sola.
4. Políticas de insert/update para miembros (SCRUM-95, CA-04).
5. Excluir usuarios anónimos de todo lo que sea household (deuda ya anotada en `features/shopping-list/specs/plan.md`).
6. Frontend: selector "personal / del household" al crear o editar. El catálogo no cambia (requerimiento 4).

## Deuda para SCRUM-95 (crear y editar)

De la revisión de seguridad de esta historia:

1. **Insert en `recipes`:** `with check (owner_id = (select auth.uid()) and household_id is null)`, igual que `lists` en `004_create_lists.sql`. Sin `household_id is null`, cualquiera podría mandar un `household_id` ajeno (sin FK se guarda igual) y la receta aparecería en ese household cuando exista la política de miembros.
2. **Insert/update en `recipe_ingredients`:** el update necesita `using` **y** `with check`, ambos con el `exists` sobre una receta propia. Sin `with check`, un usuario podría mover su ingrediente a una receta ajena cambiando `recipe_id`.
3. **`image_url`:** guardar la ruta dentro de Supabase Storage, no una URL libre (con recetas compartidas, una URL propia de un miembro funcionaría como píxel de rastreo de los demás). Validar tipo y tamaño en la política del bucket, no en el `accept=` del input. No cambiar `unoptimized` por `remotePatterns` con comodín: convertiría el optimizador de Next en un proxy abierto.
4. **Validación del formulario** con esquema antes de escribir, respetando los `check` de la base (nombre 1-120, porciones 1-50, cantidad > 0, unidad `ml`/`g`/`unidad`).

## Deuda conocida

- **Nombres de producto largos:** el catálogo scrapeado guarda el nombre con marca y tamaño ("Leche entera Sabemas - 1 L"). Los ingredientes se ven así hasta que el módulo de catálogo normalice el nombre del producto madre.
- **Sin tests automatizados:** el proyecto no tiene runner. Lo primero a cubrir: `toRecipeSummary` y `formatServings` (funciones puras).
