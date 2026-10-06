# E2E Workflow

Project-specific Playwright lifecycle. Extends `component-architecture` §2 (SDD). For browser automation mechanics, defer to `playwright-cli`.

## SDD integration

Non-trivial features follow Specify → Plan → Tasks → Implement → Validate in the feature folder.

E2E enters **after** canonical requirements exist:

1. **Specify** — write or update `features/<feature>/specs/SPEC.md` with acceptance criteria (**Covered by** column), and Test mapping (Classification, Rationale, Test file, Test name, E2E scenario).
2. **Classify** — for each AC, assign the lowest effective verification level (schema, unit, component, service, session, route, E2E).
3. **E2E design** — derive `features/<feature>/specs/E2E.md` from selected system-level ACs. This can happen before UI exists.
4. **TDD (lower levels)** — implement tests colocated in `features/<feature>/tests/` (see `unit-testing-standards`). Confirm RED, implement, GREEN, refactor.
5. **Playwright generation** — once UI is sufficient, implement `e2e/features/<feature>/<feature>.spec.ts`.
6. **Validate** — run E2E; heal by classification; confirm against SPEC acceptance criteria.

`E2E.md` references requirements; it does **not** redefine them. If E2E and SPEC disagree, stop and resolve SDD — see [healing.md](healing.md).

## Project paths

| Artifact                        | Path                                                     |
| ------------------------------- | -------------------------------------------------------- |
| Canonical spec                  | `features/<feature>/specs/SPEC.md`                     |
| E2E verification plan           | `features/<feature>/specs/E2E.md`                      |
| Playwright spec                 | `e2e/features/<feature>/<feature>.spec.ts`               |
| Feature helpers                 | `e2e/features/<feature>/<feature>.helpers.ts`            |
| Shared fixtures                 | `e2e/fixtures/`                                          |
| Shared support (API setup, env) | `e2e/support/`                                           |
| Playwright config               | `playwright.config.ts`                                   |
| Lower-level tests               | `features/<feature>/tests/` (`unit-testing-standards`) |

**Note:** Document the real test paths in the feature SPEC **Test mapping** table.

## Verification-level policy

Use the lowest effective level. Playwright E2E complements — does not replace — lower-level tests.

| Level                                 | Owns                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema / unit                         | Exhaustive deterministic business rules, pure logic, gate helpers                                                                                           |
| Component / service / session / route | Isolated UI behavior, contracts, state mapping, edge permutations                                                                                           |
| Playwright E2E                        | Critical user journeys, integrated state transitions, browser-visible behavior, routing, meaningful integration boundaries, selected failure/recovery paths |

A scenario belongs in E2E when it is **user-observable**, **plausible**, **risk-relevant**, and browser verification provides evidence lower-level tests cannot provide as effectively.

Do **not**:

- Convert every AC into a separate E2E test.
- Repeat exhaustive validation matrices in E2E when schema/component tests already prove them.

### `(representative case only)`

When SPEC Test Mapping marks an AC as `(representative case only)`:

- Lower-level tests own exhaustive rule verification.
- The linked E2E scenario proves integrated browser-visible behavior only.
- Do **not** expand the E2E scenario into an exhaustive browser matrix unless the canonical SPEC explicitly changes classification.

Example from Register: `AC-4 → Schema + E2E-REG-04 (representative case only)`.

### Plausible system-level coverage

For critical journeys, consider beyond happy path when risk-relevant:

- Plausible failure modes and edge states
- Recovery and retry paths
- Repeated or duplicate user actions that can create duplicate requests or inconsistent state
- Refresh, revisit, redirect, navigation, meaningful state transitions
- Authentication/session transitions
- Controlled integration-boundary failures when they break user-visible behavior

Do not invent arbitrary edge cases merely to increase E2E count.

## E2E.md contract

Each scenario in `E2E.md` must include:

