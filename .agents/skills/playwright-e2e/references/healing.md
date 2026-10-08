# E2E Healing

Strict project healing policy. **Compliance with the canonical SPEC is the goal** — not merely a green test.

This document **overrides** vendor `playwright-cli` heal guidance that updates specs or expectations to match observed application behavior without SDD review. When vendor heal docs and this skill conflict, **this skill wins** for authority and expected-behavior changes.

For trace capture, `--debug=cli`, snapshots, and CLI debugging mechanics, load `playwright-cli` — especially `references/test-generation.md` §3 and `references/tracing.md`.

## Healing sequence

```text
FAIL
 ↓
Collect evidence (trace, snapshot, console, single-test rerun)
 ↓
Read E2E scenario in E2E.md
 ↓
Read referenced Acceptance Criterion in SPEC.md when necessary
 ↓
Classify root cause
 ↓
Modify only the correct layer
 ↓
Rerun affected test(s)
```

Preferred sequence:

```text
Capture evidence → Compare against contract → Classify → Fix the correct layer → Rerun
```

## Evidence collection (before changing anything)

For failures you did not intentionally cause in the last edit:

1. **Read the first line of the error** — it names the failed subsystem (strict mode, visibility, timeout, etc.).
2. **Open the trace** — `npx playwright show-trace test-results/**/trace.zip` or CI artifact. Inspect DOM snapshot at the failing step.
3. **Reproduce narrow** — `npx playwright test <file>:<line> --headed --trace on`.
4. **If isolation suspected** — run alone vs broader workers; see flake bisection below.
5. **Inspect upstream evidence** when the scenario depends on fixtures, APIs, or external services — fixture/setup logs, network/backend responses, browser console, and resulting UI error state.

Use `playwright-cli` when interactive inspection helps:

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test e2e/features/<feature>/<feature>.spec.ts:<line> --debug=cli
playwright-cli attach tw-XXXX
playwright-cli snapshot
playwright-cli console
playwright-cli requests
```

**Capture before you rewrite.** Do not change locators or assertions against a failure you never observed.

## Causal failure analysis

Do **not** classify solely from the final Playwright assertion error. That message often describes only the last observable symptom.

When evidence is available, reason in this order and classify the **earliest supported** failure:

1. Fixture / setup / provisioning failures
2. External service, backend, network, or API failures
3. Browser console / runtime errors
4. Actual application state and user-visible error state
5. Final Playwright assertion failure

Conceptually:

```text
external/backend failure
  → application cannot reach expected state
  → expected UI never renders
  → assertion times out
```

The timeout is a cascading consequence, not automatically a defective locator or assertion.

### Cascading-failure rule

When an expected browser-visible state depends on an upstream operation:

- Determine whether that upstream operation succeeded.
- Inspect fixture/setup errors, network/backend evidence, console evidence, and resulting UI state.
- Classify the earliest supported failure; treat later assertion failures as consequences when appropriate.

Example:

```text
Firebase account creation
  → TOO_MANY_ATTEMPTS_TRY_LATER
  → application shows an authentication error
  → expected successful-registration heading never appears
  → toBeVisible() times out
