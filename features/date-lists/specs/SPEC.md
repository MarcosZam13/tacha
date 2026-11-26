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
- Tachar, completar y cancelar: SCRUM-78 (§9). Modo compra en sublistas: sin ticket todavía.
- Total de gasto: SCRUM-79 (§10).
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

Completar y cancelar llegan con SCRUM-78 (§9). Antes de eso toda sublista estaba pendiente desde la UI, así que los otros dos estados solo se podían ver con datos simulados.

Sin migración: usa `event_date` y `status`, que ya existen.

## 9. Estado de la sublista (SCRUM-78 / HU-46)

Una persona quiere saber de un vistazo cuáles sublistas ya resolvió y cuáles siguen pendientes.

- CA-01: una sublista pasa automáticamente a "completada" cuando todos sus items quedan tachados.
- CA-02: el usuario puede cancelar explícitamente una sublista que ya no se va a comprar, sin borrar su registro.
- CA-03: una sublista cancelada no cuenta como pendiente en ningún resumen o recordatorio.

Reglas:

1. "Completada" la decide un trigger de la base sobre `list_items`, no el cliente: así da igual quién tache o desde dónde. El trigger bloquea la fila de la lista, porque sin eso dos personas que tachan los dos últimos productos a la vez dejan la lista activa (probado: 3 de 3 con bloqueo completa, 3 de 3 sin bloqueo no).
2. Sin productos sigue activa: "todos tachados" no se cumple con una lista vacía. Eliminar el último pendiente, con los demás tachados, la completa.
3. Cancelar no borra nada. Una cancelada no cambia de estado por sus productos, no admite productos nuevos, y la pantalla deshabilita sus acciones. La base no impide tachar en una cancelada: `set_list_item_checked` es de todas las listas, y el estado igual no cambia.
4. Destachar o agregar a una completada la devuelve a activa. Por eso `add_item_to_date_list` ahora solo rechaza las canceladas: si no, al tachar lo último ya no se podría agregar lo que faltó.
5. Reactivar recalcula: si todo quedó tachado, vuelve como completada. No está en los CA; se agrega porque cancelar por error no tendría salida.
6. Ya tachado no se cambia la cantidad desde la fila: se destacha primero. Los pendientes van antes que los tachados.
7. CA-03: hoy no existe ningún resumen ni recordatorio de sublistas. Se cumple porque "cancelada" es un estado aparte de `active`: quien cuente pendientes filtra por `status = 'active'`. Revisarlo cuando exista el primero.

Fuera de alcance: modo compra en sublistas y total de gasto (SCRUM-79, §10).

Datos: migración 043. Sin columnas nuevas: `lists.status` ya admitía los tres valores desde 004.

## 10. Total de gasto de la sublista (SCRUM-79 / HU-47)

Una persona quiere saber cuánto costó un evento o una compra puntual, sin mezclarlo con el gasto general.

- CA-01: cada sublista muestra su propio total, independiente del total de la lista general.
- CA-02: el total de la sublista sigue el mismo modelo de "total editable" que las compras del historial.

Decisiones (Marcos, 2026-11-16):

- **D1. Total propio, no suma de compras.** Las sublistas no tienen modo compra y ninguna compra guardada está ligada a una lista (`purchase_sessions.list_id` es nulo en las 87). El total es un dato de la sublista que la persona escribe. Si algún día hay modo compra en sublistas, el total podría pasar a calcularse de sus compras.
- **D2. No cuenta en Finanzas.** La historia dice "sin mezclarlo con el gasto general". No se suma al total del periodo ni al presupuesto, y no se toca nada de Finanzas (SCRUM-90/91, de Laura).

Reglas:

1. Una sublista empieza "Sin total". Se agrega o se cambia desde su detalle; no se puede volver a dejar vacía. Es lo mismo que un total editado del historial (SCRUM-91): vacío no es un monto.
2. El monto se valida igual que el de una compra: colones enteros de ₡0 a ₡9 999 999 999, con separadores de miles en grupos de 3. La UI usa `parseColonesAmount` de Finanzas; la base lo repite con un `check` en `lists.spent_total` y en la RPC.
3. Lo puede cambiar cualquiera que vea la sublista: su dueña, o cualquier integrante si es de la familia. Es la misma regla que cancelar (§9).
4. En una sublista cancelada el total se ve pero no se cambia: la pantalla no ofrece el lápiz y la base rechaza el cambio. Reactivarla lo vuelve a habilitar. Completada sí se puede: es justo cuando se sabe cuánto se gastó.
5. El total sale en el detalle, debajo del estado, y en la tarjeta de la agenda junto a la fecha. Sin total, la tarjeta no dice nada.
6. Una sesión anónima también puede escribirlo: las sublistas funcionan con sesión anónima. Finanzas exige cuenta registrada porque guarda una zona horaria y periodos; el total de la sublista no depende de ninguno.

Fuera de alcance: modo compra en sublistas, sumar las sublistas en Finanzas, historial de cambios del total.

Datos: migración 050. Columna `lists.spent_total` (numeric, nula) con un `check` que solo la permite en listas `date` y con monto válido, y la RPC `set_date_list_total`. `lists` no tiene política de `update`, así que el cliente no puede escribir la columna directo; solo por la RPC.

## 11. SCRUM-163 (fix): fila con un producto que no se puede leer
Si una fila llega sin presentación (producto personal de otro miembro, RLS de la 032), la sublista la muestra como "Producto no disponible" en vez de no cargar. Hoy la app no deja llegar a ese caso en una sublista. Detalle en `features/shopping-list/specs/SPEC.md` §20.
