# Cómo contribuir — Tacha

## 1. Branching

Un branch por ticket, corta duración (1-2 días), nunca directo sobre `main`.

```
main                                 → producción / lo que se entrega
feature/TACHA-{n}-descripcion-corta
fix/TACHA-{n}-descripcion-corta
qa/TACHA-{n}-descripcion-corta
```

## 2. Commits

```
{type}({TACHA-n}): descripción corta en imperativo

[cuerpo opcional: el porqué, no el qué]
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`.

## 3. Pull Requests

- Título con el mismo formato: `feat(TACHA-14): descripción corta`.
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

Se autocompleta al abrir el PR (`.github/pull_request_template.md`). Completar siempre **Ticket** (clave de Jira o de `TACHA-{n}`), **Assignee** (quien hizo el trabajo) y **Reviewer** (a quién le toca revisar — rotar entre el equipo).

## 4. Tablero (Jira)

Columnas: `To Do → In Progress → Waiting QA → (QA Denied → vuelve a In Progress) → QA Accepted → Done`. `On Hold` es un flag sobre la tarjeta, no una columna. Cada historia enlaza al PR correspondiente vía el campo **Ticket** de la plantilla.

## 5. QA

Bug encontrado durante QA → ticket nuevo (`fix/TACHA-{n}`), no un parche silencioso sobre la rama original ya mergeada.
