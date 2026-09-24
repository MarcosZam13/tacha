# Tacha

App web colaborativa de listas de compras para grupos (familias o amigos): listas compartidas con tachado en tiempo real, dashboard financiero, catálogo de productos/precios poblado por web scraping de supermercados costarricenses, y un planificador semanal de comidas conectado a las listas.

Proyecto de equipo (6 integrantes) para el curso de Introducción al Desarrollo Web.

## Correrlo localmente

Requisitos: Node 20+ y acceso al proyecto de Supabase del equipo.

```bash
npm install
cp .env.example .env.local   # llenar con la URL y la anon key del proyecto de Supabase
npm run dev                  # http://localhost:3000
```

Antes de abrir un PR, lo mismo que corre el CI (`.github/workflows/ci.yml`), más el type check:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Rutas útiles mientras no existan las pantallas reales: `/ui-kit` (componentes base) y `/debug` (demos del catálogo y el scraping).

La base de datos y las Edge Functions de scraping se despliegan aparte, ver [supabase/README.md](supabase/README.md).

## Estructura del repositorio

```
app/              Solo rutas (page.tsx, layout.tsx, grupos (debug)/ y (demo)/)
components/       Una carpeta por feature + ui/ con los componentes base
constants/        Constantes por dominio, exportadas desde constants/index.ts
types/            Tipos compartidos entre features
supabase/         schema.sql, migrations/ y functions/ (Edge Functions de scraping)
docs/             Documento de proyecto, historias de usuario, sprints, diseño, docs por módulo
.agents/skills/   Reglas de código del repo (catálogo en AGENTS.md)
.claude/agents/   Subagentes de revisión: code-reviewer, security-reviewer, qa-checker
```

Regla principal: **`app/` contiene solo rutas.** Todo lo compartido va al lado, nunca adentro. Detalle en [project-structure](.agents/skills/project-structure/SKILL.md).

## Documentación

- [Documento de Proyecto](docs/documento-proyecto.md) (v2.2): alcance, requerimientos funcionales y no funcionales, modelo de datos, arquitectura, dirección de diseño.
- [Historias de usuario](docs/historias-usuario.md) (v2.2): épicas, historias y criterios de aceptación. Las mismas historias están en Jira.
- [Sprints](docs/sprints.md): calendario (sprints semanales desde el lunes 21 sep), carga por persona y qué historia va en cada sprint.
- [DESIGN.md](docs/DESIGN.md): guía de diseño de las 22 pantallas. Mockups: [v3](docs/mockup-web-v3.html) (guía actual) y [v2](docs/mockup-web-v2.html).
- [Catálogo + scraping](docs/catalogo-scraping/README.md): diseño, specs e informes del módulo de catálogo.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Realtime + RLS) vía PostgREST/RPC, Edge Functions para el scraping
- **Estado remoto:** TanStack Query (decidido, todavía no instalado)
- **PWA:** instalable, sin depender de tiendas de apps

Justificación de cada decisión en la [sección 7 del documento de proyecto](docs/documento-proyecto.md#7-arquitectura-técnica-propuesta).

## Cómo contribuir

Leé [CONTRIBUTING.md](CONTRIBUTING.md) antes de tu primer PR: ramas `ticket/SCRUM-{n}-...`, formato de commits, labels de estado, plantilla de PR y Definition of Done. Cada rama sale de una historia o tarea de Jira.

## Convenciones de código (para vos y para tu agente de IA)

Las reglas del repo viven en [AGENTS.md](AGENTS.md): estructura de carpetas, arquitectura de componentes, constantes, testing, patrones de Next.js, seguridad y código limpio. Si usás Claude Code, Cursor o Copilot, cada uno ya tiene su puente (`CLAUDE.md`, `.cursor/rules/skills.mdc`, `.github/copilot-instructions.md`) apuntando ahí, así que las convenciones se aplican solas. Con Claude Code, además, podés pedir una revisión antes del PR con los subagentes de `.claude/agents/` (por ejemplo: "usá el code-reviewer sobre mi rama").
