# SPEC: Sublistas por fecha, crear (SCRUM-77 / HU-45)

## 1. Intención

Una persona quiere separar las compras de un evento o viaje de su lista general: crea una sublista con nombre y fecha, y le agrega productos con el mismo buscador de la lista general.

## 2. Criterios de aceptación (Jira)

- CA-01: al tocar un día del calendario (o un botón "+ Nueva sublista") se abre un flujo corto para nombrar la sublista y confirmar la fecha.
- CA-02: la sublista creada aparece de inmediato en el calendario con estado "pendiente".
- CA-03: agregar productos reutiliza el mismo patrón de búsqueda y agregado de la lista general.

## 3. Alcance

- Sección "Fechas" (`/fechas`): las sublistas ordenadas por fecha y el botón "+ Nueva sublista".
- Detalle (`/fechas/[listId]`): buscador, productos, cantidad y eliminar.
- Migración 038: `lists.name`, `lists.event_date`, RPC `create_date_list` y `add_item_to_date_list`.

## 4. Fuera de alcance

- La grilla de calendario: SCRUM-76. Mientras tanto la sección es una agenda ordenada por fecha, y CA-02 se cumple sobre esa agenda. El camino "tocar un día" de CA-01 llega con la grilla; el botón ya cumple el criterio.
- Tachar, modo compra, completar y cancelar: SCRUM-78.
- Total de gasto: SCRUM-79.
- Menú "Más" en mobile: con Fechas son 6 tabs. DESIGN §3.2 lo pide; queda para el sprint de UI/UX.
- Compartir sublistas personales al entrar a una familia: `decide_personal_lists` sigue moviendo solo la general. La sublista personal sigue visible para su dueña.

## 5. Reglas

1. Nombre obligatorio, de 1 a 60 caracteres, sin espacios a los lados. La base lo valida además de la UI.
2. Fecha obligatoria. La UI no acepta una fecha pasada; la base no lo valida porque su "hoy" está en UTC y en la noche de Costa Rica ya sería mañana.
3. Dueño y familia los decide la base, nunca el cliente: en una familia la sublista es de la familia; sin familia, personal (documento-proyecto §6).
4. Una fecha sin hora (`YYYY-MM-DD`) nunca pasa por `new Date(texto)`: lo lee como UTC y en Costa Rica se muestra el día anterior.
5. `active` en la base se muestra como "Pendiente".
6. Agregar lo que ya está pendiente suma 1, como en la lista general (regla 8 de shopping-list).
7. Solo se agrega a una sublista visible, de tipo `date` y activa.
8. El botón de crear se puede tocar mientras carga la sección. Si la carga llega después de crear, se une con lo que hay en pantalla: reemplazar borraría la sublista nueva.

## 6. Datos

| Columna | Tipo | Regla |
|---|---|---|
| `lists.name` | `text` | Obligatoria en `date`, nula en los otros tipos |
| `lists.event_date` | `date` | Obligatoria en `date`, nula en los otros tipos |

El acceso sigue la política de 024: la dueña si `household_id` es nulo, los miembros si no. La inserción directa sigue cerrada; se crea solo por RPC.

## 7. Estados de la pantalla

Cargando, error de carga, vacía (con invitación a crear), con datos, y sublista no encontrada en el detalle.
