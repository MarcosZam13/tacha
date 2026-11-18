# Plan E2E: Mis productos

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/my-products/my-products.spec.ts`.

Nivel más bajo que alcanza:
- **Validaciones del formulario** (precio <= 0, "Otra tienda" sin nombre), en los tests de `hooks/tests/` y `components/create-product-form/tests/`.
- **Reglas de la base** (checks, permisos, CA-03: ninguna fila en `product_prices`), en `supabase/tests/051_personal_product_reference_price.test.sql`.

El navegador solo prueba el recorrido completo: crear → ver en la tarjeta → ver en el detalle.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo y la app crea un usuario anónimo nuevo al guardar, sin familia: el producto queda personal.
- **Categoría:** la primera del selector. Supuesto: la base compartida tiene categorías (las siembra la migración 020).
- **Nombre:** cada test usa un nombre con la hora, para encontrar su tarjeta sin confundirla con otra.
- **Migración:** requiere `051` aplicada en la base.
- **Limpieza:** ninguna por ahora. Un usuario no puede borrar un producto personalizado hasta HU-58 (SCRUM-89). El producto queda en la base, pero es de un usuario anónimo y nadie más lo ve (RLS de 032).

## Escenarios

### E2E-MISPROD-01: precio y supermercado en la tarjeta

- **Cubre:** HU-57 CA-01, CA-02; SPEC §13 casos 11 y 13.
- **Pasos:** abrir `/catalogo/mis-productos`, tocar "+ Agregar producto", llenar nombre, categoría y cantidad, elegir "MaxiPali", escribir el precio 2850 y guardar.
- **Resultado:** sin recargar aparece la tarjeta del producto con "MaxiPali", el precio y el aviso "Precio ingresado por ti…".

### E2E-MISPROD-02: tienda escrita a mano en el detalle

- **Cubre:** HU-57 CA-01, CA-02; SPEC §13 casos 12 y 13.
- **Pasos:** crear un producto con "Otra tienda" = "Carnicería Los Ángeles" y precio 3200, y abrir su tarjeta.
- **Resultado:** el detalle muestra la sección "Precio de referencia" con la tienda, el precio y el aviso visible.
