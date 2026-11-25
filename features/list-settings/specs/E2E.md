# Plan E2E: Configuración — el "encargado" por lista (SCRUM-108 / HU-78)

Deriva de [SPEC.md](SPEC.md) (§13) y de [plan.md](plan.md#6-pruebas). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests van en `e2e/features/list-settings/list-settings.spec.ts` (escenarios `E2E-CONF-nn`), con sus helpers en `e2e/features/list-settings/list-settings.helpers.ts`.

## Qué validan y qué no

**Estos escenarios validan solo la interfaz**, en un navegador real (desktop y Pixel 7), con una **sesión simulada** y **respuestas de Supabase simuladas**:

- **No validan la autenticación real:** la sesión es falsa, escrita en `localStorage`; el usuario no existe en la base.
- **No validan la seguridad de la base:** RLS, permisos de columna, el trigger de respaldo ni las tres RPC. Ninguna petición llega a Supabase: todas se responden desde el test.
- **No validan los datos reales:** que la base devuelva solo las listas propias o de la familia, ni quiénes tienen acceso a una lista. Las respuestas las arma el test.

Lo real lo cubren:

- **La base:** la prueba SQL `supabase/tests/047_list_assignee_settings.test.sql` (permisos, aislamiento entre familias, candidatos, asignar, apagar sin borrar, escrituras directas, salir de la familia).
- **El acceso con cuenta real:** las pruebas manuales de SPEC §13 (una cuenta registrada contra la base compartida y dos cuentas de la misma familia).

Una respuesta simulada puede alejarse de la real; el E2E pasaría con un contrato roto. Lo mitigan los tests de los servicios (`list-settings.service.test.ts` y `assignee.service.test.ts`), que fijan tabla, columnas y RPC con nombres literales.

**Nivel más bajo que alcanza:** el orden y los nombres de las listas, el estado del interruptor, el selector, los errores y los estados de carga ya tienen tests unitarios y de componente. Acá va lo que solo prueba un navegador: la navegación del Perfil a Configuración, que el ajuste y los encargados sobreviven a una recarga, y que nada se sale de la pantalla en mobile.

**No cubierto en E2E:** el campo en la fila de la **lista general** (`/lista`). Es el mismo componente que en la sublista, y esa pantalla necesita muchas respuestas simuladas más (lista, avisos de faltante, compra abierta); lo cubren los tests de la fila (`ShoppingListRow.test.tsx`) y la prueba manual.

## Datos y entorno

- **Sesión registrada simulada:** `signInAsFakeUser` (`e2e/support/fake-session.ts`), antes de abrir cada pantalla. El usuario simulado es "Ana" (`00000000-0000-4000-8000-000000000001`).
- **Supabase simulado por ruta** (`page.route` sobre `NEXT_PUBLIC_SUPABASE_URL`). El estado (el ajuste de cada lista y el encargado del producto) vive en el stub y sobrevive a un `goto`, como la base:

  | Petición | Respuesta simulada |
  |---|---|
  | `GET /rest/v1/lists?select=…list_settings(…)` (Configuración) | La lista general (sin fila de ajuste, apagada) y la sublista "Cumple de Ana", 20/12/2099 |
  | `GET /rest/v1/lists?select=…list_items(…)` (detalle de la sublista) | La sublista con un producto, "Leche entera" |
  | `GET /rest/v1/list_settings?list_id=eq.…` | El ajuste que recuerda el stub; ninguna fila si nunca se guardó |
  | `GET /rest/v1/list_items?select=id,assigned_to…` | El producto con su encargado, si tiene uno |
  | `POST /rest/v1/rpc/get_list_assignee_candidates` | "Ana" (la persona de la sesión) y "Beto" |
  | `POST /rest/v1/rpc/set_list_assignee_enabled` | El ajuste guardado `{ list_id, assignee_enabled }`; el stub lo recuerda (o un `500` en E2E-CONF-05) |
  | `POST /rest/v1/rpc/set_list_item_assignee` | El producto con su nuevo encargado; el stub lo recuerda |
  | Cualquier otra a Supabase | `[]` (`200`) |

- **Limpieza:** no hace falta. No se escribe nada en la base; la sesión falsa vive solo en el contexto del navegador del test.
- **Textos:** se escriben en el spec a propósito. Si cambia un texto aprobado de SPEC §7 u §8, falla el E2E.
- **Servidor en frío:** el spec calienta `/perfil`, `/perfil/configuracion` y el detalle de la sublista antes de empezar y da más tiempo por test, como `finance`.
- **Cómo se corre:** `npx playwright test e2e/features/list-settings`. Necesita `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, aunque no se llame a Supabase, y Chromium instalado (`npx playwright install chromium`).

## Escenarios

### E2E-CONF-01: del perfil a Configuración y encender el ajuste de una lista

- **Cubre:** HU-78 CA-01, CA-02.
- **Precondiciones:** sesión registrada; la sublista ya tiene el ajuste encendido y la general no tiene fila.
- **Pasos:** abrir `/perfil`; tocar "Configuración"; tocar el interruptor de la lista general; recargar.
- **Resultado:** la URL es `/perfil/configuracion`; hay un interruptor por lista, la general apagada (por defecto) y la sublista encendida; al tocar, el de la general queda encendido y se pide `set_list_assignee_enabled` con esa lista y `true`; el de la sublista no cambia; tras recargar sigue encendido.

### E2E-CONF-02: con el ajuste encendido, la fila muestra el campo y se elige al encargado

- **Cubre:** HU-78 CA-03.
- **Precondiciones:** sesión registrada; la sublista tiene el ajuste encendido y su producto no tiene encargado.
- **Pasos:** abrir el detalle de la sublista; tocar "Encargado: Sin asignar"; elegir "Beto"; volver a abrir y elegir "Sin asignar".
- **Resultado:** el selector ofrece "Sin asignar", "Ana (tú)" y "Beto" (y "Cancelar"); al elegir se cierra, la fila dice "Encargado: Beto" y se pide `set_list_item_assignee` con Beto; al elegir "Sin asignar" se pide con `null` y la fila lo muestra.

### E2E-CONF-03: con el ajuste apagado la fila no muestra el campo

- **Cubre:** HU-78 CA-03.
- **Precondiciones:** la sublista tiene el ajuste apagado.
- **Pasos:** abrir el detalle de la sublista.
- **Resultado:** el producto se ve y no hay ningún botón "Encargado: …".

### E2E-CONF-04: apagar el ajuste no borra al encargado; al encenderlo vuelve

- **Cubre:** HU-78 CA-03 (representative case only: la base lo prueba la prueba SQL 047, paso 7).
- **Precondiciones:** la sublista tiene el ajuste encendido y su producto tiene a Beto de encargado.
- **Pasos:** ver "Encargado: Beto" en el detalle; ir a Configuración y apagar el ajuste de la sublista; volver al detalle; volver a Configuración y encenderlo; volver al detalle.
- **Resultado:** con el ajuste apagado el campo no se ve; al encenderlo se ve otra vez "Encargado: Beto".

### E2E-CONF-05: si falla al guardar, el interruptor no cambia y se avisa junto a la lista

- **Cubre:** SPEC §7.
- **Precondiciones:** guardar el ajuste responde con un error.
- **Pasos:** abrir Configuración y tocar el interruptor de la lista general.
- **Resultado:** aparece "No se pudo guardar el ajuste. Intenta de nuevo." (`role="alert"`) y el interruptor sigue apagado; se hizo una sola petición.

### E2E-CONF-06: Configuración y el selector caben en la pantalla

- **Cubre:** SPEC §8 (mobile) y §9.
- **Precondiciones:** la sublista tiene el ajuste encendido. Se corre en `chromium` y en `mobile-chrome` (Pixel 7).
- **Pasos:** abrir Configuración; abrir el detalle de la sublista y el selector de encargado.
- **Resultado:** ninguna de las dos pantallas tiene scroll horizontal.

## Cobertura

| Criterio | E2E | Otros niveles |
|---|---|---|
| HU-78 CA-01 | E2E-CONF-01 | `ListSettings.test.tsx`, `toSettableLists.test.ts`, `Profile.test.tsx` (el enlace), manual |
| HU-78 CA-02 | E2E-CONF-01 | `useListSettingsViewModel.test.ts`, prueba SQL 047 (apagado por defecto), manual |
| HU-78 CA-03 | E2E-CONF-02, 03, 04 | `AssigneeField.test.tsx`, `useListAssigneesViewModel.test.ts`, prueba SQL 047 (apagar no borra), manual |
| Errores al guardar | E2E-CONF-05 | `useListSettingsViewModel.test.ts`, `useListAssigneesViewModel.test.ts`, servicios |
| Mobile | E2E-CONF-06 (`mobile-chrome`) | manual |
| Seguridad y acceso | no cubierto en E2E | prueba SQL 047, manual (dos cuentas) |
