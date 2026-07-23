# Scripts Index

Reference for every script in this folder: what it does and how to run it.

| Script | Purpose | Run |
| --- | --- | --- |
| `seed.ts` | **Destructive — dev only.** Deletes all agents, then inserts one demo agent. Refused when `NODE_ENV=production`. | `npx tsx --env-file=.env scripts/seed.ts` |
| `run-pipeline.ts` | Triggers `executeAgentPipeline()` once for a given agent (CLI testing). | `npx tsx --env-file=.env scripts/run-pipeline.ts <agentId>` |
| `scheduler.ts` | Long-running worker: every 30s, runs ACTIVE agents whose `cronSchedule` matches the process local time (set `TZ` in `.env`). | Dev: `npm run scheduler` (second terminal). Prod image: started by `docker-entrypoint.sh` via `npm run scheduler:prod`. |
| `docker-entrypoint.sh` | Production container entrypoint: starts scheduler + Next.js together; traps SIGTERM/SIGINT. | Image `CMD` (do not run locally unless debugging the image). |
| `migrate.sh` | Validates `DATABASE_URL` is set, then runs `prisma migrate dev` with the given migration name. | `bash scripts/migrate.sh <migration-name>` |

See [`README.md`](../README.md) for full local setup and production environment checklist.