| Field               | Content                                                         |
| ------------------- | --------------------------------------------------------------- |
| Scenario ID         | Stable ID, e.g. `E2E-REG-03`                                    |
| Referenced ACs      | AC IDs from `SPEC.md` — do not restate full requirements        |
| Preconditions       | App state, auth, remote config, test data                       |
| Steps               | User-visible actions (not Playwright API)                       |
| Expected results    | Observable outcomes (text, URL, enabled state, visible regions) |
| Test data           | Unique per test/worker where mutable                            |
| Cleanup             | Rows the test created (via `e2e/support/`), session reset       |
| External boundaries | Mocked or controlled services when relevant                     |

Scenarios marked **NOT IMPLEMENTED YET** or **DEMO ONLY** in `E2E.md` must not be implemented in `*.spec.ts` until the plan is promoted to active coverage and SPEC Test Mapping is updated.

## Planner / Generator / Healer (project model)

| Phase     | Project equivalent                      | Authority                                |
| --------- | --------------------------------------- | ---------------------------------------- |
| Planner   | SPEC → Test Mapping → E2E.md            | SPEC + E2E.md                            |
| Generator | E2E.md → CLI inspection → `*.spec.ts`   | E2E.md                                   |
| Healer    | Evidence → classify → fix correct layer | SPEC + E2E.md + [healing.md](healing.md) |

Browser exploration is **optional supporting information** during planning. It must not become the plan authority.

The vendor `playwright-cli` test-generation flow (explore app → write plan → reconcile spec with observed app) is **inverted here**. Do not adopt vendor heal guidance that updates specs to match observed app behavior without SDD review.

## Generation sequence

```text
E2E.md
    ↓
Select scenario (check status: active vs demo/not implemented)
    ↓
Read referenced AC in SPEC.md only when additional requirement context is needed
    ↓
Use playwright-cli when browser inspection is useful (locators, flows, accessibility tree)
    ↓
Reuse or introduce e2e/features/<feature>/*.helpers.ts only when justified (see standards.md)
    ↓
Implement test in e2e/features/<feature>/<feature>.spec.ts
    ↓
Run progressive verification (see Agent E2E execution strategy below)
```

### Test traceability

- **Test title (required):** `E2E-<FEAT>-NN — <short description>` (e.g. `E2E-REG-03 — Reject existing email`). This is the direct link to `E2E.md`.
- **AC mapping:** canonical traceability is `SPEC Test Mapping → E2E.md scenario → E2E scenario ID in test title`. Do **not** require redundant AC comments in test code — they can drift. An optional local AC comment is fine when it materially improves clarity.
- **Helpers:** reuse or extract when justified (list exemplar: `addFirstSearchResult` in `shopping-list.helpers.ts`).

### Fixtures and preconditions

- Shared cross-feature setup → `e2e/fixtures/` (Register: `firebase-auth.fixture.ts` with `newUserCredentials`, `existingAuthUser`).
- API-level precondition setup and cleanup → `e2e/support/` (list exemplar: `supabase.ts`, `deleteOwnListItems`).
- Each scenario creates its own precondition data when needed — do not depend on another test having run first.

Load `playwright-cli` when:

- Discovering resilient locators on the real UI
- Debugging with `--debug=cli` and `playwright-cli attach`
- Capturing traces, snapshots, or network evidence

## Agent E2E execution strategy

During feature development and healing, optimize for **deterministic evidence**, not maximum execution breadth.

Use progressive verification:

1. Failing or newly implemented scenario on the primary development browser
2. Relevant feature E2E file/suite
3. Broader relevant E2E on the primary browser when needed
4. Full primary-browser regression when required by the gate
5. Additional browser projects only when cross-browser verification is required

Do **not** repeatedly execute the complete multi-project suite (Chromium + Firefox + WebKit) after every implementation or healing change unless the workflow explicitly requires it. Broad multi-browser runs against rate-limited external systems amplify ENVIRONMENT failures and pollute healing.

Inner development loop:

