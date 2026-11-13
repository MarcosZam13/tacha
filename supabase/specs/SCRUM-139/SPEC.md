# SPEC — SCRUM-139: normalize_staging_row — desempate no determinístico y over-matching por categoría ancha

Ticket: [SCRUM-139](https://tacha.atlassian.net/browse/SCRUM-139) · Dueño: Daniel Salas · Sprint 4
Origen: encontrado en la revisión de QA de SCRUM-131 (2026-10-11). QA lo marcó explícitamente como no bloqueante para ese PR, pero a arreglar antes de que SCRUM-132 (ingesta mensual) empiece a traer categorías nuevas.

Ver también: [docs/documento-proyecto.md §4.7](../../../docs/documento-proyecto.md#47-web-scraping--motor-de-datos-prioridad-alta-del-proyecto) (decisión de arquitectura, 2026-11-01) · [supabase/specs/SCRUM-131/SPEC.md §6](../SCRUM-131/SPEC.md) (comportamiento original de `normalize_staging_row`) · [docs/catalogo-scraping/DECISION-SCRUM-126-poblacion-del-catalogo.md](../../../docs/catalogo-scraping/DECISION-SCRUM-126-poblacion-del-catalogo.md) (mismo riesgo de falso positivo que ese documento ya advertía, ahora a nivel de categoría en vez de keyword) · [SCRUM-138/SPEC.md](../SCRUM-138/SPEC.md) (mismo origen, arreglar ambos antes de SCRUM-132) · [SCRUM-132/SPEC.md](../SCRUM-132/SPEC.md) (depende de este ticket)

## 1. Intención

Dos problemas reales en la rama de categoría de `normalize_staging_row` (migración `020_curated_mothers.sql`), confirmados en el código (2026-11-01):

**Problema 1 — desempate no determinístico.** El `order by` que elige entre reglas empatadas:

```sql
order by
  length(pmr.vtex_category_prefix) desc,
  (select count(*) from unnest(pmr.match_keywords) kw
   where lower(scraped_name) like '%' || lower(kw) || '%') desc
limit 1;
```

no tiene un tercer criterio. Si dos reglas empatan en largo de prefijo y en cantidad de keywords coincidentes (0 hits en ambas — un nombre de producto que no contiene ninguno de los dos), Postgres puede devolver cualquiera de las dos filas, sin garantía de que el resultado sea el mismo si se vuelve a correr. Confirmado en `supabase/data/madres.json` (2026-11-01): "Chocolate" y "Dulces" comparten el prefijo `/Abarrotes/Dulces y Chocolates/`; "Leche" y "Leche de coco" comparten `/Lácteos/Leche/`.

Con las 12 reglas de hoy, una vez aplicado el cambio del Problema 2 este empate ya no se puede dar con datos reales: con 0 hits ninguna regla ancha entra, y cada par que comparte prefijo se separa por `exclude_keywords`. El desempate se agrega igual, porque cualquier madre nueva con el mismo prefijo lo reabre.

El mismo defecto existe en la rama de respaldo por keyword (`020`, `order by` de una sola clave: cantidad de keywords coincidentes). No lo menciona el ticket, pero es el mismo criterio de aceptación (mismo resultado en cada corrida) y está confirmado con datos reales (2026-11-04): de los nombres distintos en `product_catalog_staging`, 24 empatan en esa rama entre 2 o 3 madres — ej. "Chocolate Milka de Leche - 90 g" (Chocolate | Leche), "Dulce de Leche La Lechera - 325 g" (Dulces | Leche), "Helado Dulce De Leche Alaska 500grea" (Dulces | Helado | Leche).

**Problema 2 — la rama de categoría no exige ningún keyword.** El branch principal (categoría) solo exige que el prefijo de VTEX coincida y que ningún `exclude_keywords` aparezca — nunca exige que aparezca algún `match_keywords`. En la validación de SCRUM-131 (`begin...rollback` sobre 100 filas reales, 2026-10-11) esto funcionaba (ej. "Froot Loops" → Cereal, "Paleta Pops" → Helado matchean bien), pero significa que cualquier producto bajo un prefijo de categoría ancho se asigna a esa madre sin importar su nombre. Con el batch mensual (SCRUM-132) trayendo categorías nuevas, prefijos anchos van a sobre-matchear:

- `Helado` → `/Alimentos Congelados/` (confirmado en `madres.json`) atraparía también pizza o nuggets congelados.
- `Arroz` → `/Abarrotes/Arroz, Frijol y Semillas/` (confirmado en `madres.json`) atraparía también frijoles o semillas.

El ticket también menciona `Crema de leche` → `/Abarrotes/Harinas y Repostería/Repostería/` (polvo de hornear o gelatina). Ese prefijo tiene 3 segmentos y ya es una categoría hoja, así que con el criterio de §3 **no** se trata como ancho y queda fuera de este ticket (ver §3).

Ya pasa con datos reales (2026-11-04, filas `matched` de la corrida de prueba de SCRUM-132 del 2026-11-02): "Frambuesa Chocolate Leche Franui 150 g" quedó en Helado, "Chips Chocolate Sweetwell De Leche 220g" en Cereal y "Cajeta Dore leche -100 g" en Chocolate, todas por prefijo de categoría sin ningún keyword de la madre en el nombre.

Es el mismo riesgo de falso positivo que `DECISION-SCRUM-126-poblacion-del-catalogo.md` ya advertía para keywords — reintroducido a nivel de categoría.

## 2. Decisiones ya tomadas (detalle y motivo en documento-proyecto.md §4.7, 2026-11-01)

- **Problema 2:** se exige al menos un `match_keywords` también en la rama de categoría cuando el prefijo es ancho — no se angostan los prefijos en `madres.json` (requeriría mapear el árbol completo de categorías de VTEX, no disponible hoy).
- **Problema 1:** desempate final por `pmr.product_catalog_id` (el id de la madre), en las dos ramas (categoría y respaldo por keyword). No por `pmr.id`: el seed de `020` (generado por `scripts/generate-madres-migration.ts`) borra y vuelve a insertar las reglas, y `product_mother_rules.id` es `default gen_random_uuid()`, así que cambia cada vez que se regenera el seed (ej. al agregar madres nuevas a `madres.json`). El id de la madre en `product_catalog` sí es estable: se inserta con upsert por nombre y nunca se borra (SCRUM-131). Motivo completo en plan.md §3.

## 3. ¿Qué significa "prefijo ancho"? (criterio a implementar)

No todos los prefijos de `madres.json` son anchos — "Leche condensada" (`/Lácteos/Leche/Condensada/`) es tan específico como su propia madre. El riesgo real está en los prefijos que varias madres podrían compartir o que son de 1-2 segmentos (`/Alimentos Congelados/`, `/Abarrotes/Arroz, Frijol y Semillas/`). Se define "ancho" por **segmentos del path**, no por una lista manual: un prefijo con 2 segmentos o menos (ej. `/Alimentos Congelados/` tiene 1 segmento no vacío) se trata como ancho y exige `match_keywords`; con 3+ segmentos (ej. `/Lácteos/Leche/Condensada/`) se mantiene el comportamiento actual (solo categoría + sin exclude).

Umbral confirmado contra los 12 prefijos de `madres.json` (2026-11-04):

| Anchos (≤2 segmentos, exigen keyword) | No anchos (3 segmentos, sin cambio) |
|---|---|
| Helado (1), Leche, Leche de coco, Chocolate, Dulces, Cereal, Arroz, Repostería (2) | Leche condensada, Leche evaporada, Crema de leche, Jabón |

Las 12 tienen al menos 1 `match_keywords`, así que ninguna regla queda imposible de matchear.

## 4. Alcance

**Sí incluye:**
- Desempate final determinístico por `pmr.product_catalog_id` en el `order by` de las dos ramas (categoría y respaldo por keyword).
- Exigir al menos 1 `match_keywords` coincidente también en la rama de categoría, cuando el prefijo tiene 2 segmentos o menos (§3).
- Revalidar contra las filas reales de staging qué asignaciones cambiarían (plan.md §5). No se puede volver a correr el normalizador sobre ellas con categorías: SCRUM-132 recortó `raw_json` y hoy solo 2 de 250 filas conservan `product.categories` (verificado 2026-11-04).

**Efecto conocido** (verificado 2026-11-04 sobre las 219 filas `matched`): solo 10 filas (4 nombres distintos) dejarían de entrar por la rama de categoría: "Frambuesa Chocolate Leche Franui" (Helado), "Chips Chocolate Sweetwell De Leche" (Cereal), "Cajeta Dore leche" y "Burbujakisses Cyc y Kisses Leche" (Chocolate). Las tres primeras son justo los falsos positivos de este ticket; "Burbujakisses" (Hershey's Kisses) es un acierto que se pierde. Como todas contienen "leche", al caer al respaldo por keyword irían a la madre "Leche". No es una regresión de este ticket: es la calidad del keyword genérico "leche", que queda fuera de alcance. Las filas ya `matched` no se tocan, porque el normalizador solo procesa `pending`.

Pasa lo mismo con los dos aciertos que cita el ticket, que hoy no están asignados a una madre curada: "Froot Loops Mas Leche Pinito 520 g" está en una madre vieja a nivel SKU (2026-09-04) y "Paleta Pops Leche Galleta Choc 60 Gr" está `rejected`. Si se vuelven a normalizar después de este cambio, no tienen "cereal" ni "helado" en el nombre, así que irían a "Leche" en vez de a Cereal o Helado.

**No incluye:**
- Angostar `vtex_category_prefix` en `madres.json` (alternativa descartada, documento-proyecto.md §4.7).
- Agregar madres nuevas o cambiar `match_keywords`/`exclude_keywords` de las 12 existentes.
- Cambiar cómo se puntúan los keywords (ej. preferir el keyword más largo, "crema de leche" sobre "leche") o tratar "Crema de leche" como prefijo ancho.
- Nada de SCRUM-138 (parseo de tamaño) ni SCRUM-132/133.

## 5. Criterios de aceptación (Jira, adaptados)

- [x] Correr el normalizador dos veces sobre el mismo conjunto de filas da siempre el mismo resultado, incluso en casos de empate, en las dos ramas (criterio de idempotencia ya existente, extendido a este caso).
- [x] Un producto bajo un prefijo ancho (`Helado`/`Arroz`) sin ningún `match_keywords` de esa madre en el nombre ya no matchea automáticamente por categoría sola (caso de prueba sintético, ver plan.md §4).
- [x] Un producto bajo un prefijo de 3 segmentos (ej. `Leche condensada`) sigue matcheando por categoría sola, como hoy.
- [x] Sobre las filas reales de staging, las únicas asignaciones que cambian son las del "efecto conocido" de §4 (plan.md §5).
- [x] Migración sigue la regla de SCRUM-134.

## 6. Aviso al equipo

No cambia la firma de `normalize_staging_row` ni de `search_catalog` — no hace falta aviso especial más allá del aviso estándar de migración.
