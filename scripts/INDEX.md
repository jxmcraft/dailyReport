# Scripts Index

Reference for every script in this folder: what it does and how to run it.

| Script | Purpose | Run |
| --- | --- | --- |
| `seed.ts` | Inserts a mock `Agent` with a `DataSource` and `DeliveryChannel` for Phase 2 UI development. | `npx ts-node scripts/seed.ts` |
| `run-pipeline.ts` | Triggers `executeAgentPipeline()` directly for a given agent (dev/test of the backend pipeline). | `npx ts-node scripts/run-pipeline.ts <agentId>` |
| `scheduler.ts` | Long-running worker: every 30s, runs any ACTIVE agent whose `cronSchedule` matches the current local time. Keep it running for scheduled reports to fire. | `npm run scheduler` |
| `migrate.sh` | Validates `DATABASE_URL` is set, then runs `prisma migrate dev` with the given migration name. | `bash scripts/migrate.sh <migration-name>` |
