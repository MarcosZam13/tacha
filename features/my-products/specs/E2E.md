# Plan E2E: Mis productos

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/my-products/my-products.spec.ts`.

Nivel más bajo que alcanza:
- **Validaciones del formulario y textos del aviso**, en `hooks/tests/` y `features/my-products/tests/`.
- **Permisos y regla de borrar o archivar**, en `supabase/tests/052_edit_delete_personal_products.test.sql`.

El navegador prueba los recorridos completos.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo y la app crea un usuario anónimo nuevo al guardar, sin familia: el producto queda personal.
- **Categoría:** la primera del selector. Supuesto: la base compartida tiene categorías (las siembra la migración 020).
- **Nombre:** cada test usa un nombre con la hora, para encontrar su tarjeta sin confundirla con otra.
- **Migración:** requiere `052` y `053` aplicadas en la base.
- **Limpieza:**
  - E2E-MISPROD-03 elimina su producto al terminar, así que se borra.
  - E2E-MISPROD-04 lo borra como parte del test.
  - E2E-MISPROD-05 borra el ítem de la lista con el token de esa sesión (`deleteOwnListItems`). El producto queda archivado: es de un usuario anónimo y nadie más lo ve.

## Escenarios

### E2E-MISPROD-03: editar un producto

- **Cubre:** HU-58 CA-01; SPEC §13 casos 10 y 11.
- **Pasos:** crear un producto, tocar "Editar" en su tarjeta, cambiar el nombre y guardar.
- **Resultado:** el formulario abrió precargado con el nombre anterior, y sin recargar la tarjeta muestra el nombre nuevo.

### E2E-MISPROD-04: eliminar un producto sin uso

- **Cubre:** HU-58 CA-01, CA-02; SPEC §13 caso 13.
- **Pasos:** crear un producto, tocar "Eliminar" y confirmar.
- **Resultado:** el diálogo no muestra aviso de uso y la tarjeta desaparece.

### E2E-MISPROD-05: eliminar un producto que está en la lista

- **Cubre:** HU-58 CA-02; SPEC §13 casos 12 y 13.
- **Pasos:** crear un producto, abrir su detalle, agregarlo a la lista, volver a "Mis productos", tocar "Eliminar" y confirmar.
- **Resultado:** el diálogo avisa "Está en 1 lista activa" y, al confirmar, la tarjeta desaparece. El producto quedó archivado, no borrado (eso lo prueba el test SQL; el navegador ve que deja de aparecer).