```

Classification: **ENVIRONMENT / TEST-DATA DEFECT**

Do **not** respond by changing the success expectation, rewriting the locator without locator-specific evidence, raising `expect.timeout`, adding sleeps, increasing retries, or changing product behavior merely to go green.

### Controlled-failure exception

If the E2E scenario **intentionally** verifies how the product handles a controlled provider/backend failure, that failure is part of scenario setup — not an environment defect.

Example: scenario injects a controlled rate-limit response; SPEC requires a specific recovery message; the app shows the wrong behavior → may be **PRODUCT DEFECT**.

Classify by whether the external failure was:

- an intentional, controlled part of the verification scenario; or
- an unintended condition preventing the intended scenario from executing.

## Root-cause classification

Before modifying code, classify into exactly one category.

### TEST DEFECT

The product behavior matches `E2E.md` and `SPEC.md`, but the test mechanics are wrong.

Examples:

- Incorrect locator or assertion implementation
- Faulty test setup or fixture
- Stale test mechanics while expected behavior remains unchanged

**May modify:** `e2e/**/*.spec.ts`, helpers, fixtures, support code.

**Must not:** change expected behavior to match a mis-implemented test without verifying against `E2E.md`.

### PRODUCT DEFECT

The test correctly represents `E2E.md`, and `E2E.md` correctly represents `SPEC.md`, but the product behaves differently.

**Fix the product** under `app/` (routes) or `features/` and the shared root folders (`components/`, `hooks/`, `services/`, `constants/`, `types/`, `utils/`), or in `supabase/migrations/` when the defect is in the database, following `component-architecture` and related skills.

**Do not** rewrite the test expectation to match the regression.

### ENVIRONMENT / TEST-DATA DEFECT

Classify here when evidence shows the expected scenario could not execute correctly because of conditions **outside** the intended functional behavior, including:

- Invalid or stale fixtures; mutable test-data collision; shared-state interference
- Backend/provider rate limiting, quota exhaustion, throttling, or anti-abuse protection
- Temporary service unavailability or degradation
- Test infrastructure saturation or excessive concurrent pressure on a shared external dependency
- Incorrect environment configuration or missing env var
- Stale authentication/session state
- Controlled test service unavailable; server not running

**Fix:** fixtures, support utilities, env configuration, execution strategy (workers/scope), `playwright.config.ts` when environment-related, or corresponding infrastructure.

**Do not** alter expected functional behavior. Do not reinterpret as a product defect without evidence that the product itself violates the SPEC.

### REQUIREMENT / CONTRACT CONFLICT

Examples:

- `SPEC.md` and `E2E.md` disagree
- Multiple canonical requirements conflict
- Expected behavior cannot be determined safely from existing artifacts

**Stop automatic healing.** Surface the inconsistency for SDD/specification resolution. Do not guess.

## Allowed modification boundaries

| Layer                             | When to change                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `*.spec.ts`, helpers, fixtures    | TEST DEFECT, or test mechanics after legitimate E2E.md update                          |
| Product code (`app/`, `features/`, shared root folders, `supabase/migrations/`) | PRODUCT DEFECT                                                                         |
| Fixtures, env, support, CI config | ENVIRONMENT / TEST-DATA DEFECT                                                         |
| `E2E.md`                          | Legitimate SDD change — new/changed system-level verification design from updated SPEC |
| `SPEC.md`                         | User/product requirement change — never because browser currently behaves differently  |
| Skip / fixme                      | Only with explicit user decision documenting known product bug or intentional deferral |

## Hard healing prohibitions

Never:

- Change expected behavior solely to make a failing test green
- Derive new requirements from observed application behavior
- Modify canonical `SPEC.md` because the browser currently behaves differently
- Modify `E2E.md` expected results without a legitimate SDD requirement change
- Automatically skip or `test.fixme` a product regression to produce a green suite (without explicit user decision)
- Use arbitrary sleeps as a repair mechanism
- Use `force: true` as a repair mechanism
- Inflate timeouts globally as a repair mechanism
- Add retries to conceal deterministic failures
- Treat cascading assertion timeouts as locator defects when upstream evidence shows fixture/backend/provider failure
- Start repeated healing reruns against a known unhealthy external dependency

If investigation confirms the test is correct and the app is wrong **and the user explicitly accepts filing a bug**: `test.fixme` with a comment pointing to the decision or issue — never silent skip.

## UI blockers (overlays, banners, modals)

When an overlay, banner, modal, dialog, or other element blocks an interaction:

1. Determine whether the blocker is an **expected user-visible state**.
2. Compare it with the E2E scenario and referenced AC in `SPEC.md` when necessary.
3. Classify before modifying anything.

| Situation                                                                   | Action                                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Scenario requires the user to handle the blocker                            | Interact with it normally in the test                                |
| Blocker is irrelevant and preconditions permit it absent or already handled | Establish that state through controlled setup/fixture                |
| Blocker is unexpected relative to the contract                              | Classify as **PRODUCT DEFECT** or **ENVIRONMENT / TEST-DATA DEFECT** |

Never dismiss, hide, remove, or bypass a real product blocker merely to make the test pass. Never use `force: true` as a shortcut.

## Common failure signatures → first move

| Message                                                   | Likely class                                | First move                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `strict mode violation: resolved to N elements`           | TEST DEFECT                                 | Narrow locator per [standards.md](standards.md); read matches in error                                                 |
| `Timeout ... waiting for locator`                         | TEST, PRODUCT, or ENVIRONMENT               | Trace → was element rendered? Upstream API/fixture failed? Wrong frame? Or feature broken? Apply causal analysis above |
| `element intercepts pointer events`                       | PRODUCT DEFECT, TEST DEFECT, or ENVIRONMENT | Compare blocker against E2E.md / AC — see **UI blockers** above; never dismiss or `force: true` to bypass              |
| `element is not stable`                                   | TEST DEFECT or PRODUCT DEFECT               | Animation/layout; assert settled state first                                                                           |
| Passes alone, fails in suite                              | ENVIRONMENT / TEST-DATA                     | Shared Firebase user, colliding email, server-side leak, provider quota under concurrency                              |
| Provider/API `429`, `TOO_MANY_ATTEMPTS_*`, quota/throttle | ENVIRONMENT / TEST-DATA                     | Stop healing loop against that dependency; surface evidence; do not raise timeouts/retries                             |
| Passes locally, fails in CI                               | ENVIRONMENT                                 | Viewport, workers, env vars, browser version pin                                                                       |
| Test passes, feature visibly broken                       | TEST DEFECT                                 | Asserting action not outcome — strengthen assertion per `E2E.md`                                                       |

## Flake vs product bug

Measure before "fixing":

```bash
npx playwright test -g "<test name>" --repeat-each=20 --workers=1
npx playwright test -g "<test name>" --repeat-each=20 --workers=4
```

| Pattern                                                           | Likely cause                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Fails only with multiple workers                                  | Test data / server isolation / external capacity              |
| Fails on slow runner only                                         | Missing assertion on preceding state (not sleep)              |
| Same failure every run                                            | Deterministic TEST or PRODUCT defect                          |
| Intermittent with clean isolation                                 | Possible product race — file bug; test may be doing its job   |
| Fails under broad multi-browser / high concurrency; passes narrow | External/shared-resource pressure — diagnose before rewriting |

Retries configured in `playwright.config.ts` / CI may absorb transient failures but do not replace fixing root cause. Do not change retry policy to hide deterministic failures.

## External-failure healing loop

Playwright retries are diagnostic/execution behavior, **not** a repair strategy.

If a failure is classified as quota, throttling, anti-abuse protection, service unavailability, or another **persistent** external condition:

- Do **not** start repeated healing reruns against the same unhealthy dependency.
- Do **not** increase configured retries or timeouts.
- Stop the automatic repair loop when additional execution would only reproduce the same external failure.
- Surface the environmental condition and the supporting evidence.

Resume verification only when the environment can meaningfully execute the scenario again.

## Escalation template (ENVIRONMENT / external blockage)

When healing is blocked by a persistent external condition:

```markdown
## E2E healing blocked — environment / external dependency

