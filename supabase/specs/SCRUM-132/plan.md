# Plan — SCRUM-132

Ver [SPEC.md](SPEC.md). Skills que aplican: `security-practices` (service role key en un script cliente, nunca `NEXT_PUBLIC_`), `clean-code-practices`, `project-structure` (`scripts/`).

## 1. Archivos nuevos/tocados

```
scripts/monthly-ingestion.ts   ← nuevo, orquestador del batch
supabase/README.md             ← documentar cómo correr el script (ubicación, env var, qué escribe)
```

## 2. `scripts/monthly-ingestion.ts` — forma

```ts
// Node vía tsx (ya dependencia del repo). Nunca se importa desde app/ ni
// features/ — vive fuera del bundle de Next.js, mismo motivo que
// generate-madres-migration.ts: necesita la service role key.
import { createClient } from "@supabase/supabase-js";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (sin prefijo NEXT_PUBLIC_). " +
    "No se corre el batch sin ella."
  );
}

const STORES = ["maxipali", "walmart", "masxmenos"] as const;
const PACE_MS = /* a definir — controlar contra los 3 súpers sin que bloqueen */;

async function main() {
  const mothers = /* leer supabase/data/madres.json, mismo archivo que SCRUM-131 */;

  for (const mother of mothers) {
    for (const store of STORES) {
      // 1. Ingestar el término — llama a la Edge Function ingest-{store}
      //    YA DESPLEGADA por SCRUM-130, con Authorization: Bearer SERVICE_ROLE_KEY.
      const { stagedCount } = await ingestTerm(store, mother.name, SERVICE_ROLE_KEY);

      // 2. Normalizar solo las filas recién insertadas de esta corrida
      //    (normalize_pending_staging ya existe, mismo RPC que SCRUM-131 usa).
      await normalizeJustStaged(supabase, stagedCount);

      // 3. Recortar raw_json de las filas que acaban de quedar matched/rejected
      //    (plan.md §3 — nunca de filas que siguen pending).
      await trimRawJson(supabase, /* ids procesados en este paso */);

      await sleep(PACE_MS);
    }
  }
}
```

## 3. Recorte de `raw_json`

Después de `normalize_pending_staging`, actualizar las filas que pasaron a `matched`/`rejected` (nunca las que quedan `pending` — esas sí necesitan el `raw_json` completo para cuando se vuelvan a intentar en una corrida futura, o para que un humano revise por qué no matchearon):

```sql
update product_catalog_staging
set raw_json = jsonb_build_object(
  'itemId', raw_json->'item'->>'itemId',
  'ean', raw_json->'item'->>'ean',
  'price', raw_json->'offer'->>'Price'
)
where id = any($1)  -- ids procesados en este paso del ciclo
  and status in ('matched', 'rejected');
```

Correrlo vía RPC con `search_path` fijo (mismo patrón de hardening que SCRUM-131) o directo desde el script con la service role key — a decidir en la implementación según si el equipo prefiere mantener toda escritura a Postgres detrás de funciones (consistente con el resto del proyecto) o permitir este `update` directo por ser un script interno de mantenimiento, no código del cliente. Si se opta por función, documentar su firma acá antes de escribirla.

## 4. Dedupe por `itemId` dentro de una corrida

`stageProducts` (ya existente, `catalogRepository.ts`) inserta una fila por `item` de VTEX sin deduplicar — es correcto para su uso actual (cache por término). Para el batch, antes de insertar una fila nueva en el ciclo de un término, revisar si el `itemId` ya se procesó en **esta corrida** (set en memoria del script, se reinicia en cada ejecución — no hace falta persistir entre corridas, el cache de 6h de `search_cache` ya cubre eso a otro nivel). Si ya se procesó, no reinsertar.

## 5. Dependencias duras antes de implementar (no solo documentar, bloquean el código)

- SCRUM-130 desplegado — sin esto, `ingestTerm` recibe 403 contra las `ingest-*`.
- El script lee `madres.json` directo — cualquier cambio de SCRUM-139 al normalizador no afecta a este archivo, pero el gap de datos de SPEC §2.3 sí determina qué términos van a matchear de verdad en la primera corrida.

## 6. Verificación final (antes de pasar a `waiting qa`)

- Corrida de prueba contra 1-2 términos (no todas las madres), revisando manualmente el resultado antes de la corrida completa.
- Reporte de `raw_json` antes/después del recorte (tamaño total de `product_catalog_staging`).
- Caso de dedupe confirmado con un término que trae el mismo `itemId` desde dos búsquedas distintas (si se puede reproducir) o con un test sintético.
- `npx tsc --noEmit` sobre el script nuevo (Daniel lo corre).
