# Plan E2E: Mis productos

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/my-products/my-products.spec.ts`.

Nivel más bajo que alcanza:
- **Validaciones del formulario** (precio <= 0, "Otra tienda" sin nombre), en los tests de `hooks/tests/` y `components/create-product-form/tests/`.
- **Textos del aviso de eliminar**, en `features/my-products/tests/`.
- **Reglas de la base** (checks, permisos, CA-03: ninguna fila en `product_prices`), en `supabase/tests/051_personal_product_reference_price.test.sql`.
- **Permisos y regla de borrar o archivar**, en `supabase/tests/052_edit_delete_personal_products.test.sql`.

El navegador prueba los recorridos completos: crear → ver en la tarjeta → ver en el detalle (HU-57), y editar y eliminar (HU-58).

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo y la app crea un usuario anónimo nuevo al guardar, sin familia: el producto queda personal.
- **Categoría:** la primera del selector. Supuesto: la base compartida tiene categorías (las siembra la migración 020).
- **Nombre:** cada test usa un nombre con la hora, para encontrar su tarjeta sin confundirla con otra.
- **Migración:** requiere `051`, `052`, `053` y `055` aplicadas en la base.
- **Limpieza:**
  - E2E-MISPROD-01 y -02 no limpian: su producto queda en la base, pero es de un usuario anónimo y nadie más lo ve (RLS de 032).
  - E2E-MISPROD-03 y -06 eliminan su producto al terminar, así que se borra.
  - E2E-MISPROD-04 lo borra como parte del test.
  - E2E-MISPROD-05 borra el ítem de la lista con el token de esa sesión (`deleteOwnListItems`). El producto queda archivado: es de un usuario anónimo y nadie más lo ve.

## Escenarios

### E2E-MISPROD-01: precio y supermercado en la tarjeta

- **Cubre:** HU-57 CA-01, CA-02; SPEC §13 casos 11 y 13.
- **Pasos:** abrir `/catalogo/mis-productos`, tocar "+ Agregar producto", llenar nombre, categoría y cantidad, elegir "MaxiPali", escribir el precio 2850 y guardar.
- **Resultado:** sin recargar aparece la tarjeta del producto con "MaxiPali", el precio y el aviso "Precio ingresado por ti…".

### E2E-MISPROD-02: tienda escrita a mano en el detalle

- **Cubre:** HU-57 CA-01, CA-02; SPEC §13 casos 12 y 13.
- **Pasos:** crear un producto con "Otra tienda" = "Carnicería Los Ángeles" y precio 3200, y abrir su tarjeta.
- **Resultado:** el detalle muestra la sección "Precio de referencia" con la tienda, el precio y el aviso visible.

### E2E-MISPROD-03: editar un producto

- **Cubre:** HU-58 CA-01; SPEC §13 casos 16 y 17.
- **Pasos:** crear un producto, tocar "Editar" en su tarjeta, cambiar el nombre y guardar.
- **Resultado:** el formulario abrió precargado con el nombre anterior, y sin recargar la tarjeta muestra el nombre nuevo. No queda ninguna tarjeta con el nombre anterior: se actualizó el mismo producto, no se creó otro.

### E2E-MISPROD-06: editar la tienda y el precio

- **Cubre:** HU-58 CA-01 con los campos de HU-57; SPEC §13 caso 21.
- **Pasos:** crear un producto con "MaxiPali" y precio 2850, tocar "Editar", elegir "Otra tienda" = "Feria de Zapote", escribir 3100 y guardar.
- **Resultado:** el formulario abrió con "MaxiPali" y 2850. Al guardar, la tarjeta muestra "Feria de Zapote" y el precio nuevo, y ya no dice "MaxiPali".

### E2E-MISPROD-04: eliminar un producto sin uso

- **Cubre:** HU-58 CA-01, CA-02; SPEC §13 caso 19.
- **Pasos:** crear un producto, tocar "Eliminar" y confirmar.
- **Resultado:** la base responde 0 listas activas y 0 recetas, el diálogo no muestra aviso de uso y la tarjeta desaparece. La comprobación del aviso espera esa respuesta: antes de que llegue, "no hay aviso" sería cierto siempre.

### E2E-MISPROD-05: eliminar un producto que está en la lista

- **Cubre:** HU-58 CA-02; SPEC §13 casos 18 y 19.
- **Pasos:** crear un producto, abrir su detalle, agregarlo a la lista, volver a "Mis productos", tocar "Eliminar", confirmar y abrir la lista general.
- **Resultado:** el diálogo avisa "Está en 1 lista activa" y, al confirmar, la tarjeta desaparece. El producto quedó archivado, no borrado: la lista general lo sigue mostrando.
