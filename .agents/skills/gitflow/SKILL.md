# Gitflow — ramas, PRs y labels (obligatorio)

Usar este skill **antes de cualquier operación de git o GitHub** en este repo: crear una rama, commitear, pushear, abrir o actualizar un PR, cambiar un label, mergear, o cerrar un sprint. No es opcional. El flujo lo exige el profesor del curso, y el check `gitflow` del CI (`.github/workflows/gitflow.yml`) rechaza lo que no lo cumpla.

Ver también: [CONTRIBUTING.md](../../../CONTRIBUTING.md) (versión para personas, con el diagrama) · [qa-testing-practices](../qa-testing-practices/SKILL.md)

## 1. Ramas permitidas

| Rama | Nace de | PR hacia | Cuándo |
|---|---|---|---|
| `ticket/SCRUM-{n}-descripcion-kebab` | `develop` | `develop` | Cualquier historia o tarea de Jira |
| `entregable-{n}` | `develop` | `main` | El lunes de cierre del Sprint `{n}` (uno por sprint) |
| `qa-fix/SCRUM-{n}-descripcion-kebab` | `entregable-{n}` | `entregable-{n}` | Un hallazgo de QA sobre ese entregable |
| `hotfix/SCRUM-{n}-descripcion-kebab` | `main` | `main` | Algo ya entregado que no puede esperar al próximo entregable |
| `main` | — | `develop` | Solo el PR de sincronización después de mergear un entregable o un hotfix |

Cualquier otra combinación está prohibida. En particular: nada de ramas sin prefijo (`web-scraping-core`), nada de `feature/...` ni `fix/...`, nada de claves inventadas (`TACHA-{n}`): la clave `SCRUM-{n}` tiene que existir en Jira. Si no existe ticket para el trabajo, crearlo primero en Jira (proyecto `SCRUM`).

Nunca commitear ni pushear directo a `main`, `develop` ni `entregable-{n}`. Todo entra por PR.

## 2. Abrir un PR: el label va en el mismo comando

Todo PR lleva **exactamente un** label de estado desde que se abre. No existe "lo abro y después le pongo el label".

```bash
git checkout develop && git pull
git checkout -b ticket/SCRUM-{n}-descripcion
# ... commits: {tipo}(SCRUM-{n}): descripción en imperativo
git push -u origin ticket/SCRUM-{n}-descripcion
gh pr create --base develop --label "in progress" --title "{tipo}(SCRUM-{n}): ..." --body "..."
```

- `--base` sale de la tabla de la sección 1, nunca del default a ciegas.
- Label inicial: `in progress` si falta algo; `waiting qa` si el código está completo y `tsc`/lint/build pasan.
- El body usa la plantilla `.github/pull_request_template.md` completa, con **Ticket** = link a `https://tacha.atlassian.net/browse/SCRUM-{n}`.

## 3. Cambiar de estado

Un label reemplaza al otro, nunca se acumulan:

```bash
gh pr edit {número} --remove-label "in progress" --add-label "waiting qa"
```

| Label | Columna de Jira |
|---|---|
| `in progress` | In Progress |
| `waiting qa` | Waiting QA |
| `qa accepted` | QA Accepted |
| `qa denied` | QA Denied |
| `on hold` | Flag sobre la tarjeta (no se mueve de columna) |

Cada cambio de label va con la transición equivalente de la tarjeta en Jira en el mismo momento. Label y tarjeta nunca dicen cosas distintas.

## 4. Mergear

- Solo con label `qa accepted`, puesto por alguien que no es el autor. Un agente de IA **nunca** pone `qa accepted` sobre su propio trabajo ni mergea sin que el usuario lo pida explícitamente.
- Después de mergear, la tarjeta de Jira pasa a Done.

## 5. Cierre de sprint (lunes de revisión)

1. `git checkout develop && git pull && git checkout -b entregable-{n} && git push -u origin entregable-{n}`, donde `{n}` es el número del sprint que cierra.
2. QA prueba `entregable-{n}`. Cada hallazgo → ticket en Jira → `qa-fix/SCRUM-{m}-...` desde `entregable-{n}` → PR a `entregable-{n}` con su label.
3. Con todo aprobado: PR `entregable-{n}` → `main`, título `chore(sprint-{n}): entregable {n}`, label `waiting qa` → `qa accepted` → merge.
4. Enseguida: PR `main` → `develop`, título `chore(sprint-{n}): sincronizar main en develop`, para que los `qa-fix` lleguen al sprint siguiente.

## 6. Errores que ya pasaron en este repo (no repetir)

| Qué pasó | Regla |
|---|---|
| PR #1 salió de una rama sin prefijo (`web-scraping-core`) | Toda rama de trabajo lleva `ticket/`, `qa-fix/` o `hotfix/` + `SCRUM-{n}` |
| PR #2 usó una clave que no existe en Jira (`TACHA-100`) y se mergeó sin label | La clave sale de Jira; el label se pone al abrir el PR |
| PR #3 se mergeó con `waiting qa` | Solo se mergea con `qa accepted` |
| PR #5 (SCRUM-118) se abrió sin label, desde un agente | El label va en el mismo `gh pr create`, sección 2 |

## 7. Checklist antes de dar por terminada cualquier operación de git

- [ ] La rama tiene uno de los prefijos permitidos y una clave `SCRUM-{n}` que existe en Jira
- [ ] El PR apunta a la rama base que dice la tabla de la sección 1
- [ ] El PR tiene exactamente un label de estado
- [ ] La tarjeta de Jira está en la columna que corresponde a ese label
- [ ] Nada se mergeó sin `qa accepted`
