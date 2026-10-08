---
tipo: registro de decisión (documentación, sin código)
ticket: SCRUM-126 (https://tacha.atlassian.net/browse/SCRUM-126)
fecha: 2026-10-02
revisado: 2026-10-08
estado: decidido según la dirección del líder del proyecto (@MarcosZam13); pendiente de revisión de QA
origen: TICKET-busqueda-no-dispara-ingesta.md
relacionado: referencia-tecnica-catalogo-scraping.md, SCRUM-130, SCRUM-131, SCRUM-132, SCRUM-133
---

# Decisión SCRUM-126 — Cómo se puebla y se mantiene el catálogo

## Contexto

**El síntoma.** Buscar en el catálogo solo devuelve resultados para lo que salió de una corrida manual. Con la base consultada en modo lectura el 2026-10-02, `product_catalog` tenía 28 productos y todos coincidían con "leche". Las búsquedas de arroz, huevo, pan, frijol, azúcar, aceite, café y pollo devolvían cero resultados.

**La causa.** No es un error de una función, es diseño: ningún proceso ejecuta la ingesta.

- Las Edge Functions `ingest-*` llenan `product_catalog_staging` y guardan un caché de 6 h por término.
- `normalize_pending_staging` se invoca de forma explícita, nunca por trigger (spec 03).
- `search_catalog` es de solo lectura: una búsqueda no dispara scraping.
- Lo que falte en el catálogo debe cubrirlo el usuario con un producto propio (HU-51 CA-04, HU-56).

**Lo que se encontró al revisar la primera propuesta.**

1. **El agrupamiento no sigue el modelo acordado.** El equipo decidió el 2026-08-18 que `product_catalog` sea el "producto madre" (ej. "Leche"), con variantes por tamaño y la marca como detalle ([documento-proyecto.md, sección 4.5](../documento-proyecto.md#45-catálogo-de-productos-y-categorías)). En la práctica, `normalize_staging_row` nombra la madre con el nombre completo del producto y solo reutiliza una existente si la similitud de texto (`pg_trgm`) supera 0.4. Así nunca llega a una madre como "Leche": cada madre actual es un SKU completo (ej. "Leche Dos Pinos Pinito - 1000 ml"). Además `categories` tiene 0 filas y `category_id` es siempre nulo. Cargar más productos con este normalizador multiplicaría madres sueltas.
2. **Las recetas dependen de las madres.** `recipe_ingredients.product_catalog_id` apunta a `product_catalog` con la acción `NO ACTION`, así que no se puede borrar ni fusionar sin tocar lo que ya se usa.
3. **Las funciones `ingest-*` no validan quién llama.** El README de `supabase/` documenta que aceptan "anon-or-service-key"; la clave anon es pública, así que cualquiera puede disparar scraping con términos inventados que esquivan el caché.
4. **Almacenamiento.** `raw_json` pesa cerca de 12 KB por fila (medido). Diez mil productos serían unos 120 MB, contra 500 MB del plan gratuito, y la propuesta inicial no lo recortaba.
5. **Límites de VTEX.** La API pagina de a 50 resultados y, hasta donde se sabe, limita el desplazamiento cerca de 2 500; no está verificado para estas tiendas.

## Decisión

Se mantiene el modelo **madre + variantes por tamaño + marca como detalle**, porque recetas, listas, grupos y finanzas dependen de él. El catálogo se puebla con un lote mensual sobre una lista curada de madres.

1. **Lista curada de madres.** Un archivo de datos versionado en el repo, de unas 200 a 300 madres en total (ej. "Leche", "Arroz", "Huevos", "Pan cuadrado"). Cada una lleva `name`, `category`, `match_keywords` y `exclude_keywords` (ej. "Leche" excluye "magnesia", "jabón", "chocolate"). Al cargarse, siembra también `categories`. Los IDs de madre deben ser estables: la carga inserta por nombre y nunca borra madres.
2. **La normalización asigna, no crea.** Cada fila de staging se asigna a una madre de la lista usando palabras clave como señal principal y la ruta de categoría de VTEX (`product.categories` dentro de `raw_json`) como respaldo. Si la fila no encaja con ninguna madre, queda `pending` y no llega al catálogo. Las variantes salen del tamaño y la marca queda como detalle.
3. **Lote mensual con lo que ya existe.** Un script corre las `ingest-*` actuales usando como término el nombre de cada madre, normaliza esas filas y recorta `raw_json`. No se agregan parámetros a las Edge Functions, no se recorre el árbol de categorías de VTEX y no hay cola de términos largos.
4. **Lo que no esté en la lista** lo cubre "Mis productos" (HU-56).
5. **Las `ingest-*` solo aceptan `service_role`.** Es lo que ya usan el script y cualquier proceso programado.
6. **Limpieza del catálogo actual: opción B con re-seed.** Se borran las recetas de demo, se actualiza el seed de demo a las madres nuevas y se vuelve a correr. Los ingredientes y los ítems de lista reales se reasignan a mano. Las llaves foráneas se quedan en `NO ACTION`, porque evitan que un `DELETE` se lleve recetas sin avisar. Va en un ticket propio, solo después de probar el normalizador nuevo contra las filas de staging y avisando antes al equipo.
7. **`search_catalog` conserva su contrato y sigue siendo de solo lectura.**

Este PR es solo documentación. El trabajo se reparte en cuatro tickets, hijos de la épica SCRUM-14:

| Ticket | Alcance | Depende de |
|---|---|---|
| [SCRUM-130](https://tacha.atlassian.net/browse/SCRUM-130) | Restringir `ingest-maxipali`, `ingest-walmart` e `ingest-masxmenos` a `service_role`; apagar la página `/debug/scraping-demo`, que las llama desde el navegador | — |
| [SCRUM-131](https://tacha.atlassian.net/browse/SCRUM-131) | Lista curada de madres, tabla de reglas de mapeo y normalizador que asigna en vez de crear | — |
| [SCRUM-132](https://tacha.atlassian.net/browse/SCRUM-132) | Script mensual de ingesta (ingestar, normalizar y recortar `raw_json` por término) | SCRUM-130 y SCRUM-131 |
| [SCRUM-133](https://tacha.atlassian.net/browse/SCRUM-133) | Reset del catálogo, opción B con re-seed | SCRUM-131 probado contra staging |

El criterio "las búsquedas de arroz, huevo, pan, frijol, azúcar, aceite, café y pollo devuelven resultados" no puede cumplirse con un PR de documentación; se verifica con la primera corrida de SCRUM-132.

**Ajustes posteriores.** Una auditoría de la base (2026-10-06) agregó criterios de seguridad a SCRUM-130 y SCRUM-131: fijar el `search_path` de las funciones de normalización y de `search_catalog`, revocar a `anon` la ejecución de `normalize_*` y `parse_size_text`, revocar los permisos de escritura de `anon` y `authenticated` sobre las tablas del catálogo (incluido `TRUNCATE`, que RLS no controla), cerrar `get_recent_staging` y decidir qué hacer con la Edge Function `search-products`, que está desplegada pero no existe en el repo. El detalle vive en esos tickets.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Disparar la ingesta desde el navegador al buscar sin resultados ("scrapear al buscar") | El navegador llamaría a las `ingest-*` con la clave pública, con latencia de segundos por búsqueda y riesgo de que VTEX bloquee las peticiones. Además mantiene abierto el hueco de seguridad. |
| Una siembra puntual de términos comunes (C1) como solución | Es la más rápida, pero no arregla la causa y, con el normalizador actual, agrega madres sueltas por SKU. |
| Cargar categorías completas de VTEX y refrescarlas con un cron | Multiplicaría las madres por SKU, depende de límites de paginación sin verificar y el volumen de `raw_json` no cabe cómodamente en el plan. |
| Cola diferida de términos largos | Se descartó; lo que falte lo cubre "Mis productos". |
| Asignar `category_id` a las madres actuales y seguir | No las arregla: siguen siendo SKUs completos; la madre debe salir de una lista curada. |
| Limpieza A: dejar las madres actuales | Deja basura en el buscador. |
| Limpieza C: fusionar las madres actuales con las nuevas | Mucha lógica de fusión para muy pocos ingredientes reales. |

## Consecuencias

**A favor.**

- El catálogo vuelve al modelo acordado: buscar "arroz" devuelve una madre con sus variantes por tamaño y el rango de precio por supermercado.
- Existirán categorías, de las que dependen SCRUM-84 (filtrar por categoría) y SCRUM-87 (crear producto, que pide elegir categoría).
- El lote mensual y el recorte de `raw_json` mantienen el volumen de datos acotado.
- Se cierra el acceso público a las `ingest-*`.

**En contra o con riesgo.**

- La lista curada es trabajo manual y hay que mantenerla. Lo que no esté en ella no aparece en el catálogo.
- Los precios pueden tener hasta un mes de antigüedad. La app ya los muestra como aproximados (HU-51 CA-02).
- Mientras no se ejecute SCRUM-133, las 28 madres actuales conviven con el normalizador nuevo; las recetas y listas existentes siguen funcionando.
- El reset toca la base compartida: se borran las recetas de demo y hay que reasignar a mano los ingredientes y los ítems de lista reales. Las cifras de recetas, ingredientes y listas cambian a diario, así que se vuelven a contar el día del reset.
- Cada ticket agrega una migración o un cambio de despliegue en la base compartida. Se avisa al equipo en las notas de desarrollador de cada PR.
- El tope de 50 resultados por término y el riesgo de bloqueo por parte de las tiendas son límites conocidos; se mitigan con ritmo controlado.

## Fuera del alcance de este PR

- Cualquier código de aplicación, migración o despliegue.
- Correcciones a `supabase/README.md` y a [referencia-tecnica-catalogo-scraping.md](referencia-tecnica-catalogo-scraping.md) (sección 7), que dicen que la normalización no está implementada y que las `ingest-*` aceptan la clave anon: se actualizan en SCRUM-130 y SCRUM-131.
- El contenido de la lista curada. Falta definir quién la redacta y qué incluye el primer subconjunto, que debe cubrir los ingredientes de las recetas y listas actuales (se resuelve en SCRUM-131).

## Sources

- [SCRUM-126](https://tacha.atlassian.net/browse/SCRUM-126)
- [SCRUM-130](https://tacha.atlassian.net/browse/SCRUM-130), [SCRUM-131](https://tacha.atlassian.net/browse/SCRUM-131), [SCRUM-132](https://tacha.atlassian.net/browse/SCRUM-132), [SCRUM-133](https://tacha.atlassian.net/browse/SCRUM-133)
- [TICKET-busqueda-no-dispara-ingesta.md](TICKET-busqueda-no-dispara-ingesta.md)
- [referencia-tecnica-catalogo-scraping.md](referencia-tecnica-catalogo-scraping.md)
- [specs/spec-03-normalizacion-staging.md](specs/spec-03-normalizacion-staging.md)
- [docs/documento-proyecto.md, sección 4.5](../documento-proyecto.md#45-catálogo-de-productos-y-categorías)
- [supabase/README.md](../../supabase/README.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
