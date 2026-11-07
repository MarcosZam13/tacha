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

- La grilla de calendario: SCRUM-76 (§8). Hasta entonces la sección era una agenda ordenada por fecha, y CA-02 se cumplía sobre esa agenda. El camino "tocar un día" de CA-01 llega con la grilla; el botón ya cumple el criterio.
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

## 8. Calendario (SCRUM-76 / HU-44)

Una persona quiere ver de un vistazo qué compras tiene por fecha, y crear una tocando el día.

- CA-01: "Fechas" muestra un calendario con las sublistas marcadas en su fecha.
- CA-02: cada sublista muestra su estado con una diferencia visual clara.
- CA-03: el usuario sin familia también accede, con sublistas personales. Lo da la RLS de 024, sin cambios.

Reglas:

1. Semanas de lunes a domingo, igual que el periodo semanal de finanzas.
2. Abre en el mes actual, según la fecha local. La grilla se dibuja solo en el navegador: el servidor corre en UTC y en la noche de Costa Rica ya sería otro día.
3. Al crear una sublista de otro mes, el calendario salta a ese mes. Si no, CA-02 de SCRUM-77 no se vería.
4. Tocar un día de hoy en adelante abre el formulario con esa fecha. Un día pasado no tiene botón (§5, regla 2). El formulario igual valida la fecha.
5. El estado no depende solo del color: lleva marca, y la cancelada además se tacha en la celda. En mobile el punto solo da una pista de color; el estado completo se lee en la agenda.
6. En desktop la celda muestra hasta 2 sublistas y "+N más". En mobile muestra un punto por sublista, porque el nombre no cabe.
7. Debajo sigue la agenda, solo del mes visible: en mobile es donde se leen los nombres y se abre cada sublista.

Fuera de alcance: completar y cancelar (SCRUM-78). Hoy toda sublista está pendiente desde la UI, así que los otros dos estados solo se pueden ver con datos simulados.

Sin migración: usa `event_date` y `status`, que ya existen.
