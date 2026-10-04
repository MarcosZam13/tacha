# E2E Standards

Project-relevant Playwright engineering policy. For CLI commands, trace mechanics, and API details, load `playwright-cli` and the installed `@playwright/test` package — do not maintain an API inventory here.

## Assert observable outcomes

Verify what the user sees and experiences — not implementation details.

| Prefer                                                             | Avoid                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| Visible heading, alert, error message, URL, enabled/disabled state | Asserting a click occurred without checking consequence  |
| State after integrated flow completes                              | Internal React state, component names, CSS class strings |
| User-visible recovery after failure                                | Raw network response without UI consequence              |

Weak: `await saveButton.click()` then pass. Strong: after submit, expect the awaiting-confirmation heading or mapped error message from `E2E.md`.

Use web-first assertions (`expect(locator).toBeVisible()`, `toHaveURL`, `toHaveValue`, `toBeDisabled`, etc.). They retry until the expect timeout.

## E2E oracle independence

E2E must remain sufficiently independent from production implementation to detect regressions.

- Do **not** import application UI constants (e.g. from `@/constants`) solely to make locators or expected user-visible values automatically follow production code.
- When visible copy is part of the scenario contract, derive the expectation from `E2E.md` / referenced AC in `SPEC.md` — not from the production constant that renders it.
- When copy is not relevant to the scenario and stable identity is required, use an appropriate resilient locator or explicit test contract such as `getByTestId()` when justified.
- Test code may reuse non-oracle infrastructure or constants when doing so cannot mask the behavior being verified (e.g. route paths, fixture prefixes, API endpoints).

This preserves E2E as a verification oracle. Product code still follows `constants-standards`; E2E expectations follow the SDD contract.

## Locator policy

Choose the locator that best represents the **interaction contract** for the specific scenario. Follow current official Playwright locator guidance.

### Context-based selection

Default to user-facing semantics and explicit contracts rather than implementation details.

- Use `getByRole(role, { name })` when role and accessible identity appropriately identify the target.
- Use `getByLabel()` when a form control is naturally identified by its label.
- Use text-oriented locators (`getByText`, `getByPlaceholder`, etc.) when visible text is the relevant identity.
- Use `getByTestId()` deliberately when stable identity is required and user-facing attributes are dynamic, non-unique, irrelevant to the scenario, or otherwise unsuitable.
- Do **not** use test IDs merely to bypass broken accessibility or a better semantic locator.
- Test IDs identify elements; they do **not** replace assertions about user-visible behavior.
- Avoid CSS/XPath or DOM-structure-dependent selectors when a resilient user-facing or explicit-contract locator is suitable.

General list exemplar (preferred):

```typescript
page.getByRole("textbox", { name: "Buscar producto" });
row.getByRole("button", { name: "Añadir uno" }); // sr-only text of the "+" button
page.getByText("Tu lista está vacía. Busca un producto para empezar.");
```

Avoid when semantic locators exist:

```typescript
page.locator("#register-password-error"); // implementation-coupled; prefer visible error text or role="alert"
page.locator(".css-1a2b3c");
page.locator("div > form > button:nth-child(3)");
```

### Disambiguation

- Use locator chaining or `filter()` when user-visible context is required to disambiguate repeated elements or scope within a container.
- Do **not** add `filter()` merely to compensate for a poorly chosen base locator when a better semantic locator exists.
- Avoid `first()`, `last()`, and `nth()` unless element ordering **is** the behavior under test.

Strict mode violations mean the locator describes a category, not one element — narrow with `filter({ hasText })` or parent scope, not index shortcuts.

### Coupling rules

- Do not couple tests to React component names, file paths, or internal module structure.
- Do not import production UI constants to synchronize locators or expected copy with the app — see **E2E oracle independence** above.

For locator discovery on the live UI, use `playwright-cli snapshot`, `generate-locator`, and `--debug=cli` — see `playwright-cli`.

## Synchronization

Playwright auto-waits. Failures that look like timing issues are usually wrong locators, wrong state, or real UI blockers.

**Required:**

- Web-first assertions for state the test depends on
- Actionability checks (visible, enabled, stable) — let Playwright enforce them

**Forbidden as synchronization or repair:**

- `page.waitForTimeout()` / arbitrary sleeps
- `waitForLoadState('networkidle')` — SPAs with polling/analytics may never settle
- `force: true` to bypass interaction defects — indicates overlay, disabled control, or animation blocker
- Changing global timeout, retry, worker, or parallelism settings merely to heal a failing test
- Retries used to conceal deterministic product or test bugs

**Execution config:** treat `playwright.config.ts` and current CI configuration as the source of truth for timeout, retry, worker, and parallelism settings. If execution policy itself must change, that is an explicit configuration/CI task — not an incidental healing action.

Per-assertion or per-test timeout adjustments are allowed only when a specific step is measured as legitimately slow and the change is narrowly scoped — not as a global repair shortcut.

## Test independence and data

Design every scenario to be **parallel-safe** and independently executable:

