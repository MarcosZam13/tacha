# Plan: MyProducts (SCRUM-86) + Crear producto personalizado (SCRUM-87 / HU-56)

## Árbol de archivos

### Existentes — `features/my-products/` (SCRUM-86, sin cambios de forma)

```
features/my-products/
  MyProducts.tsx                        Entrada: título + CatalogTabs + estados (ViewModel → UI)
  components/
    MyProductsEmptyState.tsx            CA-02: texto exacto del ticket
  constants/
    my-products.constants.ts            Texto de la pantalla, estados, nombre/columnas de household_members
  hooks/
    useMyProductsViewModel.ts            Llama a listMyProducts, deriva estado, adapta a tarjetas
  models/
    my-products.interfaces.ts            MyProductsViewModel
  services/
    my-products.service.ts               listMyProducts(): resuelve household, consulta product_catalog
  specs/
    SPEC.md / plan.md / tasks.md
  tests/
    MyProducts.page.ts
    MyProducts.test.tsx
    my-products.service.test.ts
```

### Nuevos — HU-56 (SCRUM-87)

```
components/create-product-form/
  CreateProductForm.tsx                  Formulario controlado: nombre, marca, categoría, tamaño, checkbox de compartir
  models/
    CreateProductFormProps.interface.ts
constants/
  create-product-form.constants.ts       Textos, estados del formulario, columnas/tabla y RPC de este formulario
services/
  personal-product.service.ts            createPersonalProduct(), hasHousehold(): llama al RPC nuevo
hooks/
  useCreateProductForm.ts                 Estado del formulario (open/submitting/error), validación, llamada al servicio
app/(app)/catalogo/
  mis-productos/page.tsx                  Existente (SCRUM-86); agrega el botón "+ Agregar producto"
```

**Por qué `CreateProductForm` nace en `components/` y no dentro de `features/my-products/`:**
CA-04 (de esta misma historia) exige que `features/catalog/` abra el mismo formulario
desde el estado "sin resultados" — el segundo consumidor ya es real y conocido antes
de escribir la primera línea, así que no tiene sentido construirlo privado y
promoverlo un commit después (`component-architecture §1` pide promover con el
segundo consumidor *real*, que acá ya existe desde el día 1 de esta historia).

**Por qué `personal-product.service.ts` va en `services/` (raíz, compartido) y no en
`features/my-products/services/`:** lo llama tanto el botón de "Mis productos" como
el enlace de "sin resultados" en `features/catalog/` — mismo criterio que ya separa
`services/supabase.client.ts` de los servicios propios de cada feature.

**Desviación de este plan (2026-10-29):** no se crea `services/category.service.ts`.
Al escribir el código de la sección 8 se encontró que `services/catalog.service.ts`
ya tiene `getCategories()` (de HU-52/SCRUM-84: misma consulta exacta a `categories`,
`select("id, name").order("name")`), ya consumida por
`features/catalog/hooks/useCatalogSearchViewModel.ts` y ya con su propio test. Su
comentario incluso dice "las usan los chips de esta pantalla y, más adelante, el
selector de SCRUM-87" — este plan simplemente no lo había visto al escribirse.
Crear `category.service.ts: listCategories()` habría sido una segunda función
idéntica a la primera (`AGENTS.md` prohíbe wrappers innecesarios para resolver algo
en una línea; `component-architecture §1` pide reusar antes de construir). El
selector de `CreateProductForm.tsx` (sección 9) llama a `getCategories()`
directamente. `hasHousehold()` sí es nueva (sección 8.1): decide si se muestra el
checkbox de compartir, consulta mínima propia a `household_members` — mismo
criterio que `getCurrentHouseholdId()` en
`features/my-products/services/my-products.service.ts` (decisión 4), sin
reusar `getHouseholdMembership()` de `features/household` porque esa expone
`householdName`/`role`, no lo que este formulario necesita (solo si existe o no).

