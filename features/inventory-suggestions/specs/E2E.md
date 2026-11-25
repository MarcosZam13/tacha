# Plan E2E: sugerencias de inventario

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/inventory-suggestions/inventory-suggestions.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: el cálculo (qué se sugiere, con qué duración y en qué orden) se prueba en `supabase/tests/061_inventory_suggestions.test.sql`; los textos y los estados, en los tests unitarios. Acá va lo que solo prueba un navegador real: dónde aparece la fila, que se desliza sin mover la página y que la lista sigue si falla.

## Datos y entorno

- **Supabase simulado:** sesión registrada falsa (`e2e/support/fake-session.ts`); toda petición responde `[]` (lista vacía) y la RPC `get_inventory_suggestions` responde lo que pide cada escenario. No se escribe en la base compartida ni se crean usuarios anónimos.
- **Fuera de E2E:** el cálculo real contra la base, que necesita compras con fechas pasadas.

## Escenarios

### E2E-INV-01: la fila aparece debajo del encabezado y antes de la lista
- **Cubre:** CA-01.
- **Pasos:** la RPC devuelve Leche (hace 9 días) y Arroz; abrir `/lista`.
- **Resultado esperado:** se ve la región "¿Se te acabó?" con 2 tarjetas, la primera con "Leche" y "Lo compraste hace 9 días"; está debajo del título y encima del buscador.

### E2E-INV-02: la fila se recorre deslizando sin mover la página
- **Cubre:** CA-01.
- **Pasos:** la RPC devuelve 8 productos; abrir `/lista`; llevar la última tarjeta a la vista.
- **Resultado esperado:** la última tarjeta empieza fuera de la vista y después se ve; la página no tiene scroll horizontal.

### E2E-INV-03: sin sugerencias no aparece la fila
- **Cubre:** CA-01.
- **Pasos:** la RPC devuelve `[]`; abrir `/lista`.
- **Resultado esperado:** se ve la lista vacía y no hay región "¿Se te acabó?".

### E2E-INV-04: si las sugerencias fallan, la lista funciona igual
- **Cubre:** CA-03.
- **Pasos:** la RPC responde 500; abrir `/lista`.
- **Resultado esperado:** se ve la lista vacía, el buscador está habilitado y no hay región "¿Se te acabó?".

## SCRUM-104: confirmar o descartar

La RPC del ✓ (`add_item_to_general_list`) se responde con la fila que agregaría la base (cantidad 1) y la de la ✕ (`dismiss_inventory_suggestion`) con 204; el test anota lo que mandó la pantalla. Que la base posponga 7 días y no toque el historial lo cubre la prueba SQL de la `064`.

### E2E-INV-05: el ✓ agrega el producto a la lista con cantidad 1
- **Cubre:** HU-71 CA-01 y CA-02.
- **Pasos:** sugerencias Leche y Arroz; tocar "Agregar Leche a la lista".
- **Resultado esperado:** la tarjeta de Leche desaparece y la de Arroz sigue; Leche aparece en "Pendientes" con cantidad 1; se mandó `{ target_variant_id }` de Leche y ninguna ✕.

### E2E-INV-06: la ✕ saca la sugerencia sin agregar nada
- **Cubre:** HU-71 CA-01 y CA-03.
- **Pasos:** sugerencias Leche y Arroz; tocar "Descartar Arroz".
- **Resultado esperado:** la tarjeta de Arroz desaparece y la de Leche sigue; se mandó la ✕ de Arroz; no se agregó nada (la lista sigue vacía).

### E2E-INV-07: se puede ignorar la fila
- **Cubre:** HU-71 CA-04.
- **Pasos:** una sugerencia; escribir en el buscador sin tocar la tarjeta.
- **Resultado esperado:** el buscador busca (con la base simulada responde "No encontramos productos con ese nombre."), la tarjeta sigue y no salió ningún ✓ ni ✕.
