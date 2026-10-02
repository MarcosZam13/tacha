# Lista general: buscar, añadir y ajustar cantidad

Historias: [SCRUM-62 / HU-36a](https://tacha.atlassian.net/browse/SCRUM-62) (buscar y añadir producto) · [SCRUM-63 / HU-36b](https://tacha.atlassian.net/browse/SCRUM-63) (ajustar cantidad). Sprint 1.

## Intención

Que el usuario arme su lista general buscando productos del catálogo real y ajustando cuánto necesita, sin salir de la pantalla, y que la lista quede guardada.

## Alcance

- Barra de búsqueda arriba de la lista, con resultados en vivo del RPC `search_catalog` (mínimo 2 caracteres, con debounce).
- Cada resultado es una **variante** del producto madre, mostrada como nombre del producto + tamaño (ej. "Crema de Leche Nestlé - 236g" · "236 g"), porque `list_items` referencia `product_catalog_variants` (documento-proyecto §6).
- Al elegir un resultado, se añade a la lista general del usuario con cantidad 1. Si esa variante ya está, se le suma 1 en vez de duplicar la fila (regla de merge que vive en la base, documento-proyecto §6).
- Controles "+" y "−" en cada fila; "−" nunca baja de 1.
- La lista se guarda en Supabase (`lists` + `list_items`) y se carga al abrir la pantalla.

## Fuera de alcance (y por qué)

- Tachar, eliminar, ver detalle: son HU-36c/d/e, Sprint 2.
- Listas de household: los households se construyen este mismo sprint (otra persona); por ahora `household_id` siempre es `null`.
- Registro e inicio de sesión: los construye otra persona. Mientras tanto se usa una sesión anónima de Supabase para tener un `auth.uid()` real y que RLS funcione.
- Buscador compartido con otras features: se promueve a `components/` (compartido) cuando exista el segundo consumidor real (ej. "Mis grupos").

## Requerimientos

1. La lógica vive en hooks (`hooks/`), el acceso a datos en servicios; los `.tsx` solo presentan.
2. Cero literales: textos, límites y tiempos en `constants/`.
3. El estado de la lista se maneja con `useReducer`: todas las reglas de cómo cambia la lista en un reducer puro.
4. Las búsquedas viejas nunca pisan a las nuevas (race condition).
5. Los controles de cantidad no pueden estar anidados dentro de otro botón (HTML inválido, y en Sprint 2 la fila completa tacha).

## Casos límite y errores

- Texto de menos de 2 caracteres: no se busca, no se muestran resultados.
- Búsqueda sin resultados: mensaje de "sin resultados".
- Error de red o de Supabase al buscar, añadir o cambiar cantidad: mensaje de error, la lista no queda en un estado inventado.
- Usuario escribe rápido: solo cuenta la última búsqueda.
- Añadir la misma variante dos veces: una sola fila con cantidad 2.

## Restricciones

Skills que aplican: `component-architecture`, `constants-standards`, `project-structure`, `security-practices` (RLS), `gitflow`. Reusar primitivos de `components/ui` cuando encajen.

## Criterios de aceptación

HU-36a
- [x] CA-01: hay una barra de búsqueda en la parte superior de la lista general.
- [x] CA-02: al escribir, se muestran en tiempo real los productos del catálogo que coinciden.
- [x] CA-03: al seleccionar un resultado, se añade a la lista con cantidad 1.
- [x] CA-04: el producto aparece de inmediato como fila, sin recargar.

HU-36b
- [x] CA-01: cada fila muestra "+" y "−" junto a la cantidad.
- [x] CA-02: "+" suma 1.
- [x] CA-03: "−" resta 1 y no baja de 1.
- [x] CA-04: el cambio se ve de inmediato, sin confirmación, y tocar los controles no dispara ninguna otra acción de la fila.
  - Cómo se cumple: la cantidad cambia en cuanto responde la base (sin diálogo de confirmación ni recarga); mientras tanto los botones de esa fila quedan deshabilitados. No es actualización optimista (ver decisiones en [plan.md](plan.md)).
