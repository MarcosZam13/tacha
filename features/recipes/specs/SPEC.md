# Feature: Recetas

Historias (criterios en [historias-usuario.md](../../../docs/historias-usuario.md); Jira es la fuente de verdad):

- [SCRUM-94 / HU-63](https://tacha.atlassian.net/browse/SCRUM-94): ver el catálogo de recetas. Sprint 1, mergeada.
- [SCRUM-95 / HU-64](https://tacha.atlassian.net/browse/SCRUM-95): crear o editar una receta. Sprint 1, mergeada.
- [SCRUM-96 / HU-64b](https://tacha.atlassian.net/browse/SCRUM-96): eliminar una receta. Sprint 2, mergeada.
- [SCRUM-97 / HU-65](https://tacha.atlassian.net/browse/SCRUM-97): agregar una receta a la lista. Sprint 2, mergeada.
- [SCRUM-98 / HU-66](https://tacha.atlassian.net/browse/SCRUM-98): ver qué falta de una receta. Sprint 2.

El cómo (archivos, datos, flujo, decisiones) está en [plan.md](plan.md); los pasos, en [tasks.md](tasks.md).

## 1. Objetivo

Que el usuario tenga sus recetas en un solo lugar para reutilizarlas en la lista de compras o en el planificador semanal:

- **SCRUM-94:** ver de un vistazo las recetas que tiene (nombre, foto, ingredientes principales y porciones base) para elegir cuáles usar.
- **SCRUM-95:** armar sus propias recetas (nombre, porciones base e ingredientes elegidos del catálogo, cada uno con su cantidad y unidad) y corregirlas después.
- **SCRUM-96:** sacar del catálogo una receta que ya no usa, sin miedo a borrarla por un clic accidental, para mantener su lista de recetas ordenada.
- **SCRUM-97:** pasar los ingredientes de una receta a su lista de compras con un solo botón, sin buscar cada producto a mano, y saber qué le falta comprar para cocinarla sin que la app decida por él cuánto comprar de lo que se mide por volumen o peso.
- **SCRUM-98:** ver, desde la tarjeta de una receta, qué ingredientes ya compró (están tachados en su lista) y cuáles le faltan, y que ese estado se actualice solo mientras tacha, para saber si ya puede cocinarla.

## 2. Alcance

### SCRUM-94: catálogo

- Ruta `/recetas` con la barra de sub-tabs de la sección: "Recetas" (activa) y "Planificador semanal" (visible pero deshabilitada hasta SCRUM-99).
- Catálogo de recetas en tarjetas: foto (o un marcador si la receta no tiene), nombre, porciones base y los primeros ingredientes, con un "+N más" si hay más.
- Las recetas vienen de Supabase (`recipes` + `recipe_ingredients`); cada ingrediente está ligado a un producto madre del catálogo (`product_catalog`), como pide documento-proyecto §4.9.
- Tablas nuevas `recipes` y `recipe_ingredients`, con RLS.
- Seed de demo (`supabase/seed-demo-recipes.sql`) para poder mostrar la historia antes de que exista SCRUM-95.

### SCRUM-95: crear o editar

- Botón **"+ Nueva receta"** en el catálogo que lleva a `/recetas/nueva`.
- Acción **"Editar"** en cada tarjeta que lleva a `/recetas/{id}/editar`, con el formulario precargado.
- Formulario con **nombre**, **porciones base** e **ingredientes**.
- Ingredientes con el buscador compartido del catálogo: se elige un **producto madre** ("Leche", sin tamaño ni marca) y recién después se le asigna **cantidad** y **unidad** (`ml` / `g` / `unidad`). Al elegir el producto, la unidad se preselecciona según sus presentaciones del catálogo (leche → `ml`), y se puede cambiar.
- Cada ingrediente se puede quitar del formulario antes de guardar. El orden en que se agregan es su `position` (los primeros son los "principales" del catálogo).
- **Guardar** crea o actualiza la receta y todos sus ingredientes **en una sola operación** (todo o nada) y vuelve al catálogo, donde se ve el cambio. **Cancelar** vuelve al catálogo sin guardar.

### SCRUM-96: eliminar

- Acción **"Eliminar"** en cada tarjeta del catálogo, junto a "Editar".
- Antes de borrar, un **diálogo de confirmación** que nombra la receta y avisa que no se puede deshacer, con "Eliminar" y "Cancelar".
- Al confirmar se borra la receta **y sus ingredientes**, y la tarjeta desaparece del catálogo sin recargar la página.
- Deuda de SCRUM-95 que esta historia vuelve visible: si se borra una receta que otra pestaña está editando, al guardar ahí se muestra "No encontramos esa receta" en vez del error genérico.

### SCRUM-97: agregar a la lista

- Botón **"Agregar receta a lista"** en cada tarjeta del catálogo.
- Cada ingrediente pasa a la **lista general** del usuario (la de `/lista`). La lista guarda presentaciones concretas (variantes) en unidades enteras y la receta guarda el producto madre con una cantidad cruda, así que cada ingrediente se resuelve con las reglas 19 a 23:
  - **conteo** ("3 cebollas"): se suman unidades hasta cubrir la receta (CA-03);
  - **volumen o peso** ("1800 ml de leche"): no se calculan unidades. Si el producto ya está en la lista, lo que hay cuenta; si no alcanza, queda registrado el **faltante** (CA-04). Si el producto no está, se agrega 1 unidad para que tenga su fila.
- Por cada ingrediente de volumen o peso se registra en la base cuánto pidió la receta y cuánto falta. Ese registro es el **aviso pasivo**; mostrarlo bajo el producto en `/lista` es de SCRUM-114.
- Si la receta ya se había agregado antes desde este navegador, se pide confirmación antes de agregarla otra vez.
- Al terminar, un resumen en la tarjeta: qué se agregó, qué falta comprar y qué no se pudo agregar, con un link a la lista.
- Todo en una sola operación en la base: o entra todo, o nada.

### SCRUM-98: ver qué falta

- Botón **"Ver qué falta"** en cada tarjeta (no aparece en una receta sin ingredientes). Abre, dentro de la misma tarjeta, un panel con **cada ingrediente** y su estado: **Cubierto** o **Falta** (decidido con el responsable de la historia: sin ruta ni diálogo nuevos).
- Un ingrediente está **cubierto** cuando su producto está en la lista general del usuario, todas sus filas están **tachadas** (SCRUM-66) y ningún registro de esta receta sobre ese producto tiene faltante (reglas 29 a 31). No existe inventario o despensa en el modelo de datos, así que "lo que tengo en casa" no se puede saber (sección 14).
- Si falta, el panel dice por qué: no está en la lista, está en la lista sin tachar, o se tachó pero quedó un faltante registrado (con su cantidad, en la unidad del ingrediente).
- Un resumen arriba del panel: "Te faltan 2 de 4 ingredientes" o "Tienes todo para cocinarla".
- El panel se **actualiza solo** cuando cambia la lista (tachar, destachar, agregar o borrar un producto, o agregar otra receta), por Supabase Realtime sobre `list_items`, mientras el panel está abierto (reglas 32 y 33).

Lo que no incluye ninguna de las cinco está en la [sección 14](#14-casos-fuera-de-alcance).

## 3. Entradas

| Historia | Entrada | Tipo | De dónde |
|---|---|---|---|
| 94 | Sesión del usuario | sesión de Supabase (anónima provisional) | `ensureSession` de `services/supabase.client.ts` |
| 95 | `recipeId` | `string` opcional (sin id: receta nueva) | segmento `[id]` de `/recetas/{id}/editar` |
| 95 | Nombre | `string` | input de texto |
| 95 | Porciones base | `string` (se convierte a entero al validar) | input de texto |
| 95 | Texto de búsqueda de ingrediente | `string` | buscador compartido |
| 95 | Producto elegido | producto madre del catálogo (`CatalogProduct`) | opción del buscador |
| 95 | Cantidad por ingrediente | `string` (acepta coma decimal; se convierte a número al validar) | input de texto |
| 95 | Unidad por ingrediente | `ml` / `g` / `unidad` | selector |
| 96 | Receta a eliminar | id y nombre de la receta de la tarjeta | clic en "Eliminar" |
| 96 | Confirmación | confirmar / cancelar (botón, clic fuera o Escape) | diálogo |
| 97 | Receta a agregar | id y nombre de la receta de la tarjeta | clic en "Agregar receta a lista" |
| 97 | Confirmación para repetir | confirmar / cancelar (botón, clic fuera o Escape) | diálogo, solo si la receta ya se había agregado desde este navegador |
| 97 | Ingredientes de la receta | producto madre + `quantity_value` + `quantity_unit` | `recipe_ingredients`, leídos en la base |
| 97 | Presentaciones de cada producto | `product_catalog_variants` (`base_quantity`, `base_unit`) | catálogo, leído en la base |
| 97 | Lista general del usuario y lo que ya pidieron otras recetas | `lists` + `list_items` + `list_item_recipe_requirements` | leídos en la base |
| 98 | Receta a revisar | id y nombre de la receta de la tarjeta | clic en "Ver qué falta" |
| 98 | Cerrar el panel | clic en el mismo botón | tarjeta |
| 98 | Ingredientes de la receta | producto madre + `quantity_value` + `quantity_unit` | `recipe_ingredients`, leídos en la base |
| 98 | Lo que hay en la lista general | filas de `list_items` del producto con `checked_at`, y `list_item_recipe_requirements` de la receta | leídos en la base |
| 98 | Cambios de la lista | eventos de inserción, actualización y borrado | Supabase Realtime sobre `list_items` |

## 4. Salidas

- **SCRUM-94:** la grilla de tarjetas con los textos ya armados ("4 porciones", "+1 más", la inicial del marcador), o el mensaje de catálogo vacío, o el de error.
- **SCRUM-95:** una receta creada o actualizada en `recipes`, con sus ingredientes reemplazados en `recipe_ingredients` en el orden del formulario, y navegación al catálogo. Si algo falla: errores por campo o un mensaje general, sin perder lo escrito.
- **SCRUM-96:** la receta y sus ingredientes borrados de la base, y la tarjeta quitada del catálogo (o el estado vacío si era la última). Si algo falla: mensaje de error dentro del diálogo, sin quitar la tarjeta.
- **SCRUM-97:**
  - filas nuevas o cantidades sumadas en `list_items` de la lista general (conteos, y 1 unidad por producto de volumen o peso que no estaba);
  - un registro por ingrediente de volumen o peso en `list_item_recipe_requirements`, con lo que pidió la receta y lo que falta;
  - el id de la receta guardado en el navegador (`localStorage`), para la confirmación de la regla 27;
  - un resumen en la tarjeta con link a `/lista`.

  Si algo falla: mensaje de error en la tarjeta y la lista queda como estaba.
- **SCRUM-98:** un panel en la tarjeta con, por ingrediente: nombre, cantidad con su unidad, estado (Cubierto / Falta) y el motivo si falta, más el resumen de arriba. No escribe nada en la base. Si algo falla: mensaje de error dentro del panel.

## 5. Reglas de negocio

### Todas

1. Cada usuario ve, crea, edita y borra solo sus recetas. Lo decide RLS en la base: el frontend nunca filtra por dueño ni manda `owner_id` o `household_id`. Así, cuando se sumen las recetas del household, la pantalla no cambia.
2. Lo que valida la UI se repite en la base (`check` de las tablas, `save_recipe`, políticas): la UI es comodidad, la base es la garantía (security-practices §3).

### SCRUM-94

3. Los ingredientes principales son los primeros según el orden en que se cargaron en la receta (`position`), no alfabéticos. Se muestran hasta 3, y "+N más" si hay más.
4. Las recetas se ordenan de la más nueva a la más vieja.

### SCRUM-95

5. Nombre obligatorio (no vale solo espacios), de hasta 120 caracteres.
6. Porciones base: entero entre 1 y 50.
7. Entre 1 y 50 ingredientes. El máximo se agregó en SCRUM-97: agregar una receta a la lista recorre todos sus ingredientes en la base.
8. Cada ingrediente sale del catálogo, nunca como texto libre, y no se repite en la misma receta.
9. Cantidad mayor que 0 y de hasta 100 000; se acepta coma decimal ("0,5").
10. Unidad `ml`, `g` o `unidad`: las unidades base del catálogo, para poder sumar contra la lista (SCRUM-97).
11. No se guarda si hay errores de validación.
12. Guardar es atómico: la receta y todos sus ingredientes, o nada.

### SCRUM-96

13. Nunca se borra sin confirmación explícita en el diálogo.
14. Borrar la receta borra sus ingredientes; no quedan ingredientes huérfanos.
15. El borrado es definitivo: no hay papelera ni deshacer.
16. Si la receta ya no existe o no es del usuario, el resultado es el mismo que un borrado correcto: la tarjeta se quita y no se revela si una receta ajena existe.

### SCRUM-97

Una **presentación** es una variante del producto madre del ingrediente (`product_catalog_variants`), con su cantidad y unidad base. Las **filas del producto** son las filas de la lista con alguna presentación de ese producto.

17. Los ingredientes van a la **lista general** del usuario (se crea si no existe), con las **porciones base** de la receta.
18. Agregar es **atómico**: entran todas las filas, cantidades y registros, o nada.
19. **Conteo (CA-03).** Si el ingrediente se mide en `unidad` y la presentación también, se **suma encima** de lo que haya, en unidades de la presentación, **hasta cubrir la receta aunque sobre**, y nunca deja aviso. La presentación:
    1. si el producto tiene **exactamente una** fila en la lista, la de esa fila;
    2. si no, la **más chica que cubre** la receta con una sola unidad;
    3. si ninguna cubre sola, la **más grande**.

    Ejemplos: "3 cebollas" con presentación de 1 unidad → +3; "3 huevos" con cartones de 6 y de 12 → +1 cartón de 6; "30 huevos" → +3 cartones de 12; lista con 1 cartón de 12 y receta de 3 huevos → +1 cartón de 12.
20. **Volumen o peso, el producto ya está en la lista (CA-02, CA-04).** No se suman unidades: **lo que hay cuenta**.
    - **Disponible** = lo que suman las filas del producto (unidades × cantidad de su presentación, solo las de la misma unidad que el ingrediente) **menos** lo que ya pidieron las recetas agregadas antes sobre ese producto en esa lista.
    - Si lo disponible alcanza, no hay faltante. Si no, el **faltante** es lo que pide la receta menos lo disponible (o todo, si no queda nada disponible).
    - Se registra lo que pidió la receta y el faltante, en la fila del producto (si hay varias, la de la presentación más grande).

    Ejemplo: lista con 1 × "leche 1 L". "Flan" pide 800 ml → alcanza, faltante 0. Después "Tres leches" pide 800 ml → quedan 200 ml disponibles → faltante 600 ml.
21. **Volumen o peso, el producto no está en la lista.** Para que tenga su fila, se agrega **1 unidad** de la **más chica que cubre** la receta sola; si ninguna cubre, de la **más grande** (si el producto tiene una sola presentación, esa). Se registra lo que pidió la receta y el faltante: lo que pide menos lo que trae esa unidad (0 si cubre). Ejemplos con 200 ml, 1 L y 3,78 L: receta de 800 ml → 1 × 1 L, faltante 0; receta de 5000 ml → 1 × 3,78 L, faltante 1220 ml.
22. **Unidades que no coinciden (CA-04).** Si la unidad del ingrediente no coincide con la de ninguna presentación del producto (ej. "200 g" de un producto que se vende en ml, o "3 unidades" de uno que se vende en g), la app no puede comparar: si el producto ya tiene fila no se suma nada; si no, se agrega 1 unidad de la presentación más chica. Se registra la cantidad completa de la receta como faltante.
23. Un **aviso** es un registro con faltante mayor que 0: "+ 600 ml necesarios para Tres leches". El faltante se calcula **al agregar**: si después cambian las cantidades de la lista o se edita la receta, no se recalcula (se resuelve al tachar, SCRUM-115).
24. Los registros son **por receta**: dos recetas sobre el mismo producto tienen registros separados; la misma receta agregada otra vez acumula lo pedido y lo que falta en su registro.
25. Un registro desaparece si se borra la receta o la fila de la lista. Resolverlo al tachar es de SCRUM-115.
26. Si el producto de un ingrediente no tiene ninguna presentación en el catálogo, ese ingrediente no se agrega y el resumen lo nombra; el resto sí se agrega.
27. **Receta repetida.** Si la receta ya se había agregado antes **desde este navegador**, se pide confirmación antes de agregarla otra vez ("Ya agregaste Tres leches a tu lista. ¿Agregarla otra vez?"). Confirmar la agrega de nuevo con las reglas 17 a 26; cancelar no cambia nada. La primera vez no se pregunta nada. Es una comodidad para no agregar sin querer, no una regla de la base: desde otro navegador, o con los datos del sitio borrados, se agrega sin preguntar.
28. Nunca se abre una ventana para decidir **qué comprar** (CA-05): cuánto comprar de lo que se mide por volumen o peso se decide al tachar (SCRUM-115).

### SCRUM-98

Las **filas del producto** son las de la regla de SCRUM-97: filas de la lista general con alguna presentación del producto madre del ingrediente. Todo se calcula en la base, sobre la lista general personal del usuario (`household_id is null`).

29. **Cubierto (CA-01).** Un ingrediente está cubierto si el producto tiene al menos una fila en la lista general, **todas** sus filas tienen `checked_at` (están tachadas, sin importar el día) y la suma de `quantity_missing` de los registros de **esta receta** sobre ese producto es 0. Un ingrediente de conteo no deja registro (regla 19), así que para él basta con que sus filas estén tachadas.
30. **Falta (CA-01).** Cualquier otro caso, con un motivo:
    1. `notInList`: el producto no tiene ninguna fila en la lista general;
    2. `notChecked`: tiene filas, pero alguna sin tachar;
    3. `short`: todas están tachadas pero el registro de la receta quedó con faltante mayor que 0; el panel muestra esa cantidad en la unidad del ingrediente.
    Si coinciden `notChecked` y `short`, se muestra `notChecked` (lo primero que hay que hacer es tachar).
31. **No se calcula contra cantidades.** La app no compara unidades compradas con la cantidad cruda de la receta: eso lo decidió la regla 19 al agregar (conteos) y el registro de faltante (volumen o peso). Lo mismo que SCRUM-97 no convierte, esta historia tampoco (documento-proyecto §4.9.1).
32. **Tiempo real (CA-02).** Mientras el panel está abierto, cualquier cambio en `list_items` del usuario (tachar, destachar, agregar, quitar, cambiar cantidad) vuelve a pedir el estado a la base. El cliente no recalcula nada por su cuenta: el estado que se dibuja es siempre el que devolvió la base, para no tener dos copias de la regla 29.
33. Al cerrar el panel, o al salir de `/recetas`, la suscripción se cancela. Solo hay una suscripción a la vez (un panel abierto a la vez).
34. Una receta cuyos ingredientes se editaron o se borraron mientras el panel está abierto se resuelve en la siguiente actualización: si ya no existe, "No encontramos esa receta." (regla 16 aplicada a lectura).
35. Abrir el panel es de **solo lectura**: no agrega nada a la lista ni cambia el registro de faltantes. Agregar sigue siendo "Agregar receta a lista" (SCRUM-97).

## 6. Estados

Cada pantalla tiene una unión de estados derivada de constantes, no varios booleanos que se puedan contradecir.

| Pantalla | Estados | Notas |
|---|---|---|
| Catálogo (SCRUM-94) | `loading` · `error` · `ready` | `ready` sin recetas es el catálogo vacío, no un estado aparte |
| Editor (SCRUM-95) | `loading` · `notFound` · `loadFailed` · `editing` · `saving` | Una receta nueva arranca en `editing`; editar arranca en `loading` |
| Eliminación (SCRUM-96) | `idle` · `confirming` · `deleting` · `failed` | `confirming`, `deleting` y `failed` siempre llevan la receta elegida: no puede haber "eliminando" sin receta |
| Agregar a la lista (SCRUM-97) | `idle` · `confirmingRepeat` · `adding` · `added` · `failed` | Fuera de `idle` siempre hay una receta elegida; `added` lleva además el resumen. `confirmingRepeat` es el diálogo de la regla 27, antes de agregar. Se agrega una receta a la vez |
| Qué falta (SCRUM-98) | `closed` · `loading` · `error` · `notFound` · `ready` | Fuera de `closed` siempre hay una receta elegida; `ready` lleva los ingredientes con su estado. Un solo panel abierto: abrir otro cierra el anterior. Las actualizaciones por Realtime no pasan por `loading` (el panel no parpadea): reemplazan los datos de `ready` |

## 7. Errores

| Historia | Error | Cómo se muestra |
|---|---|---|
| 94 | Falla de red o de Supabase al cargar | "No se pudieron cargar tus recetas. Intenta de nuevo." No se dice "no tienes recetas" porque no se sabe si es cierto |
| 95 | Nombre vacío, solo espacios o de más de 120 caracteres | Error bajo el campo |
| 95 | Porciones vacías, 0, negativas, con decimales o más de 50 | Error bajo el campo |
| 95 | Receta sin ingredientes, o con más de 50 | Error en la sección de ingredientes |
| 95 | Cantidad vacía, 0, negativa, no numérica o mayor a 100 000 | Error bajo la fila del ingrediente |
| 95 | Producto que ya está en la receta | "Ese producto ya está en la receta."; no se duplica |
| 95 | Falla al guardar | "No se pudo guardar la receta. Intenta de nuevo." El formulario conserva todo y se puede reintentar |
| 95 | Receta inexistente, ajena o id inválido en la URL | "No encontramos esa receta." (las tres iguales: RLS no la devuelve) |
| 95 | La receta se borró mientras se editaba (al guardar) | "No encontramos esa receta." (agregado en SCRUM-96) |
| 95 | Falla al cargar la receta para editar | "No se pudo cargar la receta. Intenta de nuevo.", sin un formulario vacío que parezca una receta nueva |
| 96 | Falla de red o de Supabase al borrar | Mensaje de error dentro del diálogo, que sigue abierto; se puede reintentar o cancelar. La tarjeta no desaparece |
| 97 | Falla de red o de Supabase al agregar | "No se pudo agregar la receta a tu lista. Intenta de nuevo." en la tarjeta. No se agregó nada (regla 18) |
| 97 | La receta ya no existe o es ajena (se borró en otra pestaña) | "No encontramos esa receta." en la tarjeta |
| 97 | Ingredientes sin presentación en el catálogo | No es un error: el resumen los nombra ("No se pudieron agregar: …") y el resto se agrega |
| 98 | Falla de red o de Supabase al pedir el estado | "No se pudo revisar qué falta. Intenta de nuevo." dentro del panel, con "Reintentar". No se muestra "Tienes todo" porque no se sabe |
| 98 | La receta ya no existe o es ajena | "No encontramos esa receta." dentro del panel |
| 98 | Falla al actualizar por Realtime (después de estar en `ready`) | Se conserva lo último que se vio y se reintenta en el siguiente cambio; no se reemplaza el panel por un error |
| 98 | Falla la suscripción a Realtime | El panel funciona sin actualizarse solo, y "Reintentar" / cerrar y abrir lo refresca. No se oculta el estado ya calculado |

## 8. UI esperada

### SCRUM-94

- Sub-tabs "Recetas" y "Planificador semanal · Próximamente".
- Grilla de tarjetas: foto o marcador con la inicial, nombre, porciones, chips de ingredientes y "+N más".
- Mensaje de catálogo vacío y mensaje de error.

### SCRUM-95

- Link "+ Nueva receta" en el catálogo y "Editar" en cada tarjeta.
- Formulario: nombre, porciones base, buscador de ingredientes, filas de ingrediente (producto + cantidad + unidad + "Quitar"), "Guardar receta" y "Cancelar".
- "Guardando…" con el botón deshabilitado mientras guarda.

### SCRUM-96

- Botón "Eliminar" en cada tarjeta, junto a "Editar".
- Diálogo de confirmación (primitivo `Modal`) con el nombre de la receta, el aviso de que no se puede deshacer, el botón "Eliminar" (variante `destructive` de `Button`) y "Cancelar".
- "Eliminando…" con los dos botones deshabilitados mientras borra.
- Mensaje de error dentro del diálogo.

### SCRUM-97

- Botón "Agregar receta a lista" en cada tarjeta. No aparece en una receta sin ingredientes (no tendría qué agregar).
- Diálogo de confirmación (primitivo `Modal`) cuando la receta ya se había agregado: "Ya agregaste Tres leches a tu lista. ¿Agregarla otra vez?", con "Agregar otra vez" y "Cancelar".
- "Agregando…" con el botón deshabilitado mientras agrega; los de las demás tarjetas también, porque se agrega una receta a la vez.
- Resumen en la tarjeta al terminar, con link "Ver lista". Ejemplo: "Agregaste Tres leches a tu lista. Te falta comprar: Leche X (600 ml)." Si hubo ingredientes sin presentación: "No se pudieron agregar: …".
- Mensaje de error en la tarjeta si falla.
- `/lista` no cambia en esta historia: el aviso bajo cada producto lo dibuja SCRUM-114.

### SCRUM-98

- Botón "Ver qué falta" en cada tarjeta, junto a "Agregar receta a lista". Con el panel abierto dice "Ocultar qué falta".
- Panel dentro de la tarjeta, debajo de las acciones: resumen ("Te faltan 2 de 4 ingredientes" / "Tienes todo para cocinarla") y una lista de ingredientes.
- Cada ingrediente: nombre, cantidad con unidad (`formatRecipeQuantity`, ej. "800 ml"), y una etiqueta **Cubierto** o **Falta**. Si falta, el motivo en texto: "No está en tu lista", "En tu lista, sin tachar" o "Te falta comprar 600 ml".
- El estado se distingue por **texto**, no solo por color.
- "Cargando…" al abrir; mensaje de error con "Reintentar".

## 9. Accesibilidad

- Cada input tiene su label asociado; los errores son texto junto al campo, no solo color.
- La navegación ("+ Nueva receta", "Editar", "Cancelar" del editor, "Ver lista") son links y las acciones ("Guardar receta", "Eliminar", "Agregar receta a lista") son botones: un link se puede abrir en otra pestaña y el lector de pantalla anuncia bien cada uno.
- Los botones tienen texto claro. "Eliminar" y "Agregar receta a lista" nombran la receta para el lector de pantalla, porque hay uno por tarjeta en la misma página.
- Los diálogos son `role="dialog"` con `aria-modal`, tienen título y se cierran con Escape (comportamiento del `Modal` compartido). Mientras borra no se puede cerrar.
- El resumen y el error de agregar se anuncian solos (`role="status"` y `role="alert"`), porque aparecen sin que cambie la página.
- "Ver qué falta" es un botón con `aria-expanded` y `aria-controls` del panel, y nombra la receta para el lector de pantalla (como "Eliminar", hay uno por tarjeta).
- El panel anuncia los cambios con `role="status"` y `aria-live="polite"`: cuando tachas algo en otra pestaña, el lector oye el resumen nuevo, no toda la lista. El error va en `role="alert"`.
- El estado de cada ingrediente es texto ("Cubierto" / "Falta") dentro de un chip; el color solo refuerza.
- El marcador de la foto es decorativo (`aria-hidden`); la foto real lleva el nombre de la receta como `alt`.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind CSS con los tokens `tacha-*`.
- La lógica vive en el ViewModel (`hooks/`), el acceso a datos en el servicio (`services/recipes.service.ts`) y los `.tsx` solo presentan (component-architecture §3).
- Cero literales: textos, límites, estados, tablas y rutas en `constants/recipes.constants.ts` (constants-standards).
- El formulario del editor cambia por acciones con reglas, así que vive en un reducer puro en `utils/`; la validación es una función pura en `utils/`.
- Mutaciones tipadas: `Payload` y `Response` explícitos por operación (`SaveRecipe*`, `DeleteRecipe*`, `AddRecipeToList*`), y el error se maneja, nunca un `catch {}` vacío (nextjs-enterprise-patterns §4).
- Las reglas 17 a 26 viven en la base (una función), no en el cliente: documento-proyecto §6 pide que la unificación de cantidades sea una regla de la base, y así dos pestañas o dos miembros no se pisan. La regla 27 vive en el cliente (`localStorage`), con cada lectura y escritura en `try/catch`: si el navegador bloquea el almacenamiento, se agrega sin preguntar.
- **No se toca `features/shopping-list/`** (feature de Marcos). Esta historia solo escribe en la base; mostrar los avisos en `/lista` es de SCRUM-114, con revisión de Marcos (acordado con él el 2026-10-03).
- **SCRUM-98:** el estado "cubierto / falta" se calcula en la base (una función de solo lectura, regla 29), no en el cliente. La suscripción a Realtime vive en un servicio (`services/`) y el hook la abre y la cierra en un `useEffect` con limpieza: es la primera vez que el repo usa Realtime, así que el patrón queda documentado en el plan para quien lo reuse.
- Sin librerías nuevas (ni de formularios ni de esquemas).
- Reusar los primitivos de `components/ui`, el buscador compartido y el cliente de Supabase ([sección 11](#11-dependencias)) antes de construir algo propio.
- Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `security-practices`, `nextjs-enterprise-patterns`, `clean-code-practices`, `gitflow`.

## 11. Dependencias

- `services/supabase.client.ts`: `getSupabaseClient`, `ensureSession`.
- `services/catalog.service.ts`, `hooks/useProductSearch.ts`, `components/product-search/ProductSearch.tsx`: buscador de productos madre (SCRUM-120).
- `@/components/ui`: `Button`, `Input`, `Chip`, `Spinner`, `CategoryLabel`, `Modal`.
- `@/constants`: `CATALOG_BASE_UNIT`, `BUTTON_VARIANT`.
- `types/database.types.ts`: tipos generados de Supabase.
- `types/nullable.types.ts`: `NullableRef`.
- **SCRUM-98:** `list_items.checked_at` (migración `015`, SCRUM-66, mergeada) y `list_item_recipe_requirements` (migración `013`, SCRUM-97). Realtime de Supabase (`supabase.channel(...)`), que habilita la migración de esta historia.
- **SCRUM-97 (solo en la base):** `lists` y `list_items` (migraciones `004` y `005`), la misma lista general que crea `add_item_to_general_list`; y `product_catalog_variants` (`base_quantity`, `base_unit`).

## 12. Contratos externos

### Tablas (Supabase)

- `recipes`: `id`, `owner_id` (→ `auth.users`, default `auth.uid()`), `household_id` (nullable, sin FK hasta que exista `households`), `name`, `base_servings`, `image_url` (nullable), `created_at`.
- `recipe_ingredients`: `id`, `recipe_id` (→ `recipes`, `on delete cascade`), `product_catalog_id` (→ `product_catalog`), `quantity_value`, `quantity_unit`, `position`, `created_at`; `unique (recipe_id, product_catalog_id)`.

### Políticas RLS y permisos

| Operación | `recipes` | `recipe_ingredients` | Migración |
|---|---|---|---|
| Leer | `owner_id = auth.uid()` | la receta existe y es del usuario | `006` |
| Crear | dueño, con `household_id is null` | sobre una receta propia | `007` |
| Editar | dueño (`using` y `with check`), solo las columnas `name` y `base_servings` | sobre una receta propia (`using` y `with check`) | `007`, `008` |
| Borrar | dueño: `owner_id = auth.uid()` | sobre una receta propia; al borrar la receta, en cascada | `010` (receta), `007` (ingredientes) |

`anon` no tiene permisos sobre ninguna de las dos tablas.

### RPC

- `save_recipe(recipe_name, recipe_base_servings, ingredient_list, target_recipe_id) → uuid` (`007`): `security invoker` y transaccional. Sin `target_recipe_id` crea; con id actualiza, y si no encuentra la receta (inexistente o ajena) responde `P0002`.

### Borrar (SCRUM-96)

- `delete` directo sobre `recipes` por id (PostgREST), sin RPC: es una sola sentencia y ya es atómica. Si RLS oculta la fila, la base borra 0 filas sin error (regla 16).

### Agregar a la lista (SCRUM-97)

- **Tabla nueva `list_item_recipe_requirements`:** un registro por fila de la lista y por receta, con lo que pidió la receta y lo que falta, en la unidad del ingrediente. Un registro con faltante mayor que 0 es un aviso (regla 23). Se borra en cascada si se borra la fila de la lista o la receta. RLS: solo sobre filas de listas propias y recetas propias. `list_items` no cambia.
- **RPC nueva `add_recipe_to_general_list`:** `security invoker` y transaccional; aplica las reglas 17 a 26 y devuelve el resumen (productos sumados, productos con faltante y cuánto, productos sin presentación). Si no encuentra la receta (inexistente o ajena) responde `P0002`.
- **Navegador:** las recetas ya agregadas (regla 27) se guardan en `localStorage`, por id. No es un contrato con la base.
- **Para SCRUM-114:** la lista general puede traer los avisos de cada fila embebiendo `list_item_recipe_requirements` (con `recipes(name)`) en su consulta.

### Qué falta (SCRUM-98)

- **RPC nueva `get_recipe_coverage(target_recipe_id uuid) returns jsonb`**, de solo lectura, `security invoker` y `search_path` vacío, como las demás. Sin sesión → `42501`; receta no visible (inexistente o ajena) → `P0002`. Devuelve, en el orden de `position`, `[{ ingredient_id, product_name, quantity_value, quantity_unit, status: "covered" | "missing", reason: null | "notInList" | "notChecked" | "short", missing_quantity: number | null }]` según las reglas 29 y 30. `missing_quantity` solo viene con `short`.
- **Realtime:** la migración agrega `list_items` a la publicación `supabase_realtime` (`alter publication supabase_realtime add table public.list_items`, idempotente). Realtime aplica la RLS de `list_items` a cada evento: el usuario solo recibe cambios de su propia lista. No se agrega ninguna política ni permiso nuevo. El cliente no usa el contenido del evento, solo lo toma como señal para volver a llamar a la RPC.
- **Navegador:** `supabase.channel("recipe-coverage-{recipeId}").on("postgres_changes", { event: "*", schema: "public", table: "list_items" }, …)`. Sin filtro de fila (la RLS ya acota); el canal se cierra con `removeChannel` al cerrar el panel.

## 13. Casos de aceptación

### HU-63 (SCRUM-94)

- [ ] CA-01 (**parcial**): el sub-tab "Recetas" muestra las recetas con nombre, foto (o su inicial si no tiene) e ingredientes principales. Cumplido para las recetas **propias** en `/recetas`. Falta, por dependencias fuera de esta historia ([sección 14](#14-casos-fuera-de-alcance)): que viva dentro del ítem "Recetas" del **sidebar** y que muestre las recetas **del household**.
- [x] CA-02: cada receta muestra sus porciones base.
- [x] Usuario sin recetas: mensaje de catálogo vacío, no un error.
- [x] Receta sin foto: marcador con la inicial, sin imagen rota.
- [x] Receta sin ingredientes: la tarjeta se muestra sin la sección de ingredientes.
- [x] Receta con más de 3 ingredientes: los primeros 3 y "+N más".
- [x] Otra sesión no ve recetas ajenas.

### HU-64 (SCRUM-95)

- [x] CA-01: un botón "+ Nueva receta" abre un formulario con nombre, porciones base e ingredientes (búsqueda estilo catálogo).
- [x] CA-02: por cada ingrediente, el usuario primero elige el producto (ej. "Leche") y después le asigna cantidad con su unidad (ej. "500 ml"); el ingrediente queda ligado al producto desde ese paso.
- [x] CA-03: cada ingrediente se elige de entre los productos del catálogo, no se escribe como texto libre.
- [ ] CA-04 (**parcial**): quien creó la receta la puede **editar** (SCRUM-95) y **eliminar** (SCRUM-96). Falta que lo haga **cualquier miembro del household** si es compartida (integración con households).
- [x] Cada error de validación de la [sección 7](#7-errores) se muestra y no llama a la base.
- [x] Doble clic en "Guardar receta": se crea una sola receta.
- [x] Receta ajena o id inválido por URL: "No encontramos esa receta."

### HU-64b (SCRUM-96)

- [x] CA-01: cada receta del catálogo tiene una acción "Eliminar" que abre una confirmación; solo al confirmar se borra la receta con sus ingredientes, y deja de verse en el catálogo.
- [ ] CA-02 (**bloqueado por SCRUM-100**): si la receta está asignada a algún espacio del plan semanal, el diálogo lo avisa antes de eliminarla. Hoy el plan no existe, así que ninguna receta puede estar asignada; el aviso se suma cuando SCRUM-100 cree `meal_plans` (contrato en la [sección 15](#15-notas-de-implementación)).
- [x] Cancelar (botón, clic fuera o Escape): no se borra nada.
- [x] Doble clic en "Eliminar" del diálogo: una sola petición.
- [x] Falla de red: el diálogo muestra el error, la tarjeta sigue y se puede reintentar.
- [x] Borrar la última receta: se ve el catálogo vacío.
- [x] Receta ya borrada en otra pestaña: la tarjeta se quita sin error.
- [x] Al recargar la página, la receta borrada no vuelve (el borrado llegó a la base).
- [x] Otra sesión, llamando al delete con el id de una receta ajena: no se borra nada. Verificado en el SQL Editor con `role authenticated` y el `sub` de otro usuario dentro de una transacción con `rollback`: 0 filas; con el `sub` del dueño, 1 fila.
- [x] Editar en otra pestaña una receta ya borrada y guardar: "No encontramos esa receta."

### HU-65 (SCRUM-97)

Validado el 2026-10-03: en el navegador (lo marcado "navegador") y en el SQL Editor con un script de prueba dentro de una transacción con `rollback` (lo marcado "SQL"; el catálogo real casi no tiene conteos ni productos con varias presentaciones, así que esas reglas se probaron con productos de prueba).

- [x] CA-01: cada receta del catálogo tiene un botón "Agregar receta a lista". (navegador)
- [x] CA-02: un producto que ya está en la lista no se duplica como otra fila: los conteos se suman en su fila, y en volumen o peso lo que hay en la fila cuenta para la receta. (navegador y SQL)
- [x] CA-03: un ingrediente de conteo se suma directo hasta cubrir la receta y no deja aviso ("3 cebollas" → +3; "3 huevos" con cartones de 6 y 12 → +1 cartón de 6). (SQL)
- [x] CA-04: un ingrediente de volumen o peso que no alcanza deja registrado su faltante por receta (lista con 1 L, receta de 1800 ml → faltante 800 ml), y el resumen de la tarjeta lo nombra. Mostrarlo bajo el producto en `/lista` es de SCRUM-114. (navegador: "Te falta comprar: Leche Dos Pinos Pinito - 1000 ml (800 ml)"; SQL: registros)
- [x] CA-05: al agregar no se abre ninguna ventana para decidir qué comprar; solo aparece el resumen en la tarjeta. (navegador)
- [x] Volumen o peso que alcanza (lista con 1 L, receta de 800 ml): no se suma nada y no hay faltante. (navegador: "Tu lista ya tenía lo necesario para esta receta."; SQL)
- [x] Dos recetas sobre la misma leche (1 L en la lista, 800 ml cada una): la primera no tiene faltante y la segunda tiene 600 ml. (SQL)
- [x] Producto de volumen o peso que no está en la lista: se agrega 1 unidad de la más chica que cubre, o de la más grande con su faltante si ninguna cubre. (navegador y SQL)
- [x] Unidades que no coinciden ("200 g" de un producto en ml): se registra el faltante completo (200 g). (SQL)
- [x] Receta ya agregada desde este navegador: aparece la confirmación; "Agregar otra vez" la agrega de nuevo y "Cancelar" no cambia nada. (navegador: cancelar no llamó a la base; confirmar sí)
- [x] Ingrediente sin presentación en el catálogo: el resumen lo nombra y el resto se agrega. (SQL)
- [x] Falla de red: la lista queda igual que antes (nada a medias) y la tarjeta muestra el error. (navegador, con la red simulada caída)
- [x] Receta borrada en otra pestaña: "No encontramos esa receta." (navegador)
- [x] Doble clic en "Agregar receta a lista": una sola petición. (navegador: 1 llamada a la RPC)
- [x] Borrar la receta (SCRUM-96) borra sus registros; las cantidades que ya se habían sumado a la lista quedan. (SQL)
- [x] Otra sesión no puede agregar una receta ajena a su lista ni leer o escribir registros ajenos. (SQL: 0 registros visibles y `P0002`)

### HU-66 (SCRUM-98)

- [x] CA-01: la tarjeta de cada receta tiene "Ver qué falta", que muestra por ingrediente si está **cubierto** (en la lista y tachado, sin faltante) o si **falta**, con su motivo.
- [x] CA-02: con el panel abierto, tachar o destachar un producto relacionado actualiza el estado sin recargar (Realtime), también desde **otra pestaña**.
- [x] Ingrediente que no está en la lista: "Falta · No está en tu lista".
- [x] Ingrediente en la lista sin tachar: "Falta · En tu lista, sin tachar".
- [x] Ingrediente de volumen o peso tachado con faltante registrado (lista con 1 L, receta de 1800 ml): "Falta · Te falta comprar 800 ml".
- [x] Ingrediente de conteo tachado: "Cubierto".
- [x] Todos cubiertos: el resumen dice "Tienes todo para cocinarla".
- [x] Destachar un producto cubierto vuelve a "Falta · En tu lista, sin tachar".
- [x] Agregar la receta a la lista (SCRUM-97) con el panel abierto actualiza el estado.
- [x] Receta sin ingredientes: no aparece "Ver qué falta".
- [x] Receta borrada en otra pestaña: "No encontramos esa receta." en el panel.
- [x] Falla de red al abrir: mensaje de error con "Reintentar", sin decir "Tienes todo".
- [x] Cerrar el panel cancela la suscripción (no hay canal abierto después; se ve en la pestaña Network de DevTools).
- [x] Otra sesión no ve el estado de una receta ajena (`P0002`) ni recibe eventos de `list_items` ajenos (SQL con `role authenticated` y Realtime con dos sesiones). Verificado en el SQL Editor (usuario B contra la receta de A, sin sesión y anon); los eventos de Realtime entre dos sesiones no se probaron aparte.
- [x] Doble clic en "Ver qué falta": abre y cierra (es el mismo botón); no queda ninguna petición ni canal de Realtime abierto.

### Todas

- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` pasan.

## 14. Casos fuera de alcance

- **Sidebar / shell de la app:** no existe y no tiene historia asignada. Cuando exista, `/recetas` se engancha a él (la ruta y los sub-tabs no cambian).
- **Recetas del household (verlas, editarlas, borrarlas o agregarlas a la lista como miembro):** `households` todavía no existe. Por ahora cada usuario usa sus recetas y su lista personal; `household_id` queda nullable y sin FK, igual que en `lists`. La integración está en [plan.md](plan.md#integración-con-households-pendiente).
- **Foto (subirla y borrarla de Storage):** el formulario no la pide, y subirla necesita Supabase Storage (bucket, políticas, validación de archivo), que es una decisión de equipo pendiente. Queda para un ticket propio; el catálogo ya muestra la foto cuando existe.
- **Aviso por asignaciones en el plan semanal (CA-02 de HU-64b):** `meal_plans` lo crea SCRUM-100. Un aviso que hoy siempre dijera "no está en el plan" sería código sin uso real.
- **Planificador semanal:** SCRUM-99 en adelante.
- **Inventario o despensa ("lo que ya tengo en casa"):** HU-66 lo menciona ("ya tengo comprados o en casa"), pero no hay tabla ni historia que lo defina. SCRUM-98 solo ve lo que está en la lista (tachado = comprado). Si el equipo crea una despensa, la regla 29 gana una condición más y la RPC es el único lugar a tocar.
- **Vista de detalle de receta (`/recetas/[id]`):** se resolvió con un panel dentro de la tarjeta (decidido el 2026-10-09). Una ruta propia queda para cuando el planificador o la edición necesiten una pantalla de receta.
- **Comparar contra cantidades compradas:** regla 31. No se convierte ni se suma entre unidades.
- **Recetas del household o listas privadas:** la regla 29 mira solo la lista general personal, igual que SCRUM-97.
- **Realtime en el catálogo de recetas** (ver recetas nuevas o borradas en otra pestaña): solo la lista tiene suscripción, y solo con el panel abierto.
- **Mostrar el aviso bajo el producto en `/lista`:** SCRUM-114 (Sprint 4), que toca `features/shopping-list/` con revisión de Marcos.
- **Resolver el faltante al tachar ("¿Qué hiciste?") y recalcularlo si cambia la lista:** SCRUM-115 (Sprint 4), que se engancha en tachar (SCRUM-66, Marcos).
- **Calcular cuántas unidades comprar de lo que se mide por volumen o peso:** la app nunca lo decide (documento-proyecto §4.9.1); queda registrado el faltante y se decide al tachar.
- **Elegir la presentación por precio:** las reglas 19 y 21 usan solo cantidades, que siempre existen; los precios hoy son de un solo supermercado.
- **Convertir entre unidades** (g ↔ ml, o "tazas"): no hay forma confiable de hacerlo; una unidad distinta deja el faltante completo (regla 22).
- **Elegir a qué lista agregar (sublista por fecha, lista privada) o con otro número de porciones:** la historia habla de "mi lista"; las sublistas son SCRUM-77 y el multiplicador es del planificador (SCRUM-100).
- **Agregar la semana completa:** SCRUM-101. Va a reusar la misma función y los registros por receta.
- **Recordar las recetas agregadas entre dispositivos o navegadores:** la confirmación de la regla 27 es una comodidad local; guardarlo en la base necesitaría una tabla o columna nueva sin que la historia lo pida.
- **Deshacer el agregado:** no lo pide la historia; las cantidades se bajan con "−" en la lista.
- **Unidades como "tazas" o "cucharadas":** la base solo acepta `ml` / `g` / `unidad`; sin eso no se puede sumar contra la lista.
- **Productos que no están en el catálogo:** crear productos es "Mis productos" (Daniel).
- **Aviso de "tienes cambios sin guardar" al salir del editor:** no lo pide la historia.
- **Eliminar desde la pantalla de edición:** el CA-01 pide la acción en cada receta y la tarjeta ya lo cumple; un segundo punto de entrada duplicaría la lógica sin que la historia lo pida.
- **Deshacer o papelera al eliminar:** la historia pide confirmación antes de borrar, no recuperación después.
- **Registro e inicio de sesión:** los construye otra persona. Se usa la sesión anónima provisional (`ensureSession`).

## 15. Notas de implementación

- **Contrato para SCRUM-100 (cierra el CA-02 de HU-64b):** cuando cree `meal_plans` con `recipe_id → recipes`, tiene que decidir qué pasa al borrar la receta: `on delete cascade` (el espacio del plan queda libre) o `restrict` (hay que quitar la asignación primero). Sin decisión explícita, Postgres usa `no action` y eliminar una receta asignada falla con `23503`. Además, antes de abrir el diálogo de esta historia, tiene que consultar cuántos espacios usan la receta y sumar el aviso al mismo diálogo.
- **Spec migrada** a la plantilla de 15 secciones en SCRUM-96 (component-architecture §2, "Specs existentes"): el contenido de SCRUM-94 y SCRUM-95 no cambió, solo se reordenó.
- **Cómo se llenaron los huecos de HU-65 (SCRUM-97, decidido con el responsable de la historia el 2026-10-03).** La historia no define cómo pasar de una cantidad cruda de receta a presentaciones de la lista. Se siguió documento-proyecto §4.9.1 (para volumen o peso la app no calcula unidades: suma en unidad base y registra lo que falta) y se decidió lo que la historia no dice:
  - **conteos:** se suma encima, en unidades de la presentación, hasta cubrir la receta; con varias presentaciones, la más chica que cubre (o la más grande si ninguna cubre) (regla 19). La HU-76 dice que los conteos nunca llevan aviso, y así queda;
  - **volumen o peso:** lo que hay en la lista cuenta, descontando lo que ya pidieron otras recetas (regla 20);
  - **producto que no está en la lista:** se agrega 1 unidad para que tenga su fila (regla 21). Responde la pregunta que dejó abierta Marcos ("si no hay fila no hay dónde poner el aviso");
  - **unidades que no coinciden:** faltante completo (regla 22);
  - **receta repetida:** confirmación en el navegador, sin tabla nueva (regla 27). El CA-05 se lee como "no decidir qué comprar al agregar", y esta confirmación no decide nada de la compra.

  documento-proyecto §4.9.1 sigue valiendo; se le suma lo de las reglas 19 y 21, y §6 suma la tabla `list_item_recipe_requirements`. Las dos cosas van en el mismo PR.
- **Acordado con Marcos (2026-10-03):** esta historia no toca `features/shopping-list/`. El CA-04 se redefine en Jira como "el faltante queda registrado; mostrarlo es SCRUM-114". En SCRUM-114, con la fila ya estable (eliminar y tachar hechos), se trae el registro en la consulta de la lista, un campo opcional en `ShoppingListItem` y un componente chico para la etiqueta dentro de `features/shopping-list/components/`; Marcos revisa ese PR. SCRUM-115 se diseña con él para engancharse en tachar (SCRUM-66).
- **Para SCRUM-98 y SCRUM-101:** los registros de esta historia dicen, por receta y producto, cuánto se pidió y cuánto falta. "Ver qué falta" (98) y "Agregar la semana completa" (101, llamando a la misma función por cada receta) los pueden reusar.
- **Cómo se llenaron los huecos de HU-66 (SCRUM-98, decidido con el responsable el 2026-10-09).** La historia no dice dónde vive la vista, qué es "cubierto" ni cómo es el tiempo real. Se decidió:
  - **dónde:** panel dentro de la tarjeta, sin ruta nueva;
  - **qué es cubierto:** en la lista, tachado y sin faltante registrado (regla 29). "Inventario" queda fuera (sección 14);
  - **tiempo real:** Supabase Realtime sobre `list_items`, cuya publicación habilita la migración de esta historia. Es la primera suscripción del repo. La señal dispara una nueva consulta a la RPC en vez de calcular en el cliente.
- **Deuda de SCRUM-66 que toca esta historia:** al reabrir una fila tachada (volver a agregarla desde la búsqueda o una receta), sus registros viejos de `list_item_recipe_requirements` siguen pegados y vuelven a contar como reclamados. El efecto en el panel es conservador: una fila reabierta está sin tachar, así que sale "Falta · En tu lista, sin tachar", nunca "Cubierto". Se corrige al resolver SCRUM-115.
- **Realtime y los eventos `delete` (revisión de seguridad de SCRUM-98, Medium, aceptado).** Realtime aplica la RLS de `list_items` a insert y update, pero no a delete: el borrado de una fila de cualquier usuario avisa a todos los paneles abiertos, solo con el `id` de la fila. No se filtra ningún dato (el `id` no sirve para leer nada por la RLS). El costo es que cada panel abierto vuelve a llamar a `get_recipe_coverage` por cada borrado ajeno, y un usuario (también uno anónimo) podría borrar y recrear sus filas en bucle para provocar esas consultas. Se acepta porque: la coalescencia (regla 32) deja a lo más una consulta pendiente por panel, la RPC es barata y de solo lectura, y mitigarlo bien necesita un filtro por `list_id` (el cliente no conoce ese id) o un cambio de arquitectura. Si llegara a doler, el siguiente paso es un debounce de unos 300 ms en `refresh` o mover la señal a un canal `broadcast` por lista. **No** poner `REPLICA IDENTITY FULL` en `list_items`: los eventos `update` y `delete` llevarían la fila completa. La migración `017` ya está aplicada y no se edita; su comentario dice "a lo sumo una consulta de más", y esta nota lo precisa: es una por cada suscriptor.
- **Migración de SCRUM-98:** `017`. La `016` la tomó `ticket/SCRUM-67-modo-compra` (`016_create_purchase_sessions.sql`). Al aplicarla se sigue `supabase/README.md#migraciones` cuando la PR #53 (SCRUM-134) se mergee.