```text
change
  → affected lower-level tests
  → affected E2E scenario / feature (narrow)
  → diagnose or continue
```

Broader regression belongs to final quality gates and CI.

### Concurrency diagnosis

When a scenario passes independently (or on the primary browser) but becomes intermittently unstable under broader or concurrent execution:

- Do **not** immediately rewrite the test.
- Investigate execution/environment pressure first (shared Firebase/auth quotas, worker contention, fixture provisioning).

Controlled experiments:

- Run the failing scenario alone
- Run the feature on one browser project
- Reduce worker count (`--workers=1` is a **diagnostic** tool, not automatically a permanent fix)
- Compare isolated versus broader execution
- Inspect external/backend evidence

Chromium-only execution can isolate whether the problem appears only when browser/project breadth increases. After identifying the root cause, choose the smallest architectural correction that preserves adequate coverage — see [healing.md](healing.md) and [standards.md](standards.md).

### Cross-browser scope

Cross-browser coverage and feature correctness are related but distinct.

- The fact that `playwright.config.ts` defines Chromium, Firefox, and WebKit does **not** mean every development rerun must execute all three.
- Use broader browser matrices according to project quality-gate policy and risk.
- Prefer primary-browser evidence during agent healing; expand when the gate or risk warrants it.

## TDD orchestration

Order for feature work:

1. Update `SPEC.md` (and Test Mapping) first.
2. Update `E2E.md` for new or changed system-level scenarios.
3. Write or update lower-level tests in `features/<feature>/tests/` → RED.
4. Implement product code → GREEN → refactor.
5. Implement or update Playwright tests.
6. Run quality gates.

### Commands

```bash
npm run test:run      # Vitest suite (see unit-testing-standards)
npm run lint          # ESLint
npm run build         # Production build
npx playwright test e2e/features/<feature>/<feature>.spec.ts --project=chromium   # Feature / primary browser (preferred in agent loop)
npx playwright test -g "E2E-<FEAT>-NN" --project=chromium                         # Single scenario
npx playwright test   # Full E2E (all projects) — quality gate / CI, not every healing iteration
```

Before opening a PR: lint, unit tests, and build must succeed. Run **relevant** E2E for touched features (progressive scope above).

## CI/CD

**Current state:** the CI (`.github/workflows/ci.yml`) runs lint, unit tests and build on every PR, but **not** E2E. The app under test talks to the team's only Supabase database, so every CI run would create anonymous users and rows there. E2E runs locally with `webServer: npm run dev` from `playwright.config.ts`, and each person attaches the run as evidence in their PR (HTML report via `npm run e2e:report`, or terminal output with the pass count).

**Before adding E2E to CI:**

- Decide with the team which database it runs against (a Supabase branch for tests is the safest option) and add its URL and anon key as CI secrets.
- Keep fast gates (lint, unit tests, build) separate from browser-level verification.
- Preserve Playwright reports and traces as CI artifacts (the config already switches to `retries: 2`, `workers: 1` and trace on first retry when `CI` is set).
- Install only Chromium (`npx playwright install --with-deps chromium`): both projects use it.
- Point `PLAYWRIGHT_BASE_URL` at the target deployment instead of hard-coding a URL, and never run destructive scenarios against production data.

## Final quality gates

Before considering E2E work complete:

- [ ] SPEC Test Mapping reflects E2E scenario IDs and `(representative case only)` where applicable
- [ ] `E2E.md` scenarios match implemented tests (no drift on active scenarios)
- [ ] Tests are independently executable with isolated test data
- [ ] `npm run lint` clean on touched files
- [ ] `npm run test:run` passes for affected specs
- [ ] `npm run build` succeeds
- [ ] Relevant `npx playwright test` passes (progressive scope — not necessarily full multi-browser on every iteration)
- [ ] No healing shortcuts (sleeps, force, inflated timeouts, weakened assertions, retry loops against external quota) — see [healing.md](healing.md)