**Desviación de este plan (2026-10-29, hallazgo del `security-reviewer` al cerrar
el ticket):** la migración 031 (ya escrita cuando se armó este plan) no tocaba RLS,
asumiendo que `product_catalog`/`product_catalog_variants` (`using (true)`) seguían
siendo correctas para lectura — cierto antes de que existiera `owner_id`, falso desde
que existe un producto personal sin compartir (SPEC.md §10 lo decía explícito y
quedó mal). Se agrega la migración 032: reemplaza esas dos policies (y la de
`product_brands`, misma cadena) por catálogo global + propio + household,
restringidas a `authenticated` — mismo criterio que ya usa `lists` (024). La misma
migración corrige un bug de puntos relacionado: `create_personal_product` dejaba
`owner_id` y `household_id` a la vez cuando se comparte, duplicando el producto en
`listMyProducts()`. Detalle completo en el encabezado de
`supabase/migrations/032_fix_product_catalog_rls.sql`.

### Cambios en archivos existentes

- `features/my-products/MyProducts.tsx`: agrega el botón "+ Agregar producto" en la
  cabecera, que abre `<CreateProductForm />`; al cerrar con éxito, refresca
  `useMyProductsViewModel` (mismo patrón que cualquier mutación seguida de refetch
  ya usado en el proyecto, ej. `shopping-list.service.ts`).
- `features/my-products/services/my-products.service.ts` → `listMyProducts()`: se
  extiende de forma aditiva. Hoy, sin `household_id`, resuelve directo a `[]`. Pasa
  a: si hay `household_id`, la consulta de siempre; si no, consulta por
  `owner_id = session.user.id` en vez de cortar a vacío. Se combinan los dos
  resultados cuando el usuario tiene household **y** productos propios sin
  compartir (`owner_id = usuario` con `household_id = null`) — ningún producto
  personal se pierde de este listado solo por tener household.
- `features/catalog/components/CatalogEmptyState.tsx`: el comentario actual dice
  "sin enlace: esa pantalla todavía no existe (CA-04)" — deja de ser cierto. Se
  agrega el enlace/botón que abre `<CreateProductForm />` (mismo componente,
  importado desde `components/create-product-form/`).

## Datos

Verificado contra la base real (`ifvwumejbfpowxlkjfiu`), no supuesto.

1. **Categorías (CA-01, select del formulario):** `getCategories()` ya existente en
   `services/catalog.service.ts` (ver "Desviación de este plan" más abajo) — no hay
   `CREATE_PRODUCT_FORM_DB.TABLE.CATEGORIES` propio, se reusa tal cual.
   Policy real `"public read categories"` (`for select to public using (true)`) — sin
   RPC, mismo criterio que SCRUM-84 ya usa para sus chips (heads-up de Daniel en el
   comentario de Jira 10049 de SCRUM-87, puesto durante SCRUM-84).

