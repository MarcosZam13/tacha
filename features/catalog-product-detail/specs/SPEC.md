# Feature: Catálogo — detalle de producto

Historias:
- [SCRUM-85 / HU-53](https://tacha.atlassian.net/browse/SCRUM-85): ver el detalle de un producto del catálogo (marcas y precio por supermercado). Sprint 3.

Depende de que exista un `variantId` resuelto por otra pantalla del catálogo (hoy: Buscar, SCRUM-83; en el futuro: filtro por categoría SCRUM-84, Mis productos SCRUM-86). No se hace acá: cómo se llega a ese `variantId`.

---

## 1. Objetivo

Que el usuario, al tocar un producto del catálogo, vea toda la información de marca y precio que la tarjeta no muestra (documento-proyecto §4.5, §4.8): qué marcas hay disponibles y el precio aproximado por supermercado, y que pueda agregar el producto a su lista sin salir de esa pantalla.

## 2. Alcance

Incluye:

- Una pantalla propia de detalle, a la que se llega al tocar una tarjeta del catálogo.
- Cabecera: foto grande, nombre del producto y tamaño de la variante tocada.
- Sección "Marcas disponibles": listado de marcas (logo + nombre), solo informativo.
- Sección "Precio aproximado por supermercado": una fila por supermercado con su ícono, nombre y precio como rango entre las marcas disponibles ahí, ordenado del más barato al más caro.
- Botón principal "Agregar a mi lista" con selector de cantidad, sin salir del detalle.

No incluye: ver sección 14.

## 3. Entradas

- `variantId: string` — identifica la variante de catálogo (producto + tamaño) cuyo detalle se muestra. Es lo único que la pantalla necesita para pedir sus datos.

## 4. Salidas

- Foto, nombre y tamaño del producto en la cabecera.
- Listado de marcas disponibles (logo + nombre).
- Listado de precios por supermercado, como rango, ordenado de más barato a más caro.
- Al confirmar "Agregar a mi lista": el producto queda en la lista general del usuario, con la cantidad elegida.

## 5. Reglas de negocio

1. El precio por supermercado es un **rango, no un promedio** (documento-proyecto §4.8): mínimo y máximo entre todas las marcas disponibles en ese supermercado para esa variante. Si mínimo y máximo coinciden, se muestra un solo precio (mismo criterio que ya usa la tarjeta de catálogo).
2. Un supermercado sin ningún precio disponible para esa variante no aparece en la lista — no se muestra "₡0" ni una fila vacía.
3. Las marcas son **solo informativas**: no afectan qué se agrega a la lista ni su precio — el usuario agrega el producto + tamaño, nunca una marca puntual (documento-proyecto §4.5, corrección 2026-08-18).
4. Si la variante no tiene ninguna marca registrada, se muestra un aviso de que no hay marcas, nunca una lista vacía sin explicación.
5. Si la variante no tiene foto, se muestra el mismo marcador con la inicial que usa la tarjeta de catálogo (docs/DESIGN.md §6), nunca una imagen rota.
6. El selector de cantidad arranca en 1 y nunca permite 0 ni negativos.
7. "Agregar a mi lista" sigue la misma lógica de unificación de cantidades que ya tiene la lista general (documento-proyecto §4.2): si el producto + tamaño ya estaba en la lista, se suma a lo que ya había, no se duplica la fila.
8. Una marca sin logo registrado se muestra solo con su nombre — el logo es una mejora visual cuando el dato exista, nunca un requisito para listar la marca (ver §15, dato real de hoy: ninguna marca del catálogo tiene `logo_url` cargado).

## 6. Estados

- `loading` — se pidió el detalle de la variante y la respuesta no ha llegado.
- `error` — la petición del detalle falló.
- `ready` — hay datos para mostrar (aunque alguna sección pueda estar vacía: sin marcas, sin precios — eso es parte de `ready`, no un error).
- `adding` — se confirmó "Agregar a mi lista" y la operación está en curso.

## 7. Errores

- Falla la red o la consulta al pedir el detalle: mensaje de error con opción de reintentar; nunca una pantalla vacía ni "sin marcas"/"sin precio" disfrazados de error.
- Falla "Agregar a mi lista": mensaje de error; el selector de cantidad conserva lo que el usuario había elegido.
- `variantId` no corresponde a ninguna variante real (ej. un link viejo): mensaje de "producto no encontrado", no un error genérico.

## 8. UI esperada (docs/DESIGN.md §7.1b)

- Foto grande arriba; nombre (tipografía Fraunces) y tamaño debajo.
- Sección "Marcas disponibles": el nombre de cada marca siempre visible; el logo se muestra junto al nombre solo cuando el dato existe (regla 5.8).
- Sección "Precio aproximado por supermercado": una fila por supermercado, con su ícono, nombre y precio como rango, ordenadas de más barato a más caro — nunca una tabla plana tipo spreadsheet.
- Botón principal "Agregar a mi lista" con selector de cantidad.
- Todo con la calidez de marca (fondo crema, tipografía Fraunces/Public Sans) — ver docs/DESIGN.md §1-2.

## 9. Accesibilidad

- La foto tiene `alt` con el nombre del producto; el marcador con inicial es decorativo (`aria-hidden`).
- Cuando una marca sí tiene logo, lleva `alt` con el nombre de la marca; cuando no, el nombre en texto ya cumple ese rol (regla 5.8).
- Cada ícono de supermercado es decorativo (`aria-hidden`); el nombre del supermercado va siempre en texto, nunca solo en el ícono.
- El error se anuncia con `role="alert"`.
- Los controles del selector de cantidad llevan `aria-label` claro (aumentar/disminuir cantidad), no solo un símbolo visual.
- El precio no se comunica solo con color.

## 10. Restricciones técnicas

- TypeScript estricto, sin `any`.
- Tailwind con los tokens `tacha-*`, sin CSS Modules.
- ViewModel (`hooks/`) con toda la lógica: estado, efectos, handlers; los `.tsx` solo presentan.
- Cero literales: textos, rutas y estados en `constants/` (constants-standards).
- `app/` solo la ruta delgada; la UI vive en la feature.
- No se modifica la RPC `search_catalog`, ninguna otra RPC existente, ni se corre ninguna migración: el detalle no depende de ninguna RPC nueva (el cómo se resuelve en plan.md).
- No se modifica `features/catalog/` (HU-51/HU-52): esta es una pantalla propia, no un cambio sobre la de búsqueda.

## 11. Dependencias

- `@/components/ui` (Spinner, Button y lo que haga falta de presentación).
- Tablas de lectura: `product_catalog`, `product_catalog_variants`, `product_brands`, `latest_prices` (o la vista/tabla de precio vigente que ya usa el proyecto), `stores`.
- La operación de agregar a la lista general y su unificación de cantidades (documento-proyecto §4.2), que ya existe en el proyecto.

## 12. Contratos externos

Lectura: una variante de `product_catalog_variants` (nombre, tamaño, foto) con sus marcas (`product_brands`: nombre, logo) y sus últimos precios por marca y supermercado (`latest_prices`/`product_prices` → `stores`). Se lee con la sesión anónima actual, igual que el resto del catálogo. No hay escrituras de catálogo; la única escritura es la de agregar a la lista general, que ya existe y no cambia su contrato.

## 13. Casos de aceptación

HU-53
- [ ] CA-01: al tocar un producto en el catálogo, se abre su vista de detalle con foto grande, nombre y tamaño.
- [ ] CA-02: se muestra un listado de marcas disponibles (logo + nombre), solo informativo.
- [ ] CA-03: se muestra el precio aproximado por supermercado como rango entre las marcas disponibles ahí, ordenado del más barato al más caro.
- [ ] CA-04: un botón principal "Agregar a mi lista" con selector de cantidad permite agregar el producto sin salir del detalle.

Casos adicionales:
- [ ] Marca sin `logo_url` (el caso más común hoy): se muestra solo el nombre, sin ícono roto ni espacio en blanco forzado.
- [ ] Mínimo y máximo de precio iguales en un supermercado: se muestra un solo precio.
- [ ] Variante sin marcas registradas: aviso claro, no una lista vacía sin explicación.
- [ ] Variante sin ningún precio en ningún supermercado: aviso claro, no "₡0".
- [ ] Variante sin foto: se muestra el marcador con inicial.
- [ ] Error de red al pedir el detalle: mensaje de error con opción de reintentar.
- [ ] Agregar a la lista un producto que ya estaba: se suma la cantidad, no se duplica la fila.
- [ ] `variantId` inexistente (ej. link viejo): mensaje de "producto no encontrado".

## 14. Casos fuera de alcance

- **Búsqueda y filtro por categoría** (SCRUM-83/84): esta pantalla solo recibe un `variantId` ya resuelto, no decide cómo se llegó a él.
- **Crear producto / "Mis productos"** (SCRUM-86/87).
- **Historial de precios o gráfico de evolución de precio**: solo el precio aproximado actual.
- **Elegir una marca específica al agregar a la lista**: se agrega el producto + tamaño, nunca una marca puntual (regla 5.3).
- **Compartir o enlazar el detalle fuera de la app.**
- **Cambios a la RPC `search_catalog`, a su contrato, o a los datos del catálogo.**

## 15. Notas de implementación

- **Dato real de hoy (comprobado contra la base, 2026-10-21):** de las 68 filas de `product_brands` del catálogo, **ninguna tiene `logo_url`** — el scraping no está capturando ese dato todavía. CA-02 se valida igual con solo el nombre de marca; el logo se agrega automáticamente el día que el dato exista, sin cambiar esta historia.
- **Fotos de producto, en cambio, sí están completas:** las 55 variantes del catálogo tienen `image_url`. CA-01 (foto grande) no depende de un caso límite de "sin foto" para la mayoría de productos probados manualmente, aunque el marcador con inicial (regla 5.5) sigue siendo necesario por contrato.
- **Cobertura de marcas por variante:** la mayoría de variantes tiene entre 1 y 4 marcas registradas (comprobado con datos reales), así que CA-02 (listado de marcas) tiene datos reales con los que probarse, no solo el caso de una sola marca.
- **Aviso de un ticket futuro (SCRUM-133, "Reset del catálogo", todavía sin iniciar):** existe un ticket planeado para resetear y resembrar el catálogo. No cambia nada del contrato de esta historia, pero quien haga QA manual de SCRUM-85 después de que SCRUM-133 se implemente debería esperar otros productos/ids de ejemplo, no necesariamente los mismos 40 productos de hoy.
