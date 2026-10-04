# QA Testing Practices — casos de prueba, bugs y planes de prueba

Usar este skill al escribir casos de prueba, reportes de bug o un plan de pruebas para un entregable, o al revisar si una historia tiene cobertura suficiente antes de pasarla a `waiting qa`. Lo aplica el subagente `qa-checker` (`.claude/agents/qa-checker.md`).

Ver también: [unit-testing-standards](../unit-testing-standards/SKILL.md) (cómo se escriben los tests automatizados, con Page Object Model) · [CONTRIBUTING.md](../../../CONTRIBUTING.md) (labels de PR y ramas `qa-fix/`)

Este skill cubre la parte documental de QA. Cómo automatizar un test (Vitest, Testing Library, POM, carpeta `tests/` de la feature) ya está en `unit-testing-standards`; no se repite acá.

El estándar: **un caso de prueba o un reporte de bug lo tiene que poder ejecutar alguien que nunca vio la feature**: reproducible, sin ambigüedad, y ligado a un ticket de Jira.

## 1. Caso de prueba

```markdown
### TC-SCRUM-{n}-{número}: {título corto}

**Precondiciones:** estado del sistema/datos antes de empezar
**Pasos:**
1.
2.
3.
**Resultado esperado:** exactamente qué debería pasar
**Resultado obtenido:** (se llena al ejecutar)
**Estado:** Pasa / Falla / Bloqueado
```

- Un caso verifica una sola cosa. Si el resultado esperado necesita un "y", probablemente son dos casos.
- Pasos numerados y literales: no "probar el tachado", sino "1. Abrir la lista general. 2. Tocar la fila de 'Leche'. 3. ...".
- Los criterios de aceptación de la historia (en `docs/historias-usuario.md` y en Jira) son la fuente de los casos funcionales.

## 2. Qué cubrir (no solo el camino feliz)

| Categoría | Qué revisa | Ejemplo en Tacha |
|---|---|---|
| Funcional | Hace lo que dice la historia | Tachar un producto lo mueve a la sección de comprados |
| Límite | Mínimos, máximos, listas vacías | Lista sin productos, cantidad 0, nombre de 1 carácter |
| Negativo | Input inválido, acceso no autorizado | Un usuario intenta abrir la lista privada de otro por URL |
| Regresión | El cambio no rompió algo que ya funcionaba | El catálogo sigue buscando después de tocar la lista |
| Integración | Funciona con lo que lo rodea (RLS, tiempo real, otros módulos) | Dos miembros del household ven el tachado al mismo tiempo |
| Usabilidad | Alguien nuevo completa el flujo sin confundirse | Unirse a un household desde el link de invitación |

Para que una historia cuente como cubierta por QA necesita al menos: funcional + un caso negativo + un caso límite.

## 3. Reporte de bug

El reporte se publica como comentario en el PR, así que se escribe en inglés (ver [gitflow, «Idioma»](../gitflow/SKILL.md#idioma-commits-prs-y-comentarios-en-inglés)).

```markdown
### BUG-{n}: {specific title, not "the button doesn't work"}

**Severity:** Critical / High / Medium / Low
**Environment:** OS, browser and version, device, branch or deliverable
**Steps to reproduce:**
1.
2.
**Expected:**
**Actual:**
**Evidence:** screenshot / video / log
**Related story:** SCRUM-{n}
```

Severidad (el valor del reporte va en inglés):
- **Critical (Crítica):** pérdida de datos, problema de seguridad, crash, bloquea el flujo principal
- **High (Alta):** feature rota sin alternativa
- **Medium (Media):** feature rota pero hay alternativa
- **Low (Baja):** cosmético, no afecta el funcionamiento

Reglas:
- El título describe la falla concreta: "The session total is 0 after editing with a decimal comma", not "the history is broken".
- Sin pasos para reproducir no hay bug. Si no se reproduce siempre, decirlo y describir las condiciones en que pasó.
- Un bug por reporte.
- Un bug encontrado en QA de un entregable se corrige en `qa-fix/SCRUM-{n}-...` desde ese `entregable-{n}`, no con un parche directo (ver CONTRIBUTING.md §1 y §5).

## 4. Plan de pruebas (para un entregable, no para un caso suelto)

```markdown
# Plan de pruebas: {entregable o módulo}

## Alcance
Qué se prueba y qué queda fuera

## Historias cubiertas
SCRUM-{n}, ...

## Enfoque
Manual / automatizado / mixto, y por qué

## Casos de prueba
Lista de TC-IDs

## Zonas de riesgo
Qué es lo más probable que se rompa y por qué importa

## Criterio de salida
Qué significa "terminamos de probar" (ej. todos los casos críticos/altos pasan, cero bugs críticos abiertos)
```

## 5. En la práctica

1. Identificar la historia de Jira primero: todo caso y todo bug se amarra a una.
2. Escribir funcional + negativo + límite antes de decir que la cobertura está completa.
3. Si un flujo es visible para el usuario, preguntarse si además del test unitario necesita una prueba de punta a punta. Si la necesita, cómo se escribe (`E2E.md` de la feature, tests en `e2e/`, IDs `E2E-<FEATURE>-nn` en el nombre del test) y cómo se diagnostica una falla es de [playwright-e2e](../playwright-e2e/SKILL.md); no se repite acá. Para QA alcanza con correr lo que tocó el PR: `npx playwright test e2e/features/<feature> --project=chromium`. Si un E2E encontró el bug, el nombre del test (con su ID) y la traza (`npx playwright show-trace ...`) van como evidencia, y los pasos manuales igual se escriben.
4. Al pasar un PR a `waiting qa`, la sección "How should this be manually tested?" del PR ya tiene que traer los pasos manuales.
5. Para hacerle QA a un PR ajeno (traer la rama, correrlo, veredicto con label + Jira, volver a la rama propia), seguir el paso a paso de [CONTRIBUTING.md §5.1](../../../CONTRIBUTING.md#51-cómo-hacerle-qa-a-un-pr-de-otra-persona). Quien hace QA prueba y reporta; nunca commitea en la rama del autor.