- Tests must not depend on execution order or side effects from another test.
- Tests should be safe for parallel execution unless a canonical scenario explicitly requires serialization.
- Unique mutable data per test/worker where concurrency is possible (Register: `createUniqueFirebaseCredentials` with UUID emails).
- Preconditions created in fixtures or support code — not by depending on another test's side effects.
- Cleanup in fixture `finally` blocks (Register: delete Firebase users after scenario).
- Do not use one shared static email across parallel tests.
- Do not depend on destructive production data.

Worker count, `fullyParallel`, sharding, and other execution-level parallelism settings belong to `playwright.config.ts` and/or CI policy — not this skill.

### Isolation model

| Layer                             | Resets between tests   | Can leak                      |
| --------------------------------- | ---------------------- | ----------------------------- |
| Browser context                   | Yes (cookies, storage) | —                             |
| Server / database / Firebase Auth | No                     | **Yes — primary leak source** |

**Browser isolation does not imply backend isolation.** Playwright gives each test a fresh browser context; external systems (auth providers, databases, remote config, APIs, queues) still share state, quotas, rate limits, concurrency caps, and abuse protection.

Therefore:

- Treat external mutable state and external service capacity as explicit E2E dependencies.
- Do not assume a test is safe to parallelize merely because its browser state is isolated.
- Account for provider quotas, throttling, and anti-abuse limits when choosing worker count and how broadly to rerun during development.
- Prefer controlled development/test environments for repeated agent-driven execution.
- Prefer the smallest execution scope that provides the required evidence during development; broaden through the normal quality-gate workflow (see [workflow.md](workflow.md)).

If a test passes alone but fails in the suite, suspect shared server-side data, worker collision, or external capacity pressure — not random timing.

## Helpers, fixtures, and support

| Location                              | Role                                                     |
| ------------------------------------- | -------------------------------------------------------- |
| `e2e/features/<feature>/*.helpers.ts` | Feature-scoped user actions (`addFirstSearchResult`)     |
| `e2e/fixtures/`                       | Playwright `test.extend` fixtures shared across features |
| `e2e/support/`                        | Non-browser setup (Supabase API cleanup, env loading)    |

This is **not** the Vitest Page Object Model from `unit-testing-standards`. Do not require `*.page.ts` for Playwright unless a feature genuinely benefits.

Helpers encapsulate **how** to interact; specs own **assertions** and scenario structure.

- Reuse existing feature E2E helpers when appropriate.
- Introduce new helpers only when repeated interaction, meaningful abstraction, readability, or an established repository pattern justifies them.
- Do **not** create a helper solely because a Playwright test exists.
- Apply DRY and YAGNI together; do not prematurely abstract one-off test actions.

Extract to shared fixtures only when a second feature needs the same setup.

## External boundaries

- **Own backend / Firebase (under test):** use real integration with controlled test/staging data when the integration is what E2E verifies (Register: Firebase Auth create, duplicate email).
- **Precondition via API:** seed through support utilities before browser steps when faster and more reliable (Register: `createFirebaseTestUser` before duplicate-email scenario).
- **Third-party UI the app does not control:** do not automate when the same behavior can be verified through a controlled or mocked boundary.
- **Analytics, chat widgets, ads:** abort or mock when they add flake without signal — use `page.route` per `playwright-cli` request-mocking reference.
- **Credentials:** `storageState` and auth artifacts stay gitignored; never commit tokens or production URLs unless explicitly requested.

Do not automate real payments, production deletions, or destructive production flows without explicit user approval in the session.

### External failure vs Playwright flake

A browser-visible assertion failure may be a **downstream symptom** of an upstream external/backend failure — not a defective locator or flaky assertion.

Examples of environmental/external failures:

- provider quota exceeded, rate limiting, throttling, or anti-abuse protection (e.g. Firebase `TOO_MANY_ATTEMPTS_TRY_LATER`, HTTP `429`)
- temporary service unavailability or degradation
- test infrastructure saturation or connection exhaustion
- shared backend contention under concurrent workers
- fixture provisioning failure caused by an external dependency

When such evidence exists:

- Do **not** increase assertion timeouts because the expected UI state can never occur after the upstream operation failed.
- Do **not** increase retries in response to known quota, throttling, or unavailable-service failures.
- Do **not** reinterpret the failure as Playwright flakiness without causal evidence.
- Preserve the product contract and classify before modifying tests or product code — see [healing.md](healing.md).

## Code style on touched files

Follow project skills on all modified E2E TypeScript:

- Naming, small functions — `clean-code-practices`
- ESLint clean (`npm run lint`, with `eslint-plugin-playwright` on `e2e/**`)

## Pre-delivery checklist

Before handing off new or repaired E2E code:

- [ ] Assertions check user-visible outcomes from `E2E.md`
- [ ] Locators resolve to one element without index shortcuts (unless order is the behavior)
- [ ] No `waitForTimeout`, `networkidle`, or `force: true` for synchronization
- [ ] Unique test data per scenario; cleanup where applicable
- [ ] External/shared-service pressure considered for parallel and multi-browser runs
- [ ] Test title includes scenario ID (`E2E-<FEAT>-NN — …`)
- [ ] Trace/retry settings follow `playwright.config.ts` (do not weaken globally to heal)
- [ ] Runs headless on clean checkout with browsers installed

For exact CLI capabilities: `playwright-cli` skill → `references/playwright-tests.md`, `references/tracing.md`, `references/test-generation.md`.
