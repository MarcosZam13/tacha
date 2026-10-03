---
tipo: registro de decisión (documentación, sin código)
ticket: SCRUM-126 (https://tacha.atlassian.net/browse/SCRUM-126)
fecha: 2026-10-02
estado: propuesta pendiente de aprobación del líder del proyecto
origen: análisis de SCRUM-126, SCRUM-83, SCRUM-84 y la epic SCRUM-14 hecho el 2026-10-02
relacionado: TICKET-busqueda-no-dispara-ingesta.md, referencia-tecnica-catalogo-scraping.md
---

# Decisión SCRUM-126 — Cómo se puebla y se mantiene el catálogo

> El texto de abajo es el análisis completo, copiado sin cambios. La única diferencia son los enlaces de la sección "Sources" a archivos del repo, que se reescribieron como rutas relativas al proyecto (regla de `.agents/skills/project-structure/SKILL.md`, sección 3: ninguna ruta de una máquina en los docs).

---

Analicé SCRUM-83, 84, 126, la epic SCRUM-14, tus tickets abiertos (SCRUM-83 a 89, 109 a 113 y 126) y el tablero completo. Todo lo que sigue sale de ahí y del código.

## 1. Qué se hará en SCRUM-126

SCRUM-126 queda como el ticket de diagnóstico y decisión, **sin código de aplicación**. Su PR es solo de documentación. Entrega:

1. **La decisión escrita en el ticket.** Se elige sembrar el catálogo completo por categorías de VTEX, normalizar asignando categoría y ordenar los resultados por categoría dominante. Se refresca por cron y la cola larga se cubre con una cola diferida. Se descartan la ingesta disparada desde el navegador y el "scrapear al buscar". Todo con sus trade-offs, y con el nombre del líder que la aprueba.
2. **`TICKET-busqueda-no-dispara-ingesta.md` actualizado** con el número de Jira y los enlaces a los tickets nuevos (es la subtarea 1 del propio ticket).
3. **Documentado qué proceso llena el catálogo y cada cuánto.** Hoy es solo manual y puntual. La referencia técnica (§7) dice que esto "no existe" y hay que corregirla.
4. **Criterios de aceptación reajustados.** El criterio "los 8 términos devuelven resultados" no se puede cumplir con un PR de documentación. Se mueve a SCRUM-130, donde se verifica con la lista de términos. Si no se edita, QA lo rechazaría. Editar la descripción en Jira lo hago solo con tu autorización.

## 2. Tickets nuevos

El siguiente número libre hoy es SCRUM-129. Los dejo como hijos de la epic SCRUM-14.

| Ticket | Contenido | Puntos (mi estimación) | Código estimado |
|---|---|---|---|
| **SCRUM-129** Ingesta por categoría | Árbol de categorías por tienda y llenado de `categories`; `categoryId` y `page` en `ingest-*`; script de siembra con modo de prueba, ritmo controlado y reanudable; docs y carpeta de scripts | 8 | ~350–450 líneas (TS, SQL y docs) |
| **SCRUM-130** Normalización con categoría y búsqueda ordenada | `category_id` desde `raw_json`; relleno de lo ya existente; `search_catalog` ordenada por categoría dominante e ignorando acentos; guía de pruebas | 8 | ~300–400 líneas, sobre todo SQL |
| **SCRUM-131** Mantenimiento y cola larga | Cron de refresco; cola de términos con RPC validado; ruta de debug; estado vacío en la UI | 13 (se parte al planificarlo) | ~700 o más |

Los puntos usan la escala del tablero (2, 3, 5 y 8; lo más grande hoy es SCRUM-115 con 8). Las líneas las estimo por la estructura del código. Son números míos que el equipo debe confirmar.

Cambié de dos tickets a tres, y el motivo es de proceso, no de gusto. `CONTRIBUTING` exige una historia por PR y un PR de 16 puntos sería casi imposible de revisar para QA. Separarlo calza con el principio de staging primero: SCRUM-129 solo escribe en staging (inofensivo). SCRUM-130 es el que toca el catálogo compartido, con migraciones y cuidado.

## 3. Orden de trabajo

Tu orden: 126 → 83 → 84 → nuevos. **Propongo 126 → 83 → 129 → 130 → 84 → 131.**

- **SCRUM-84 no puede ir antes.** HU-52 exige chips de categoría (CA-01) y combinarlos con el texto (CA-03). Hoy `categories` está vacía y `category_id` es siempre nulo. Sin 129 y 130, la historia se construye sobre la nada, no se puede probar, y por la regla de dependencias de `CONTRIBUTING` quedaría `on hold`.
- **SCRUM-83 sí puede ir antes.** Consume `search_catalog` y no necesita categorías. SCRUM-130 mantiene el contrato de esa función (misma firma y forma, solo cambia el orden de los resultados), así que no hay retrabajo.
- **Una sola PR `in progress` por persona.** Una cadena secuencial es lo que las reglas del repo ya imponen.
- **Consecuencia que debes aceptar:** SCRUM-84 pasa al Sprint 3. Además, tu Sprint 3 ya trae 12 puntos (SCRUM-85, 86 y 87), así que sumar 16 puntos obliga a correr algunas historias de catálogo una semana. SCRUM-85 (detalle con precio por tienda) es la que más se beneficia de tener datos reales, así que conviene que vaya después de SCRUM-130.

## 4. Cómo afecta al equipo

- **Base compartida.** Las migraciones las aplica el autor (`CONTRIBUTING` §5.1) y el equipo ve el catálogo cambiar de inmediato. Hay que avisar antes de normalizar en masa.
- **Compatibilidad.** Las Edge Functions necesitan redespliegue, pero los parámetros nuevos son opcionales. El código de Marcos (SCRUM-62, SCRUM-120) y las recetas de Jose siguen funcionando, porque no se borra ni se fusiona nada que ya referencien listas o recetas.
- **Documentación.** `AGENTS.md` y `project-structure` se actualizan para la carpeta de scripts, y `docs/documento-proyecto.md` si cambia el modelo de datos, todo en el mismo PR.

## 5. Cómo lo percibe el usuario

Buscar "arroz", "frijol" o "huevo" devuelve resultados al instante, porque se lee del catálogo ya cargado y no hay espera por scraping. Con "leche", los lácteos aparecen primero, y "azucar" sin tilde encuentra "Azúcar". Cada producto muestra un rango de precio por supermercado, útil para ahorrar. Los precios son aproximados (la historia ya lo dice, HU-51 CA-02) y tan frescos como el último refresco del cron. Lo que no existe en el catálogo se resuelve hoy creando el producto propio (HU-56 CA-04), y con SCRUM-131 también se puede pedir que se agregue.

## 6. Seguridad: qué cubre y qué no

**Cubre:**
- **Hueco que existe hoy:** el README del módulo dice que las `ingest-*` aceptan "anon-or-service-key". La anon key es pública, así que cualquier visitante puede disparar scraping con búsquedas inventadas que esquivan el caché. SCRUM-129 lo cierra restringiendo esas funciones a `service_role`, que es lo que ya usan el script y el cron. No leí los `index.ts` de las funciones, hay que confirmarlo al implementar.
- **Parámetros de la ingesta.** `categoryId` y `page` se validan como enteros acotados, sin armar URLs con texto libre.
- **Funciones de normalización.** Se les revoca la ejecución para `anon` y `authenticated`. Hoy solo las protege el RLS de staging.
- **`search_catalog`.** Sigue siendo de solo lectura.
- **Clave del script.** La service role va en `.env.local`, nunca con prefijo `NEXT_PUBLIC_`, y el script falla con un error claro si falta.
- **Texto e imágenes de VTEX.** Son datos de terceros: se muestran como texto y nunca como HTML.

**No cubre:**
- **Límite por usuario.** No existe hasta SCRUM-131.
- **Riesgo de bloqueo por parte de las tiendas.** Se mitiga con ritmo bajo y un barrido único, pero no desaparece.
- **Escritura de `household_store_preferences`.** Es otro ticket (SCRUM-127).
- **Ruta de debug.** Ocultarla en producción (SCRUM-124) no es un control. Sus escrituras necesitan validación server-side.

## 7. Cómo explicarlo

> "El catálogo estaba vacío porque ningún proceso lo llenaba: fue una sola búsqueda manual. Lo resolvemos en tres piezas: traer los productos completos de las categorías de supermercado, clasificarlos por categoría al normalizarlos, y mostrarlos priorizando la categoría que mejor coincide. Luego un proceso programado los mantiene al día. Así el usuario encuentra lo que escribiría en su lista de papel, y lo que falte lo agrega sin ayuda de nadie."

Para dejarlo en el ticket falta el nombre del líder que aprueba la decisión. Si estás de acuerdo con este plan y el orden, te lo dejo redactado en inglés para pegar en SCRUM-126 y los tres tickets nuevos. Hasta que me autorices no toco Jira.

Sources:
- [SCRUM-126](https://tacha.atlassian.net/browse/SCRUM-126)
- [SCRUM-83](https://tacha.atlassian.net/browse/SCRUM-83)
- [SCRUM-84](https://tacha.atlassian.net/browse/SCRUM-84)
- [SCRUM-14](https://tacha.atlassian.net/browse/SCRUM-14)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [docs/sprints.md](../sprints.md)
- [supabase/README.md](../../supabase/README.md)
