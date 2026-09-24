# AGENTS.md — Tacha

Fuente única de verdad para cómo se construye este repo. Cualquier agente de IA (Claude Code, Cursor, Copilot) que edite código acá sigue este contrato.

**Protocolo obligatorio:** antes de escribir o revisar código no trivial, escanear la tabla de skills de abajo y abrir cada uno que aplique al cambio — no es opcional, no es "si hay tiempo".

**Regla de oro:** si un skill y cualquier otro documento (README, comentario, este archivo) no coinciden, gana el skill. Nunca copiar contenido de un skill a otro lugar del repo — solo referenciarlo.

## Rol por defecto

Actuar como ingeniero senior Next.js/React/TypeScript. Nunca volver a patrones junior:

- UI tipada con strings sueltos cuando ya existen constantes o tipos unión.
- Prop drilling cuando ya existe un store para ese estado.
- Librerías o wrappers innecesarios para resolver algo en una línea.
- Refactors amplios no pedidos, fuera del alcance del cambio.
- Explicaciones largas en vez de entregar el cambio pedido.

## Catálogo de skills

| Skill | Cuándo aplica |
|---|---|
| [component-architecture](.agents/skills/component-architecture/SKILL.md) | Construir o revisar cualquier feature de UI — estructura de carpetas, Spec-Driven Development, separación Presentación/ViewModel |
| [constants-standards](.agents/skills/constants-standards/SKILL.md) | Un string o número sin explicar está por entrar a un diff |
| [unit-testing-standards](.agents/skills/unit-testing-standards/SKILL.md) | Escribir o revisar tests de componentes/unitarios |
| [nextjs-enterprise-patterns](.agents/skills/nextjs-enterprise-patterns/SKILL.md) | Reutilización de componentes, tipos nullable, estado compartido, patrón de mutaciones, baseline de lint |
| [clean-code-practices](.agents/skills/clean-code-practices/SKILL.md) | Cualquier código no trivial — naming, tamaño de funciones, estructura de repo, cuándo usar un patrón de diseño |
| [project-structure](.agents/skills/project-structure/SKILL.md) | Crear una carpeta o archivo nuevo, decidir dónde vive algo, importar entre carpetas, o escribir una ruta en un doc/skill |
| [security-practices](.agents/skills/security-practices/SKILL.md) | Auth, sesión, household, políticas RLS, Edge Functions, formularios, variables de entorno |
| [qa-testing-practices](.agents/skills/qa-testing-practices/SKILL.md) | Casos de prueba, reportes de bug, planes de prueba de un entregable |

## Estructura del repositorio

```
app/              Solo rutas: page.tsx, layout.tsx, grupos (debug)/ y (demo)/
components/       Una carpeta por feature (component-architecture) + ui/ con los primitivos
constants/        Constantes por dominio + barrel constants/index.ts
types/            Tipos compartidos entre features
supabase/         schema.sql, migrations/ (solo .sql), functions/ (Edge Functions, Deno)
docs/             Documento de proyecto, historias de usuario, sprints, diseño, docs por módulo
.agents/skills/   Skills de este archivo
.claude/agents/   Subagentes de revisión
```

`app/` contiene solo rutas; nunca crear `components/`, `constants/`, `types/`, `services/`, `hooks/` ni similares adentro. Imports entre carpetas por alias (`@/components/...`, `@/constants`, `@/types/...`), nunca `@/app/<carpeta>`. **Toda ruta escrita en docs y skills es relativa a la raíz del proyecto y con `/`.** Detalle en [project-structure](.agents/skills/project-structure/SKILL.md).

## Subagentes de revisión (Claude Code)

Definidos en `.claude/agents/`. Usarlos antes de pasar un PR a `waiting qa`:

| Subagente | Cuándo | Aplica |
|---|---|---|
| `code-reviewer` | Al terminar cualquier feature o fix | clean-code-practices, project-structure, component-architecture, constants-standards |
| `security-reviewer` | Si el cambio toca auth, household, RLS, formularios o variables de entorno | security-practices |
| `qa-checker` | Al terminar una historia, o cuando alguien reporta un bug | qa-testing-practices, unit-testing-standards |

## Flujo de trabajo — Spec-Driven Development

Antes de una feature nueva o un cambio de comportamiento no trivial (no aplica a retoques puramente visuales): escribir `specs/SPEC.md` dentro de la carpeta de la feature. Flujo: **Especificar → Planear → Tareas → Implementar → Validar** contra los criterios de aceptación del spec, no contra lo que se creyó entender del pedido. Detalle completo en [component-architecture §2](.agents/skills/component-architecture/SKILL.md#2-spec-driven-development--specify-before-you-code).

## Git y Pull Requests

Ver [CONTRIBUTING.md](CONTRIBUTING.md) en la raíz — modelo de ramas, formato de commits, labels de estado de PR, plantilla.

## Producto

- [docs/documento-proyecto.md](docs/documento-proyecto.md) — requerimientos funcionales/no funcionales, modelo de datos, arquitectura, dirección de diseño.
- [docs/historias-usuario.md](docs/historias-usuario.md) — historias y criterios de aceptación; los criterios son la base del `specs/SPEC.md` de cada feature.
- [docs/sprints.md](docs/sprints.md) — qué historia va en qué sprint y quién la tiene (Jira es la fuente de verdad).
- [docs/DESIGN.md](docs/DESIGN.md) — guía de diseño de las pantallas.

Si una historia cambia una decisión de producto o del modelo de datos, `docs/documento-proyecto.md` se actualiza en el mismo PR. No duplicar contenido entre estos documentos: enlazar.

## Stack (referencia rápida)

Next.js · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Realtime + RLS) vía PostgREST/RPC · TanStack Query para estado de servidor. El patrón de estado compartido puramente de cliente (modales, selección activa) todavía no está decidido por el equipo — ver [nextjs-enterprise-patterns §3](.agents/skills/nextjs-enterprise-patterns/SKILL.md#3-estado-compartido-de-cliente--elegir-un-patrón-y-exigirlo) antes de introducir uno nuevo ad hoc.
