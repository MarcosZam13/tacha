# Project Structure — `app/` solo rutas, código compartido al lado

Usar este skill cada vez que se crea una carpeta de primer nivel, se decide dónde vive un archivo, se importa entre carpetas, o se escribe una ruta dentro de un archivo de agentes/docs (`AGENTS.md`, `SKILL.md`, `README.md`, `docs/`, specs).

Ver también: [component-architecture](../component-architecture/SKILL.md) · [clean-code-practices](../clean-code-practices/SKILL.md)

El estándar: **`app/` contiene rutas y nada más.** Toda carpeta de código compartido (componentes, constantes, tipos, servicios, hooks, providers, store, utils) vive en la raíz del proyecto, al mismo nivel que `app/`. Con solo leer una ruta tiene que quedar claro si el archivo produce una URL o es código reutilizable.

Por qué importa:

- En el App Router cada carpeta dentro de `app/` es un posible segmento de ruta. Mezclar `app/components/` con carpetas de rutas y grupos como `app/(debug)/` hace imposible distinguir de un vistazo qué produce URLs y qué no.
- Los agentes copian las rutas que ven en los docs. Si un skill dice `app/components/` y otro `components/`, los agentes crean archivos en los dos lugares. Un solo layout, escrito igual en todos lados, evita esa deriva.

## 1. Layout de Tacha

```
tacha/
├── app/            Solo rutas: grupos (debug)/, (demo)/, page.tsx, layout.tsx,
│                   loading/error/not-found, route handlers, globals.css, favicon
├── components/     Una carpeta por feature (ver component-architecture) + ui/ con los primitivos
├── constants/      Constantes por dominio + barrel constants/index.ts (ver constants-standards)
├── types/          Tipos compartidos entre features
├── docs/           Documento de proyecto, historias de usuario, sprints, docs por módulo
├── supabase/       schema.sql, migrations/ (solo .sql), functions/ (Edge Functions, Deno)
├── public/         Assets estáticos
├── .agents/skills/ Skills de este repo (el catálogo está en AGENTS.md)
├── .claude/agents/ Subagentes de revisión (code-reviewer, security-reviewer, qa-checker)
└── tsconfig.json   "paths": { "@/*": ["./*"] }
```

Cuando haga falta, se agregan al mismo nivel: `services/` (llamadas a Supabase/APIs), `hooks/` (hooks usados por 2+ features), `providers/` (providers globales, ej. sesión), `store/`, `utils/`. Crearlas solo cuando exista el primer archivo real, no por adelantado.

### Qué se permite dentro de `app/`

| Permitido | No permitido |
|---|---|
| `page.tsx`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` | `components/`, `constants/`, `types/`, `services/`, `utils/`, `hooks/`, `providers/`, `store/` |
| Grupos de rutas `(grupo)/`, segmentos dinámicos `[id]/`, `route.ts` | UI de una feature con sus propios hooks/models/estado |
| `globals.css`, `favicon.ico`, archivos de metadata | Helpers compartidos "por ahora" |
| Un view model delgado de la página, pegado a la ruta, si no lo usa nadie más (ej. `app/(demo)/ui-kit/hooks/`) | Cualquier cosa que importe más de una ruta |

Un archivo de ruta se mantiene delgado: compone una feature de `components/<feature>/` y le pasa los parámetros de la ruta. La UI de una página vive en su carpeta de feature, no al lado de la ruta.

## 2. Imports

- Entre carpetas, siempre por alias: `@/components/ui`, `@/components/<feature>/<Feature>`, `@/constants`, `@/types/<archivo>.types`.
- `@/app/...` solo para cosas que de verdad viven en `app/` (casi nunca se importan desde afuera). `@/app/components`, `@/app/constants`, `@/app/types` siempre están mal.
- Imports relativos (`./`, `../`) solo dentro de la misma carpeta de feature.
- `supabase/functions/` es código Deno, fuera del programa TypeScript de Next.js (está excluido en `tsconfig.json`). No importar nada de ahí desde `app/` o `components/`, ni al revés.

## 3. Rutas escritas en docs y skills

Toda ruta escrita en `AGENTS.md`, `CLAUDE.md`, los puentes de IDE, `.agents/skills/*/SKILL.md`, `.claude/agents/*.md`, `README.md`, `docs/` y specs tiene que ser:

1. **Relativa al proyecto**, escrita desde la raíz: `components/<feature>/`, `constants/index.ts`, `.agents/skills/project-structure/SKILL.md`.
2. **Nunca absoluta ni de una máquina**: nada de `C:\Users\...`, `/home/...`, `~/...`, ni el nombre de la carpeta donde alguien clonó el repo.
3. **Con `/`**, aunque el equipo trabaje en Windows.
4. **Consistente con la sección 1**: ningún doc describe `app/components/` (ni otra carpeta compartida dentro de `app/`) como el lugar del código.

Si el layout cambia, los docs cambian en el mismo PR. Un skill que sigue apuntando a la ruta vieja es un bug, porque los agentes lo van a seguir.

Excepción: informes históricos (ej. `docs/catalogo-scraping/specs/SpecsReport/`) se quedan como se escribieron, con una nota en el README de su carpeta.

## 4. Mover una carpeta (si alguna vez vuelve a pasar)

Hacerlo en su propio ticket, sin mezclar con features, para que el diff sea solo movimientos y rutas.

1. Inventario de las carpetas a mover. Si ya existe una con el mismo nombre en destino, parar y preguntar.
2. `git mv <origen> <destino>` para conservar el historial (`git log --follow`).
3. Reescribir imports `@/<ruta-vieja>` → `@/<ruta-nueva>` en todos los `.ts`/`.tsx`.
4. Revisar configs que referencian rutas: `tsconfig.json`, `eslint.config.mjs`, runner de tests, globs de Tailwind.
5. Reescribir las rutas en docs y skills (sección 3), incluida la sección "Estructura del repositorio" de `AGENTS.md`.
6. Verificar: buscar la ruta vieja no devuelve nada, y pasan `npx tsc --noEmit`, `npm run lint` y `npm run build`.
7. Avisar al equipo en el PR: quien tenga una rama abierta que tocó esas carpetas va a tener conflictos y tiene que hacer rebase apenas se mergee.

## 5. Checklist de revisión

- [ ] Ninguna carpeta compartida se creó dentro de `app/` ni dentro de un grupo de rutas
- [ ] Los imports nuevos usan `@/<carpeta>/...`, nunca `@/app/<carpeta>/...`
- [ ] Las rutas son delgadas y delegan la UI a `components/<feature>/`
- [ ] Toda ruta agregada a un doc/skill es relativa al proyecto, con `/`, y coincide con el layout de arriba
- [ ] `supabase/migrations/` solo tiene `.sql`; la documentación va a `docs/`
