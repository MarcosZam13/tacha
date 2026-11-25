# Plan E2E: Mi inventario

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/my-inventory/my-inventory.spec.ts` y cada `test(...)` lleva el ID del escenario en el nombre.

Nivel más bajo que alcanza: qué entra al inventario y en qué orden se prueba en `supabase/tests/065_my_inventory.test.sql`; los grupos, los cortes y los textos, en los tests unitarios. Acá va lo que solo prueba un navegador: la pantalla con sus grupos, el estado vacío y la navegación desde General.

## Datos y entorno

- **Supabase simulado:** sesión registrada falsa (`e2e/support/fake-session.ts`); toda petición responde `[]` y `get_my_inventory` responde lo que pide cada escenario. Las fechas se arman a mediodía para que el día no cambie según la zona del navegador.

## Escenarios

### E2E-MINV-01: agrupa por urgencia con cuánto le queda a cada producto
- **Cubre:** CA-01 y CA-02.
- **Pasos:** el inventario devuelve Leche (3 días), Café (20), Arroz (60) y Sal (sin fecha); abrir `/lista/inventario`.
- **Resultado esperado:** los grupos "Vence pronto", "Este mes", "Más adelante" y "Sin fecha estimada", en ese orden; "Te quedan 3 días", "20" y "60"; Sal sin días; la página no tiene scroll horizontal.

### E2E-MINV-02: estado vacío
- **Cubre:** CA-04.
- **Pasos:** el inventario devuelve `[]`; abrir `/lista/inventario`.
- **Resultado esperado:** "Todavía no hay nada en tu inventario. Se llena solo cuando tachas productos al comprar." y ningún grupo.

### E2E-MINV-03: se entra desde General y se vuelve a la lista
- **Cubre:** CA-01 (entrada).
- **Pasos:** abrir `/lista`; tocar "Mi inventario"; tocar "← Volver a la lista".
- **Resultado esperado:** la URL pasa a `/lista/inventario` con Leche en "Vence pronto", y vuelve a `/lista`.

### E2E-MINV-04: se entra con "Ver mi inventario" desde "¿Se te acabó?"
- **Cubre:** CA-01 (entrada desde la fila de sugerencias).
- **Pasos:** la RPC de sugerencias devuelve una fila (así aparece "¿Se te acabó?"); abrir `/lista`; tocar "Ver mi inventario" dentro de esa fila.
- **Resultado esperado:** la URL pasa a `/lista/inventario` con Leche en "Vence pronto".
