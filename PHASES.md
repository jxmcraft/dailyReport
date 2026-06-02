# PulseAgent — Implementation Phases

Phased build plan derived from `PRD.md` and `pulseagent_prd.pdf`.

Stack: Next.js 14 (App Router), TypeScript, Prisma ORM, PostgreSQL, TailwindCSS, Shadcn/ui.

Build order follows the PRD's explicit instruction: dashboard grid first against mock data, then UI components, then backend pipeline hookups.

---

## Phase 1 — Foundation

Goal: Runnable Next.js 14 app with schema and types wired.

- Init Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn/ui.
- Add Prisma; write `schema.prisma` from PRD section 2 (4 models: `Agent`, `DataSource`, `DeliveryChannel`, `IntelligenceReport`; 3 enums plus `ExecutionStatus`).
- Create `/types/agent.ts` with `SourceMetadata`, `IngestionPayload`, `LLMProcessingContext` interfaces.
- Add `.env.example` with `DATABASE_URL` and LLM key placeholders.

Verify: `prisma migrate dev` succeeds and the app boots.

---

## Phase 2 — UI Shell & Dashboard

Goal: Full dashboard UI against mock data, no backend calls.

- Left sidebar: Agents Dashboard, Global API Integrations, Activity Logs, System Settings.
- Agent card grid: name, topic keywords, frequency, status badge, last-run date.
- `PipelineStatusIndicator` component with the IDLE / FETCHING / SYNTHESIZING / DELIVERING / COMPLETED states from PRD section 3.1 (badge colors and pulse animation per spec).
- Human-friendly cron configurator (Daily/Weekly/Hourly dropdown + timezone-adjusted clock selector) instead of raw cron input.
- Live markdown preview pane for editing the system prompt.
- Citation Transparency Accordion ("Sources Audited") on the report detail view.
- Color palette: white canvas `#ffffff`, slate borders `#e2e8f0`, indigo `#2563eb` accents, semantic badges (success `#10b981`, processing `#3b82f6` pulse, failed `#ef4444`).

Verify: all UI states render correctly with mock `AgentConfiguration` data.

---

## Phase 3 — Backend Pipeline

Goal: Real pipeline executes end-to-end via an API route.

- `POST /api/pipeline/[agentId]/run` route triggers `executeAgentPipeline()`.
- Ingestion worker: fetch each `DataSource`, truncate stringified payload at 24,000 chars, build `compiledContextStrings` and `extractedSourceMeta`.
- LLM layer (`lib/openrouter.ts`): call OpenRouter (OpenAI-compatible) with the free Poolside model `poolside/laguna-m.1:free` using `systemPrompt` plus context; log null payloads cleanly without panicking; chunk (map-reduce) if cumulative tokens exceed 128,000.
- Delivery router: dispatch to Slack webhook / Discord embed / SendGrid email.
- Write an `IntelligenceReport` record on both success and error paths; reset agent status to `ACTIVE` in `finally`.
- Enforce a 180,000 ms timeout on all external fetch clients.

Verify: `scripts/run-pipeline.ts` triggers a full run and a report appears in the DB.

---

## Phase 4 — Integration & Hardening

Goal: UI reads live data, secrets are handled securely, system is production-ready.

- Wire dashboard cards and activity logs to the real DB via server components / API routes.
- Secure API key setup UI: maps user input to `.env` (never stored in DB plain-text).
- Scheduler retry logic: 3 attempts with exponential backoff on ingestion failure; show "Partial Ingestion" badge in UI.
- Delivery failure path: save output to `IntelligenceReport` with `PARTIAL_FAILURE` status and flag the run in the dashboard.

Verify: a full pipeline run is reflected in the UI without a page refresh; error states display correctly.
