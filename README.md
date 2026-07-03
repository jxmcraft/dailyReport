# NewsAgent

NewsAgent is a Next.js dashboard for scheduled intelligence agents. Each agent fetches news and web sources by topic keywords, ranks and filters articles, synthesizes a Markdown report via an LLM (OpenRouter or DeepSeek), and delivers to Slack, Email, or Discord.

## Local development

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` and at least one LLM key (`OPENROUTER_API_KEY` or `DEEPSEEK_API_KEY` with `LLM_PROVIDER=deepseek`).

3. Apply database migrations:

   ```bash
   npx prisma migrate deploy
   ```

   For a new local database this creates all tables. If you previously used `db push`, either reset (`npx prisma migrate reset`) or baseline with `npx prisma migrate resolve --applied 20260629120000_init` — see [`docs/azure/DEPLOY.md`](docs/azure/DEPLOY.md).

   To create a new migration during development:

   ```bash
   bash scripts/migrate.sh <migration-name>
   ```

4. Start the web app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. **Optional — scheduled runs:** In a second terminal, start the scheduler (uses the machine's local timezone; set `TZ` in `.env` for production):

   ```bash
   npm run scheduler
   ```

6. **Optional — dev sample data:** `scripts/seed.ts` creates a demo agent. **Dev only — it deletes all existing agents first.** See [Scripts](#scripts).

### Built-in sources

News, Reddit, Hacker News, and Google run from topic keywords when the matching API keys are set in `.env`. Custom webpage URLs are stored per agent as `CUSTOM_SCRAPE` data sources.

### Integrations page

The Integrations page is **read-only**: it shows which `.env` keys are configured. Edit keys in `.env` and restart the dev server.

### Workspace settings

LLM timeout, source fetch timeout, and poll interval are editable on the Settings page (stored in the database, not `.env`).

## Scripts

| Script | Purpose | Run |
| --- | --- | --- |
| `seed.ts` | **Destructive (dev only).** Deletes all agents, then inserts one demo agent. Refused when `NODE_ENV=production`. | `npx tsx --env-file=.env scripts/seed.ts` |
| `run-pipeline.ts` | Run the pipeline once for an agent (CLI testing). | `npx tsx --env-file=.env scripts/run-pipeline.ts <agentId>` |
| `scheduler.ts` | Long-running worker: every 30s, runs ACTIVE agents whose cron matches local time. | `npm run scheduler` |
| `migrate.sh` | Creates a new migration in dev (`prisma migrate dev`). | `bash scripts/migrate.sh <migration-name>` |
| `db:migrate:deploy` | Applies pending migrations (production / release). | `npm run db:migrate:deploy` |

## Production environment

Use `.env.example` as the checklist. Summary:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LLM_PROVIDER` | Yes | `openrouter` (default) or `deepseek` |
| `OPENROUTER_API_KEY` | If using OpenRouter | |
| `DEEPSEEK_API_KEY` | If using DeepSeek | Set `LLM_PROVIDER=deepseek` |
| `APP_URL` | Yes in production | Public base URL for email approval links (no trailing slash) |
| `TZ` | Recommended for scheduler | IANA timezone, e.g. `America/New_York` — cron matches process local time |
| Source API keys | Optional | Enable more built-in providers (News, Google, etc.) |
| `SMTP_*` | If using Email delivery | |
| `EMAIL_APPROVAL_SECRET` | If email approval enabled | |
| `API_SECRET` | Optional | Bearer token for `POST /api/pipeline/[agentId]/run` |
| `REDDIT_USER` | Optional | Reddit User-Agent string |

Timeouts (LLM, source fetch, poll interval) are configured on the **Settings** page, not via env.

**Security:** There is no authentication on the web UI or API routes. Treat the deployment as private until you add access control.

**Azure / container deploy:** See [`docs/azure/DEPLOY.md`](docs/azure/DEPLOY.md) and [`infra/azure/README.md`](infra/azure/README.md). Provision with Bicep, run `npm run db:migrate:deploy` before each release, then update web + scheduler Container Apps. Microsoft Graph: [`docs/azure/MICROSOFT_GRAPH.md`](docs/azure/MICROSOFT_GRAPH.md).

## Tests and quality

```bash
npx tsc --noEmit
npm run lint
npm run test:unit
```

## Further reading

- [`PHASES.md`](PHASES.md) — historical build plan (some details are outdated; this README is authoritative for current behavior)
- [`BUGFIXES.md`](BUGFIXES.md) — tracked fixes and verification notes
