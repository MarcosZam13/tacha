---
name: playwright-e2e
description: Project Playwright E2E workflow — SDD authority (SPEC → E2E.md → *.spec.ts), verification-level policy, generation, execution, and classified healing. Load when creating/updating E2E.md, Playwright specs, fixtures, or diagnosing E2E failures.
---

# Playwright E2E (Project Workflow)

This skill owns **WHAT** Playwright verifies, **WHEN** it enters the feature lifecycle, and **WHAT authority/constraints** apply during generation and healing.

For browser automation **HOW** — CLI, snapshots, tracing, locator discovery, request mocking — load `.agents/skills/playwright-cli/SKILL.md` alongside this skill. Do not duplicate the vendor CLI manual here.

## When this skill applies

Load this skill when:

- Creating or updating `features/<feature>/specs/E2E.md`
- Classifying acceptance criteria for system-level browser verification
- Authoring or repairing `e2e/features/<feature>/*.spec.ts`, helpers, fixtures, or support code
- Diagnosing Playwright failures with classified healing
- Running or interpreting E2E in CI (`npx playwright test`)

Do **not** load this skill for Vitest/unit/component tests — use `unit-testing-standards`.

## Authority hierarchy

Unidirectional. Never invert.

```text
Canonical feature SPEC.md
        ↓
Feature E2E.md
        ↓
Executable Playwright *.spec.ts
        ↓
Observed application behavior (evidence only)
```

| Layer       | Owns                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SPEC.md`   | Intent, requirements, acceptance criteria (**Covered by** verification levels + E2E IDs), Test mapping (Classification, Rationale, Test file, Test name, E2E scenario) |
| `E2E.md`    | E2E scenario IDs, referenced AC IDs, preconditions, user steps, observable results, test data, cleanup, controlled external boundaries                                 |
| `*.spec.ts` | Locators, Playwright APIs, fixtures, browser interaction mechanics                                                                                                     |

The running application is **evidence**, not requirement authority. Browser exploration must not silently redefine expected behavior.

Maintain traceability: `AC-13 → E2E-REG-03 → test("E2E-REG-03 — Reject existing email")`.

## Feature lifecycle

```text
User story / requirement
        ↓
Create or update canonical SPEC.md
        ↓
Classify verification level (unit / component / E2E)
        ↓
Create or update E2E.md for relevant system-level behavior
        ↓
Write lower-level tests → confirm TDD RED
        ↓
Implement minimum required behavior
        ↓
Lower-level tests GREEN → refactor
        ↓
Implement or update Playwright <feature>.spec.ts
        ↓
Use playwright-cli when browser evidence is useful
        ↓
Run relevant E2E tests → PASS or classified healing
        ↓
Final quality gates (lint, unit tests, build, E2E)
```

**E2E design happens before implementation.** `E2E.md` is derivable from `SPEC.md` even when the final UI does not exist.

**Playwright implementation usually happens once sufficient UI exists.** Then use `playwright-cli` to inspect accessible UI and choose resilient locators.

## Composition — defer, do not duplicate

| Concern | Owner |
| --- | --- |
| SDD, feature folders, `SPEC.md` placement | `component-architecture` |
| Vitest, RTL, Page Object Model (unit/component) | `unit-testing-standards` |
| Browser CLI, tracing, locator discovery, mocking mechanics | `playwright-cli` |
| E2E workflow, policy, healing authority | **this skill** |
| UI implementation, ViewModel separation | `component-architecture` |
| Literals / magic numbers (product code) | `constants-standards` — E2E oracle independence per [standards.md](references/standards.md) |
| Naming, small functions | `clean-code-practices` |
| ESLint (`eslint-plugin-playwright` on `e2e/**`) | `eslint.config.mjs` |
| Server state, client state, mutations | `nextjs-enterprise-patterns` |
| RLS, test data on the shared database, secrets | `security-practices` |
| QA process, test cases, PR verdict | `qa-testing-practices` |

When fixing a **product defect** surfaced by E2E, follow the relevant product skills above.

## Reference routing

| Task                                                                                      | Read                                               |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| SDD → E2E planning, paths, generation, progressive execution, CI/CD, quality gates        | [references/workflow.md](references/workflow.md)   |
| Locators, assertions, isolation, fixtures, external boundaries / shared-service stability | [references/standards.md](references/standards.md) |
| Causal classification, repair boundaries, external-failure healing loops, prohibitions    | [references/healing.md](references/healing.md)     |
| CLI commands, `--debug=cli`, traces, snapshots, codegen                                   | `playwright-cli` skill and its `references/`       |

## Hard rules

1. **Never invert authority** — do not derive requirements from observed browser behavior.
2. **Compliance with `SPEC.md` is the goal** — a green test is not success if expectations were weakened to match a regression.
3. **Use the lowest effective verification level** — E2E complements lower-level tests; do not exhaustively duplicate schema/unit matrices in the browser.
4. **Respect `(representative case only)`** in SPEC Test Mapping — do not expand representative E2E scenarios into exhaustive browser permutations unless the canonical SPEC changes.
5. **Load `playwright-cli` for HOW** — inspection, tracing, and CLI-assisted debugging; this skill decides WHAT and whether a fix belongs in tests, product, environment, or SDD.
6. **Classify cascading failures by earliest cause** — an assertion timeout after provider quota/throttle is ENVIRONMENT, not a locator defect; do not heal by weakening the contract or looping retries against an unhealthy dependency.

## Canonical exemplar

The general list (`features/shopping-list`) is the first feature with E2E coverage. Follow these paths:

- Spec: `features/shopping-list/specs/SPEC.md`
- E2E plan: `features/shopping-list/specs/E2E.md` (scenarios `E2E-LISTA-nn`)
- Tests: `e2e/features/shopping-list/shopping-list.spec.ts`, `shopping-list.helpers.ts`
- Support (API, outside the browser): `e2e/support/supabase.ts` (`deleteOwnListItems`, cleanup with the test user's own token)
- Fixtures: `e2e/fixtures/` (none yet; add one when a second feature needs the same setup)

The infrastructure smoke test `e2e/smoke/app-shell.spec.ts` (`SMOKE-` IDs) proves the Playwright setup boots the app; it is not tied to a story.

The _Register_ / _Firebase_ examples inside `references/` come from the repo this skill was ported from (AsistenciasTEC). Treat them as illustrations of the rules; the Tacha equivalents are the list exemplar above and Supabase (anonymous sessions + RLS).

## Setup in this repo

| Item | Value |
| --- | --- |
| Config | `playwright.config.ts` (`testDir: e2e`, `webServer: npm run dev`, base URL from `PLAYWRIGHT_BASE_URL` or `http://localhost:3000`) |
| Projects | `chromium` (desktop) and `mobile-chrome` (Pixel 7). Both run on Chromium: Tacha is used on a phone at the supermarket |
| Scripts | `npm run e2e`, `npm run e2e:ui`, `npm run e2e:report` |
| Browsers | `npx playwright install chromium`, once per machine |
| Env | `e2e/support/supabase.ts` loads `.env.local` (Next.js loads it for the app, not for the tests) |
| Data | **One shared Supabase database.** Every browser context gets a new anonymous user. Each test cleans up the rows it created; the anonymous user and its empty list remain |
| CI | E2E does **not** run in CI yet (lint, unit tests and build do). Running it there needs the team to decide first whether to use a Supabase branch for tests. Until then E2E runs locally and the evidence goes in the PR |
| Browser CLI | `npx playwright cli ...` (ships with `@playwright/test` 1.63; the `playwright-cli` skill is the upstream copy from `node_modules/playwright-core/lib/tools/skills/`) |
