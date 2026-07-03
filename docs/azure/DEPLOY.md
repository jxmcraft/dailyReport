# Deploy NewsAgent on Azure

NewsAgent needs **two long-running processes** plus **PostgreSQL**:

| Process | Command | Notes |
| --- | --- | --- |
| Web | `npm run start` | Next.js dashboard + API; health at `/api/health` |
| Scheduler | `npm run scheduler` | Cron matcher; health at `:3001/health`; **min 1 / max 1 replica** |
| Database | PostgreSQL | Prisma via `DATABASE_URL`; use **migrations** in production |

## Infrastructure (Bicep)

Provision Azure resources with Bicep — see [`infra/azure/README.md`](../../infra/azure/README.md).

Resources created:

1. **Azure Database for PostgreSQL – Flexible Server** (v16)
2. **Azure Container Registry**
3. **Log Analytics** + **Container Apps Environment**
4. **Key Vault** (`DATABASE-URL` seeded at deploy)
5. **Container App `newsagent-web`** — external ingress, liveness/readiness on `/api/health`
6. **Container App `newsagent-scheduler`** — no ingress; command `npm run scheduler`; liveness on `/health:3001`

Validate templates locally:

```bash
az bicep build --file infra/azure/main.bicep
```

## Manual release runbook

Run in order for each production release:

### 1. Provision or update infrastructure

```bash
az group create -n rg-newsagent -l eastus
az deployment group create \
  -g rg-newsagent \
  -f infra/azure/main.bicep \
  -p infra/azure/main.bicepparam \
  -p postgresAdminPassword='...'
```

### 2. Build and push image

```bash
az acr login -n <acrName>
docker build -t <acrName>.azurecr.io/newsagent:<tag> .
docker push <acrName>.azurecr.io/newsagent:<tag>
```

### 3. Apply database migrations (once per schema change)

Run **before** updating Container App revisions (not in the web container `CMD`):

```bash
DATABASE_URL='postgresql://...@<server>.postgres.database.azure.com:5432/newsagent?sslmode=require' \
  npm run db:migrate:deploy
```

| Database state | Action |
| --- | --- |
| Fresh | `npm run db:migrate:deploy` |
| Existing dev `db push` DB (disposable) | `npx prisma migrate reset` or drop DB, then `migrate deploy` |
| Existing `db push` DB (keep data) | `npx prisma migrate resolve --applied 20260629120000_init` then `migrate deploy` for future migrations |

**Production rule:** never use `prisma db push`.

### 4. Update Container Apps

```bash
az containerapp update -n newsagent-web -g rg-newsagent --image <acrName>.azurecr.io/newsagent:<tag>
az containerapp update -n newsagent-scheduler -g rg-newsagent --image <acrName>.azurecr.io/newsagent:<tag>
```

Set `APP_URL` to the public HTTPS URL (no trailing slash) before sending approval emails.

### 5. Verify

```bash
curl -sf https://<web-fqdn>/api/health
az containerapp logs show -n newsagent-scheduler -g rg-newsagent --tail 20
```

## Docker image

```bash
docker build -t newsagent:latest .
```

- **Web** container command: default (`npm run start`)
- **Scheduler** container command: `npm run scheduler`

## Required environment variables

See [`.env.example`](../../.env.example). Minimum for production:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (`?sslmode=require` on Azure) |
| `APP_URL` | Public HTTPS base URL for approval links |
| `LLM_PROVIDER` + API key | Report synthesis |
| `EMAIL_APPROVAL_SECRET` | If using email approval |
| `TZ` | Scheduler timezone (IANA, e.g. `America/New_York`) |
| `SCHEDULER_HEALTH_PORT` | Scheduler probe port (default `3001`) |

For Microsoft Graph email/directory, see [MICROSOFT_GRAPH.md](./MICROSOFT_GRAPH.md).

Store secrets in **Key Vault**; reference from Container Apps. See [`infra/azure/README.md`](../../infra/azure/README.md) for the secret name table.

## Security

The dashboard has **no built-in login**. Before exposing a public URL:

- Restrict network access (private Container Apps environment, VPN, IP allow list), **or**
- Add Entra ID authentication (planned separately).

Set `API_SECRET` for automation routes (`POST /api/pipeline/[agentId]/run`).

## Scheduler locking

- **DB cron dedupe:** `SchedulerFire` table prevents double-fires across scheduler replicas.
- **Pipeline claim:** only one run per agent (`ACTIVE` → `RUNNING` via atomic update).
- **ACA scale:** scheduler `maxReplicas: 1` in Bicep.

## Local smoke test

```bash
docker compose -f docker-compose.azure-prep.yml up --build -d
docker compose -f docker-compose.azure-prep.yml run --rm web npx prisma migrate deploy
curl -sf http://localhost:3000/api/health
curl -sf http://localhost:3001/health
```

Open http://localhost:3000

## CI

GitHub Actions runs `tsc`, `lint`, `test:unit`, and `docker build` on pull requests and pushes to `main`. Deploy steps are manual (see runbook above).
