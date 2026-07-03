# NewsAgent — Implementation Phases

> **Note:** This is a historical build plan from the original PRD. For current setup, behavior, and environment variables, see [`README.md`](README.md).

Phased build plan derived from `PRD.md`.

Stack: Next.js 14 (App Router), TypeScript, Prisma ORM, PostgreSQL, TailwindCSS, Shadcn/ui.

---

## Phase 1 — Foundation

Goal: Runnable Next.js 14 app with schema and types wired.

- Init Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn/ui.
- Add Prisma; schema includes `Agent`, `DataSource`, `DeliveryChannel`, `IntelligenceReport`, `WorkspaceSettings`.
- Create `/types/agent.ts` with pipeline context interfaces.
- Add `.env.example` with `DATABASE_URL` and LLM key placeholders.

Verify: `npx prisma db push` succeeds and the app boots.

---

## Phase 2 — UI Shell & Dashboard

Goal: Full dashboard UI wired to live data.

- Sidebar: Agents Dashboard, Integrations (read-only env status), Activity Logs, Settings.
- Agent card grid: name, topic keywords, frequency, status badge, last-run date.
- `PipelineStatusIndicator` with IDLE / IN_PROGRESS / COMPLETED states.
- Human-friendly cron configurator (Daily/Weekly/Hourly + time picker).
- Live markdown preview for system prompt editing.
- Sources accordion and source health on reports.

Verify: dashboard and agent detail render with real DB data.

---

## Phase 3 — Backend Pipeline

Goal: Real pipeline executes end-to-end.

- `POST /api/pipeline/[agentId]/run` and UI trigger call `executeAgentPipeline()`.
- Built-in providers (News, Reddit, Hacker News, Google) from topic keywords + `.env` keys; optional `CUSTOM_SCRAPE` webpage URLs per agent.
- LLM layer (`lib/llm.ts`): OpenRouter or DeepSeek via env; map-reduce when context exceeds token limit.
- Delivery: Slack webhook, Discord embed, SMTP email (nodemailer — not SendGrid).
- `IntelligenceReport` on success, partial failure, and error paths; agent reset to `ACTIVE` in `finally`.
- Timeouts: workspace settings (Settings page) for LLM and source fetch.

Verify: `scripts/run-pipeline.ts` triggers a full run and a report appears in the DB.

---

## Phase 4 — Integration & Hardening

Goal: UI reflects live runs; secrets stay in `.env`.

- Dashboard and activity logs poll lightweight status APIs during runs.
- Integrations page: read-only display of which env keys are set (no DB storage of secrets).
- Partial failure and critical error reports with `statusNotes` and source diagnostics in the UI.
- Email approval flow with `EMAIL_APPROVAL_SECRET` and `APP_URL`.

Verify: pipeline run visible without manual refresh; error states show diagnostics, not misleading zero counts.