2. **Guardar el producto — RPC nueva, no un insert directo:**
   ```ts
   getSupabaseClient().rpc(CREATE_PRODUCT_FORM_DB.RPC.CREATE_PERSONAL_PRODUCT, {
     product_name: input.name,
     category_id: input.categoryId,
     base_unit: input.baseUnit,
     base_quantity: input.baseQuantity,
     brand_name: input.brandName ?? null,
     share_with_household: input.shareWithHousehold,
   });
   ```
   La función (migración nueva, número a coordinar — ver §12 de `SPEC.md`):
   - `security definer`, `set search_path = ''` (mismo endurecimiento que toda
     función `security definer` del proyecto desde la 020).
   - Resuelve `household_id` **internamente** con `auth.uid()` contra
     `household_members`, nunca recibido como parámetro — mismo criterio de
     seguridad que `ensure_general_list_id` (nadie puede mandar un household ajeno).
   - Si `share_with_household` es `true` y el usuario tiene household, guarda ese
     `household_id`; si no, `household_id = null`, sin excepción (CA-03, "personal
     por defecto" — ver `SPEC.md §5` y `§15`).
   - Inserta `product_catalog` (`owner_id = auth.uid()`, `household_id` como
     arriba, `category_id`, `name`, `source = 'manual'`), después
     `product_catalog_variants` (`product_catalog_id`, `base_unit`,
     `base_quantity`), y si hay `brand_name`, `product_brands`
     (`product_catalog_variant_id`, `name`) — todo en una sola transacción.
   - Valida `product_name`/`category_id` no vacíos y `category_id` existente antes
     de insertar (CA-02 reforzado también del lado del servidor, no solo en el
     formulario).
   - Devuelve el `id` del producto creado.

3. **Extensión de `listMyProducts()` (household_id → también owner_id):**
   ```ts
   // Antes (SCRUM-86): sin householdId, retorna [] directo.
   // Ahora (SCRUM-87), aditivo:
   const [byHousehold, byOwner] = await Promise.all([
     householdId ? queryByHouseholdId(householdId) : Promise.resolve([]),
     queryByOwnerId(session.user.id),
   ]);
   // unión sin duplicados (un producto nunca tiene ambos a la vez por diseño del RPC)
   ```

## Flujo (HU-56)

1. Usuario toca "+ Agregar producto" (en `MyProducts.tsx` o en el enlace de
   `CatalogEmptyState.tsx`) → `useCreateProductForm` pasa a `open`.
2. Llena el formulario; `useCreateProductForm` valida nombre/categoría en cada
   cambio (CA-02) y habilita "Guardar" solo si son válidos.
3. Al guardar → `submitting` → `createPersonalProduct()` llama al RPC.
4. Éxito → `success`, se cierra el formulario, y quien lo abrió refresca su
   listado (`MyProducts.tsx` llama de nuevo a `useMyProductsViewModel`;
   `CatalogSearch.tsx`, si corresponde, no necesita refrescar nada porque el
   producto nuevo no cambia los resultados de una búsqueda ya hecha).
5. Error → `error`, el formulario se mantiene abierto con los datos ya escritos.

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| RPC nueva `security definer`, transaccional (producto + variante + marca en un solo paso) | Dos llamadas RPC separadas desde el cliente | Atómico: no puede quedar un producto sin su variante de tamaño si algo falla a medio camino. Mismo patrón que `ensure_general_list_id`/`add_recipe_to_general_list` |
| Agregar `owner_id` (nullable) a `product_catalog`, mismo patrón que `lists` | Bloquear la creación si el usuario no tiene household | `docs/documento-proyecto.md §4.5.1` ya pedía este patrón desde 2026-08-18; bloquear no cumple CA-03 ("personal por defecto") para un usuario sin household, y además `owner_id` es necesario para no confundir un producto personal con `household_id = null` con los 12 productos madre curados de SCRUM-131 |
| `household_id` solo se asigna si el usuario marca "Compartir con mi household" explícitamente, nunca automático por tener household | Asignar `household_id` automáticamente si el usuario tiene household | Mismo criterio que HU-34b (`decide_personal_lists`, verificado que existe en la base real): compartir es una decisión explícita, no un efecto de la membresía |
| `CreateProductForm` nace compartido en `components/create-product-form/` | Construirlo dentro de `features/my-products/` y promoverlo cuando `features/catalog/` lo necesite | El segundo consumidor (CA-04) ya es real dentro de esta misma historia, no en un ticket futuro — promoverlo "después" no evitaría nada |
| Sin subida de foto; placeholder por defecto (reusa el de `CatalogCard` para productos sin `image_url`) | Agregar un bucket de Supabase Storage para fotos de usuario | Decisión explícita del dueño de la historia (2026-10-28): no competir por el espacio del plan gratuito de Supabase, que el scraping ya usa bastante |
| Campos del formulario: solo nombre, marca, categoría, tamaño (los de HU-56) | Incluir también tienda y precio de referencia, como los dibuja `docs/DESIGN.md §7.1b` | Tienda/precio son de HU-57/SCRUM-88, un ticket distinto todavía "To Do" — construirlos acá sería adelantar trabajo fuera de esta responsabilidad |

## Dependencias verificadas

- `categories`: policy real `"public read categories"` confirmada (`pg_policies`).
- `product_catalog`/`product_catalog_variants`: sin `INSERT` para `anon`/`authenticated`
  confirmado (`information_schema.role_table_grants`) — la RPC nueva es obligatoria,
  no una preferencia de diseño.
- `lists`: `owner_id uuid not null default auth.uid()` + `household_id` nullable,
  confirmado — es el precedente real que se copia para `product_catalog`.
- `decide_personal_lists`, `get_personal_lists_decision_state`,
  `ensure_general_list_id`, `find_general_list_id`: confirmado que existen de verdad
  en la base (`information_schema.routines`), no solo en una migración sin aplicar.
- Pendiente (no bloqueante para escribir la spec, sí para escribir código): número
  de migración a coordinar con el equipo (próximo libre verificado: 031) y aviso al
  grupo por tocar una tabla que SCRUM-86 ya construyó encima.
