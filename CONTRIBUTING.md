# Cómo contribuir — Tacha

## 1. Branching

Modelo exigido por el profesor para el proyecto del curso, en kebab-case y con código de ticket para trazabilidad:

```
main                              → producción (equivalente a "Master" del diagrama del profesor)
develop                           → integración de desarrollo, nace de main
ticket/SCRUM-{n}-descripcion      → tarea puntual, nace de develop, vuelve a develop
entregable-{n}                    → una entrega formal del curso (entregable-1, entregable-2...), nace de develop
qa-fix/SCRUM-{n}-descripcion      → corrige hallazgos de QA sobre un entregable, nace de entregable-{n}, vuelve a entregable-{n}
hotfix/SCRUM-{n}-descripcion      → corrección urgente sobre producción, nace de main, vuelve a main
```

Flujo:
1. `develop` nace de `main`.
2. Cada tarea se trabaja en `ticket/SCRUM-{n}-...`, creada desde `develop`; al terminar, se fusiona de vuelta a `develop`.
3. Al preparar una entrega del curso, `develop` da origen a `entregable-{n}`.
4. Si QA encuentra problemas en `entregable-{n}`, se crea `qa-fix/SCRUM-{n}-...` desde esa rama; al corregir, se fusiona de vuelta a `entregable-{n}`.
5. `entregable-{n}` ya corregido y aprobado se fusiona a `main`.
6. Problema urgente en producción: `hotfix/SCRUM-{n}-...` desde `main`; al corregirlo, se fusiona de vuelta a `main`.

Nunca se trabaja directo sobre `main` o `develop`.

## 2. Commits

```
{type}(SCRUM-{n}): descripción corta en imperativo

[cuerpo opcional: el porqué, no el qué]
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`.

## 3. Pull Requests

- Título con el mismo formato: `feat(SCRUM-14): descripción corta`.
- Se abre siempre, incluso trabajando solo — es el checkpoint de revisión antes de mergear.
- Nunca mergear una rama de trabajo en progreso sobre otra rama de trabajo en progreso.

### Labels de estado (uno por PR, se actualiza a mano)

| Label | Significado |
|---|---|
| `in progress` | Se sigue trabajando, no listo para revisión |
| `waiting qa` | Código completo, esperando que QA lo tome |
| `qa accepted` | QA probó y aprobó — listo para merge |
| `qa denied` | QA encontró problemas — vuelve al autor |
| `on hold` | Bloqueado por algo externo |

Flujo: `in progress` → `waiting qa` → (`qa accepted` → merge) o (`qa denied` → vuelve a `in progress`). `on hold` puede aplicarse desde cualquier estado.

### Plantilla de PR

Se autocompleta al abrir el PR (`.github/pull_request_template.md`). Completar siempre **Ticket** (clave del issue de Jira, ej. `SCRUM-14`), **Assignee** (quien hizo el trabajo) y **Reviewer** (a quién le toca revisar — rotar entre el equipo).

## 4. Tablero (Jira)

Columnas: `To Do → In Progress → Waiting QA → (QA Denied → vuelve a In Progress) → QA Accepted → Done`. `On Hold` es un flag sobre la tarjeta, no una columna. Cada historia enlaza al PR correspondiente vía el campo **Ticket** de la plantilla.

## 5. QA

Bug encontrado durante QA sobre un entregable → `qa-fix/SCRUM-{n}-...` desde ese `entregable-{n}` (ver sección 1), no un parche silencioso sobre la rama original ya mergeada.
