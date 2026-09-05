# Spec 1 — Demo de ingesta de scraping (cache-first)

> Nota: esta spec NO viene de una historia de usuario — es documentación de demo/verificación del core de scraping, para que el equipo (y sus agentes de IA) entienda cómo funciona esta pieza antes de construir features que dependan de ella. Ya está implementada en Supabase; esta spec sirve para construir una demo/página de verificación local, no para reconstruir el backend.

## Intent

Construir una pantalla/script de demo que invoque las 3 Edge Functions de ingesta (`ingest-maxipali`, `ingest-walmart`, `ingest-masxmenos`) y muestre visualmente el comportamiento cache-first: primera búsqueda = llamada en vivo a VTEX, segunda búsqueda igual dentro de 6 horas = respuesta desde cache, sin volver a golpear VTEX. El objetivo es que cualquiera del equipo pueda ver con sus propios ojos que el pipeline de scraping funciona y entienda su contrato antes de construir sobre él.

## In scope

- Formulario simple: input de texto (query) + selector de tienda (maxipali/walmart/masxmenos) + botón "Buscar".
- Al enviar, hacer `POST` a `https://ifvwumejbfpowxlkjfiu.supabase.co/functions/v1/ingest-<tienda>` con `{ "query": "<texto>" }`.
- Mostrar la respuesta cruda (`source`, `store`, `query`, `stagedCount`, `warning` si existe) en pantalla.
- Mostrar un indicador visual claro de qué `source` vino (`live` = verde "consultó VTEX en vivo", `cache` = azul "vino de cache", `stale-cache` = amarillo "VTEX falló, mostrando cache viejo").
- Botón adicional "Ver filas en staging" que haga un `select` de solo lectura a `product_catalog_staging` filtrando por las últimas filas insertadas (usar el timestamp de la respuesta o simplemente las últimas N por `scraped_at desc`) y las liste en una tabla simple: nombre, marca, tamaño, imagen.
- Manejo visible de los 3 estados de respuesta: éxito, error 400 (query inválido), error 502 (VTEX caído y sin cache).

## Out of scope

- No implementar autenticación de usuario real — usar la `anon key` del proyecto directo en el cliente de demo (esto es una herramienta interna de equipo, no algo que se despliegue a producción).
- No construir UI de producción ni seguir el sistema de diseño de Tacha (paleta, tipografías) — esto es una herramienta de verificación técnica, puede ser una página simple sin estilizar.
- No implementar el catálogo normalizado ni nada de matching — eso es la Spec 3.
- No paginar ni filtrar resultados de staging más allá de "últimos N".

## Requirements

1. El cliente debe usar exactamente el contrato documentado: `POST` con body `{ query: string }`, header `Authorization: Bearer <anon-key>`.
2. Debe distinguir visualmente los 3 valores posibles de `source` (`live`, `cache`, `stale-cache`) sin que el usuario tenga que leer el JSON crudo para entenderlo.
3. Debe permitir repetir la misma búsqueda dos veces seguidas y que sea evidente (por el campo `source`) que la segunda vez no volvió a golpear VTEX.
4. La consulta de staging debe ser de solo lectura — esta demo nunca debe escribir directamente a `product_catalog_staging`, solo leerla después de que la Edge Function ya escribió.
5. Query de menos de 2 caracteres debe mostrar el error 400 tal como lo devuelve la función, no un error genérico inventado por el cliente.

## Edge cases & errors

- Búsqueda de un término que no existe en el súper (ej. "xyzasdqwe123"): la Edge Function responde `200` con `stagedCount: 0` — la demo debe mostrar "0 productos encontrados", no tratarlo como error.
- VTEX responde lento o cae: después de ~2 intentos con reintento la función devuelve `502` (sin cache previo) o `stale-cache` con warning (con cache previo) — ambos casos deben mostrarse de forma distinta y clara.
- El usuario cambia de tienda a mitad de sesión: cada tienda tiene su propio cache (`store_id` + `normalized_query` es la clave compuesta), así que buscar "leche" en MaxiPali y luego en Walmart son dos llamadas en vivo independientes — la demo no debe asumir que el cache es compartido entre tiendas.
- Mayúsculas/espacios en el query ("  Leche  " vs "leche"): el backend normaliza (`trim().toLowerCase()`) antes de usar como clave de cache — la demo no necesita normalizar nada de su lado, solo mandar el texto tal cual lo escribió el usuario.

## Constraints

- No modificar ninguna Edge Function ni tabla existente — esta spec es solo un cliente que consume lo que ya está desplegado.
- Puede ser un script de Node/TS standalone, una página HTML simple, o una ruta de debug dentro del proyecto Next.js del equipo — decisión libre de quien lo implemente, mientras cumpla el contrato de arriba.
- Usar la URL base real: `https://ifvwumejbfpowxlkjfiu.supabase.co/functions/v1/`.

## Acceptance criteria

- [ ] Buscar "leche" en MaxiPali por primera vez muestra `source: "live"` y un `stagedCount > 0` (asumiendo que MaxiPali tiene resultados para "leche", lo cual es esperable).
- [ ] Repetir la misma búsqueda inmediatamente después muestra `source: "cache"` con el mismo `stagedCount`.
- [ ] La tabla de staging mostrada coincide en cantidad y nombres con lo que hay realmente en `product_catalog_staging` para esa tienda (verificable comparando contra el Table Editor de Supabase).
- [ ] Un query de 1 carácter muestra el mensaje de error 400 tal como lo devuelve el backend.
- [ ] Buscar en las 3 tiendas distintas para el mismo término deja 3 entradas independientes en `search_cache` (una por `store_id`).
