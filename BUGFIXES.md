# PulseAgent Bug Fixes

Phased bug-fix tracker. Tell an agent which phase to implement; check boxes when done.

---

## Phase 0 — Critical (broken ingestion)

### P0-1: Undated Google + WEB docs excluded by recency filter

- **Severity:** Critical
- **Symptom:** Google Search and custom webpage scrapes ingest successfully but never appear in reports.
- **Root cause:** [`lib/recency.ts`](lib/recency.ts) `isWithinMaxAge` returns `false` when `publishedAt` is null. [`lib/sources.ts`](lib/sources.ts) sets `publishedAt: null` for Google (~559) and WEB scrapes (~639).
- **Fix:** Return `true` when publish date is unknown (cannot filter what is not known).
- **Verify:**
  - [ ] Agent with scrape URL → pipeline cites scraped page in report.
  - [ ] With `GOOGLE_SEARCH_*` keys → Google results in `sourcesUsed`.
- **Status:** [x] Fixed

### P0-2: Abort message mislabels dropped undated docs as "too old"

- **Severity:** Critical (misleading errors)
- **Symptom:** Failure messages claim articles were "older than 7 days" when they had no date.
- **Root cause:** [`lib/pipeline.ts`](lib/pipeline.ts) used `allDocs.length - recentDocs.length` as stale count.
- **Fix:** Add `countStaleDocuments()` in recency.ts; reword abort message to "eligible after recency filter".
- **Verify:**
  - [ ] Force failure with impossible keywords → error does not blame undated articles as stale.
- **Status:** [x] Fixed

---

## Phase 1 — High (correctness + dev traps)

### P1-1: Source fetch timeout 30s vs documented 180s

- **Severity:** High
- **Symptom:** Slow sources abort at 30s while settings claim 180s.
- **Root cause:** [`lib/sources.ts`](lib/sources.ts) `FETCH_TIMEOUT_MS = 30000` vs [`lib/constants.ts`](lib/constants.ts) `EXECUTION_TIMEOUT_MS = 180000`.
- **Fix:** Use `EXECUTION_TIMEOUT_MS` from constants in sources.ts.
- **Verify:**
  - [ ] Source fetches use 180s timeout (grep confirms no local 30000).
- **Status:** [x] Fixed

### P1-2: seed.ts creates ignored NEWS_API DataSource row

- **Severity:** High (dev trap)
- **Symptom:** Seeded `NEWS_API` row has no effect; pipeline uses env-driven built-ins.
- **Root cause:** [`scripts/seed.ts`](scripts/seed.ts) vs [`lib/pipeline.ts`](lib/pipeline.ts) ~108–112.
- **Fix:** Seed keywords only + optional `CUSTOM_SCRAPE` URL; document env-driven providers.
- **Verify:**
  - [ ] `npx tsx scripts/seed.ts` → pipeline works from keywords without dead DB rows.
- **Status:** [x] Fixed

### P1-3: PAUSED status has no UI

- **Severity:** High
- **Symptom:** Cannot pause agents from UI; PRD/schema support `PAUSED`.
- **Root cause:** No server action or button sets `PAUSED`.
- **Fix:** `setAgentPaused` server action + Pause/Resume button; block trigger when paused.
- **Verify:**
  - [ ] Pause agent → trigger disabled/blocked; scheduler skips non-ACTIVE agents.
  - [ ] Resume → agent runs again.
- **Status:** [x] Fixed

---

## Phase 2 — Medium (misleading UI + wasted work)

### P2-1: Fake pipeline stage timer

- **Severity:** Medium
- **Symptom:** Stepper advances on elapsed time, not real pipeline progress.
- **Root cause:** `stageFromRunning` in [`components/agent-run-context.tsx`](components/agent-run-context.tsx).
- **Fix:** Add `IN_PROGRESS` pipeline state; remove timer simulation; align server `derivePipelineState`.
- **Verify:**
  - [ ] During run, stepper does not auto-advance every 12–45s.
- **Status:** [x] Fixed

### P2-2: Duplicate status polling on trigger

- **Severity:** Medium
- **Symptom:** Doubled `/status` requests during manual trigger.
- **Root cause:** `TriggerButton.waitForIdle` polls alongside `AgentRunProvider`.
- **Fix:** Remove `waitForIdle`; rely on context polling.
- **Verify:**
  - [ ] Single poll interval during trigger (no parallel wait loop).
- **Status:** [x] Fixed

### P2-3: getAgents loads all reports on every poll

- **Severity:** Medium
- **Symptom:** Dashboard/live API slow with large report history.
- **Root cause:** [`lib/agents.ts`](lib/agents.ts) `include: { reports: true }`.
- **Fix:** `getAgentsSummary()` with `take: 1` + `_count`; `getAgentById` bounded to 50.
- **Verify:**
  - [ ] `/api/agents/live` returns correct `reportCount` with only latest report payload.
- **Status:** [x] Fixed

---

## Phase 3 — Security

### P3-1: Unauthenticated pipeline API route

- **Severity:** Security
- **Symptom:** Anyone can POST `/api/pipeline/[agentId]/run`.
- **Root cause:** No auth on API route; browser used public fetch.
- **Fix:** `triggerPipeline` server action for UI; API route requires `Authorization: Bearer API_SECRET` when set.
- **Verify:**
  - [x] Browser trigger works via server action.
  - [x] `curl` without bearer → 401 when `API_SECRET` set.
- **Status:** [x] Fixed

### P3-2: Empty EMAIL_APPROVAL_SECRET weakens tokens

- **Severity:** Security
- **Symptom:** Approval tokens hashed without pepper when secret unset.
- **Root cause:** [`lib/email-approval.ts`](lib/email-approval.ts) `?? ""` fallback.
- **Fix:** Throw at dispatch when approval required and secret missing; document in `.env.example`.
- **Verify:**
  - [x] Email approval dispatch fails with clear error if secret missing.
- **Status:** [x] Fixed

---

## Phase 4 — Low (edge cases)

### P4-1: Pipeline returns ok:true on CRITICAL_ERROR

- **Severity:** Low
- **Symptom:** Trigger shows success even when run aborts with no data.
- **Root cause:** `executeAgentPipeline` returns void; route always `{ ok: true }`.
- **Fix:** Return `{ outcome: 'success' | 'no_data' | 'error' | 'skipped' }`; surface in UI.
- **Verify:**
  - [x] No-data run shows error in TriggerButton, not silent success.
- **Status:** [x] Fixed

### P4-2: tsconfig excludes scripts/

- **Severity:** Low
- **Symptom:** scheduler.ts and seed.ts not type-checked under strict config.
- **Root cause:** [`tsconfig.json`](tsconfig.json) `"exclude": ["node_modules", "scripts"]`.
- **Fix:** Remove `scripts` from exclude.
- **Verify:**
  - [x] `npx tsc --noEmit` includes scripts without errors.
- **Status:** [x] Fixed

---

## Appendix — Documentation drift (not runtime bugs)

- **D5-1:** README.md still create-next-app boilerplate — [x] Fixed (see README.md)
- **D5-2:** PHASES.md SendGrid → SMTP, API key UI → read-only integrations — [x] Fixed
- **D5-3:** Prisma `FINANCIAL_STREAM` unused enum — schema comment only
