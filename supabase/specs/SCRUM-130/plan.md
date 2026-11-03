# Plan — SCRUM-130

Ver [SPEC.md](SPEC.md). Skills que aplican antes de escribir código: `security-practices` (chequeo de caller en Edge Function, variables de entorno), `clean-code-practices` (un solo chequeo compartido, no copy-paste x3), `project-structure` (dónde vive el archivo nuevo).

## 1. Archivos nuevos/tocados/eliminados

```
supabase/functions/_shared/requireServiceRole.ts   ← nuevo, chequeo compartido
supabase/functions/ingest-maxipali/index.ts         ← agrega el chequeo al inicio
supabase/functions/ingest-walmart/index.ts          ← idem
supabase/functions/ingest-masxmenos/index.ts        ← idem
supabase/migrations/0NN_drop_get_recent_staging.sql ← nuevo (número a coordinar, ver §4)
supabase/README.md                                  ← actualizar sección de ingest-* y Postman
app/(debug)/debug/scraping-demo/                     ← eliminar carpeta completa
features/scraping-demo/                              ← eliminar carpeta completa
docs/documento-proyecto.md                           ← ya actualizado (§4.7, 2026-11-01)
```

## 2. `_shared/requireServiceRole.ts` — chequeo compartido

Comparación directa del token contra la service role key (no hace falta decodificar el JWT: la key en sí es el secreto, y es exactamente lo que ya usan las 3 funciones para el cliente de Supabase — mismo criterio de "la service role key solo se lee en código de servidor", `security-practices §`).

```ts
import { jsonResponse } from "./http.ts";

/**
 * Devuelve una Response 401/403 si el caller no trae la service role key
 * en el header Authorization, o null si está autorizado (seguir).
 */
export function requireServiceRole(req: Request): Response | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceKey || token !== serviceKey) {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  return null;
}
```

Uso en cada `index.ts` (ejemplo `ingest-maxipali`), como primera línea dentro de `Deno.serve`, antes de `parseSearchRequest`:

```ts
import { requireServiceRole } from "../_shared/requireServiceRole.ts";

Deno.serve(async (req) => {
  const denied = requireServiceRole(req);
  if (denied) return denied;

  const parsed = await parseSearchRequest(req);
  // ... resto sin cambios
});
```

Mismo bloque, literal, en `ingest-walmart/index.ts` e `ingest-masxmenos/index.ts`.

## 3. Migración: drop de `get_recent_staging`

```sql
-- supabase/migrations/0NN_drop_get_recent_staging.sql
drop function if exists get_recent_staging(text, int);
```

Número `NN`: coordinar con el equipo el siguiente libre antes de crear el archivo (regla de `administracion.md`/SCRUM-134 — **no asumir el número viendo solo los archivos del repo**, ver `.local.md` de este ticket para el procedimiento de verificación contra la base real). Aplicar con el procedimiento de SCRUM-134 (`begin` + contenido + `insert` en `supabase_migrations.schema_migrations` + `commit`), con autorización explícita de Daniel y aviso al grupo antes de correrla.

## 4. Borrar `search-products` v3 del proyecto de Supabase

No es un archivo del repo — es un paso operativo contra el proyecto real (`scrap-bd`), con autorización explícita de Daniel: borrarla desde el dashboard de Supabase o `supabase functions delete search-products`. Documentar en `tasks.md` quién lo hizo y cuándo, igual que el resto de operaciones sobre la base compartida.

## 5. Eliminar la demo

- Borrar `app/(debug)/debug/scraping-demo/` completo.
- Borrar `features/scraping-demo/` completo (componentes, hook, `specs/`).
- Revisar que no quede ningún import roto (`grep -rn "scraping-demo" app/ features/ components/` debe devolver vacío al terminar).

## 6. `supabase/README.md`

Cambiar la frase actual ("anon-or-service-key" para `ingest-*`) por la nueva regla: solo service role key, con el mismo ejemplo de request que ya usa el README pero con el header `Authorization` correcto. Actualizar también las instrucciones de Postman si viven ahí (o en un archivo separado referenciado desde el README).

## 7. Verificación final (antes de pasar a `waiting qa`)

- Request con anon key (o sin key) a las 3 funciones → 401/403, body `{"error":"forbidden"}`.
- Request con service role key → mismo contrato de respuesta que hoy (`source`, `store`, `query`, `stagedCount`), probado contra los 3 súpers.
- `grep -rn "scraping-demo" app/ features/` sin resultados.
- `select version, name from supabase_migrations.schema_migrations order by version;` incluye la fila nueva.
- `search-products` ya no aparece en `supabase functions list` del proyecto.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` (los corre Daniel, no Claude).