**Scenario:** E2E-<FEAT>-NN
**Test:** <file>:<line>

**Earliest causal failure:**
<fixture / API / provider error — quote evidence>

**Cascading symptom:**
<final Playwright assertion>

**Classification:** ENVIRONMENT / TEST-DATA DEFECT

**Action required:** Stabilize environment, data, fixtures, or execution strategy before further healing. Do not weaken the product contract.
```

## Escalation template (REQUIREMENT / CONTRACT CONFLICT)

Stop healing and report:

```markdown
## E2E healing blocked — contract conflict

**Scenario:** E2E-<FEAT>-NN
**Test:** <file>:<line>

**E2E.md expected:**
<quote expected results>

**SPEC AC referenced:** AC-N
<quote AC if relevant>

**Observed behavior:**
<concrete outcome from trace/snapshot>

**Conflict:**
<which layers disagree — e.g. E2E.md vs SPEC, or expected vs observed with unclear authority>

**Action required:** SDD resolution before further automated healing.
```

## After fix

1. Rerun the single failing test on the primary development browser.
2. Rerun the feature spec file (narrow scope first — see [workflow.md](workflow.md)).
3. If product code changed, run affected Vitest specs and `npm run lint`.
4. Confirm the fix did not weaken assertions below `E2E.md` / `SPEC.md` requirements.
5. Do **not** expand to the full multi-browser suite as part of every healing iteration unless the gate requires it.

## Vendor heal doc override (explicit)

Official `playwright-cli` test-generation heal flow may suggest updating the spec to match observed app behavior. **In this repository:**

- Locator/assertion fixes that preserve the same user-visible contract → TEST DEFECT fix only; leave `E2E.md` unchanged.
- User-visible step or outcome changes → require SPEC/E2E.md update through SDD first, then update test.
- Unclear whether app change is intentional → **stop and ask the user**; do not auto-reconcile by weakening expectations.
