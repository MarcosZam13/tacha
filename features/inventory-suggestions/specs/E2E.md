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
