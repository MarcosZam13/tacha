# SPEC — SCRUM-132: script de ingesta mensual del catálogo y recorte de raw_json

Ticket: [SCRUM-132](https://tacha.atlassian.net/browse/SCRUM-132) · Dueño: Daniel Salas · Sprint 4
Origen: resultado de QA sobre SCRUM-126 (split c) y dirección del líder de proyecto: el scraper llena la base en un batch mensual, la app solo lee.

Ver también: [docs/documento-proyecto.md §7](../../../docs/documento-proyecto.md#7-arquitectura-técnica-propuesta) (nota de SCRUM-131 ya anticipa que `generate-madres-migration.ts` queda reutilizable para este ticket) · [SCRUM-130/SPEC.md](../SCRUM-130/SPEC.md) (prerequisito duro) · [SCRUM-138/SPEC.md](../SCRUM-138/SPEC.md) y [SCRUM-139/SPEC.md](../SCRUM-139/SPEC.md) (prerequisitos recomendados) · [SCRUM-131/SPEC.md](../SCRUM-131/SPEC.md) (normalizador y `madres.json`) · [SCRUM-133/SPEC.md](../SCRUM-133/SPEC.md) (depende del resultado de este ticket)

## 1. Intención

Hasta ahora el catálogo se llena a demanda, vía la demo de scraping (que SCRUM-130 elimina) o manualmente. Este ticket entrega un script que, una vez al mes, ingesta cada madre curada contra los 3 súpers usando las Edge Functions `ingest-*` que ya existen — sin parámetros nuevos, sin crawl de categorías, sin cola de long-tail (lo que falte lo cubre "Mis productos", HU-56/SCRUM-87, ya implementado).

## 2. Prerequisitos (orden real, no solo sugerido)

1. **SCRUM-130 aplicado y desplegado** — las `ingest-*` ya exigen service role key; el script corre con esa key desde `.env.local`, nunca con prefijo `NEXT_PUBLIC_`.
2. **SCRUM-138 y SCRUM-139 aplicados** — sin esto, la primera corrida real pierde productos (tamaños no reconocidos) y puede sobre-asignar categorías anchas (ej. "Helado" atrapando pizza) de forma que después hay que deshacer a mano. Ninguno de los dos bloquea el código de este script, pero sí la calidad de su primer resultado real.
3. **Gap de datos a cerrar antes de la primera corrida real (encontrado al escribir este spec, 2026-11-01):** el criterio de aceptación original pide que buscar "arroz, huevo, pan, frijol, azúcar, aceite, café y pollo" devuelva resultados — de esos 8 términos, **solo "Arroz" existe hoy en `supabase/data/madres.json`** (12 madres totales, ver SCRUM-131 §3). "Huevo", "Pan", "Frijol", "Azúcar", "Aceite", "Café" y "Pollo" no tienen madre curada todavía. Sin madre, cualquier fila que el script traiga para esos términos queda `pending` para siempre (el normalizador nunca "fuerza" un match — comportamiento confirmado y deseado de SCRUM-131). **Esto no es parte del código de este ticket:** es una extensión de `madres.json` con el mismo criterio de evidencia real de SCRUM-131 §3 (PR de datos aparte, ya anticipado ahí: "el resto crece en PRs de datos posteriores, con evidencia real"). Debe ir resuelto antes o junto con la primera corrida real, o el criterio de aceptación del ticket no se puede cumplir.

## 3. Alcance (dirección del líder de proyecto, ya decidido)

**Sí incluye:**
- Script (`scripts/monthly-ingestion.ts`, Node vía `tsx` — ya es dependencia del repo, mismo patrón que `generate-madres-migration.ts`) que, para cada madre de `madres.json` y cada una de las 3 tiendas, llama a la Edge Function `ingest-*` existente con el nombre de la madre como término, y después normaliza.
- **Ciclo por término, no por corrida completa** (decisión 2026-10-03, ya en `decisiones.md`): ingestar un término → normalizar solo esas filas → recortar `raw_json` → seguir con el próximo término. Evita acumular `raw_json` de filas que no se van a usar si el proceso se corta a la mitad.
- Recorte de `raw_json` después de normalizar: una vez que una fila de `product_catalog_staging` pasa a `matched` o `rejected`, su `raw_json` completo (producto + item + oferta de VTEX, ver `catalogRepository.ts:57`) ya no hace falta — se recorta a lo mínimo necesario para auditoría (`itemId`, `ean`, precio) en vez de guardar el payload completo de VTEX.
- Dedupe dentro de una misma corrida: el mismo SKU encontrado por dos términos no debe crear dos filas de precio — criterio simple por `itemId` de VTEX dentro de la corrida.
- Pausa controlada entre llamadas (evitar que los súpers bloqueen el scraping).
- Script manual, documentado, **no programado todavía** (automatizarlo es un ticket aparte) — se corre a mano una vez al mes, con la service role key en `.env.local`, falla con mensaje claro si falta.

**No incluye:**
- Scheduling/cron.
- Cola de long-tail, crawl de categorías.
- Cambios de UI.
- Resetear el catálogo (SCRUM-133).
- Agregar madres nuevas a `madres.json` (ver §2 punto 3 — PR de datos aparte, aunque sea prerequisito real de la primera corrida).

## 4. Límite conocido, a documentar

El cap de 50 resultados por término (`MAX_RESULTS = 50`, ya existente en las Edge Functions) puede dejar productos afuera. Con hasta 250 madres x 3 tiendas, el peor caso son ~37,500 filas de staging por corrida, ~450 MB estimados (`raw_json` promedia ~12 KB antes del recorte) contra el tier gratuito de 500 MB — otra razón para que el recorte de `raw_json` sea por término, no al final.

## 5. Criterios de aceptación (Jira, con el gap de §2.3 explícito)

- [ ] **Primera corrida** (con el primer subconjunto de madres aprobado por Daniel y avisado al grupo antes): búsquedas de arroz, huevo, pan, frijol, azúcar, aceite, café y pollo devuelven resultados en el catálogo — **requiere cerrar el gap de §2.3 primero**.
- [ ] `raw_json` de las filas procesadas queda recortado a lo que todavía hace falta; se reporta el uso de storage después de la corrida.
- [ ] `search_catalog` sigue de solo lectura y sin cambios de contrato; las filas de staging que no matchearon nunca llegan al catálogo.
- [ ] Correr el script escribe en la base compartida: requiere autorización explícita de Daniel cada vez.
- [ ] Dedupe por `itemId` dentro de una corrida confirmado con un caso real (mismo SKU en dos términos).

## 6. Metodología

Spec-Driven Development primero; skills `security-practices` (service role key en script cliente, nunca en el bundle), `clean-code-practices`, `project-structure` (`scripts/` es el lugar correcto, mismo patrón que SCRUM-131). Una historia por PR.

## 7. Aviso al equipo (Developer Notes del PR, antes de abrir)

Avisar a Marcos y Roberto: cómo y cuándo se corre el script, que la primera corrida agrega productos al catálogo compartido (avisar el día antes), y el recorte de `raw_json` en staging. Avisar también si el gap de §2.3 se resuelve en el mismo PR o en uno aparte, para que QA sepa contra qué términos probar.
