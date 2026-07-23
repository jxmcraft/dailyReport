# Deploy NewsAgent on Azure Container Apps

**Recommended path:** create resources with the Azure Portal or `az` CLI (this page).

**Optional:** provision the same stack with Bicep — see [`infra/azure/README.md`](../../infra/azure/README.md).

NewsAgent runs as **one Container App** (Next.js + cron scheduler) plus **PostgreSQL**:

| Piece | How it runs | Notes |
| --- | --- | --- |
| Web + scheduler | Image default `CMD` → `scripts/docker-entrypoint.sh` | Starts `npm run scheduler:prod` and `npm run start` together |
| Database | PostgreSQL | Prisma via `DATABASE_URL`; use **migrations** in production |

Scale **minReplicas: 1 / maxReplicas: 1** so only one scheduler process runs. `SchedulerFire` still dedupes if replicas are raised later.

### Health probes

| Probe | Path | Purpose |
| --- | --- | --- |
| Liveness | `/api/health/live` | Process up (no DB) — do not restart on DB blips |
| Readiness | `/api/health` | Postgres reachable |

Both use port **3000**.

## Prerequisites

- Azure CLI (`az`) and Docker
- A resource group (created below if needed)

## 1. Resource group + Container Apps Environment

```bash
az group create -n rg-newsagent -l eastus

az monitor log-analytics workspace create \
  -g rg-newsagent -n newsagent-logs -l eastus

LOG_ID=$(az monitor log-analytics workspace show \
  -g rg-newsagent -n newsagent-logs --query customerId -o tsv)
LOG_KEY=$(az monitor log-analytics workspace get-shared-keys \
  -g rg-newsagent -n newsagent-logs --query primarySharedKey -o tsv)

az containerapp env create \
  -g rg-newsagent -n newsagent-cae -l eastus \
  --logs-workspace-id "$LOG_ID" \
  --logs-workspace-key "$LOG_KEY"
```

Or create a **Container Apps Environment** in the Portal (it can create Log Analytics for you).

## 2. Azure Container Registry

```bash
# Name must be alphanumeric only
az acr create -g rg-newsagent -n newsagentacr$RANDOM --sku Basic
ACR_NAME=$(az acr list -g rg-newsagent --query "[0].name" -o tsv)

az acr login -n "$ACR_NAME"
TAG=$(git rev-parse --short HEAD)
IMAGE="$ACR_NAME.azurecr.io/newsagent:$TAG"
docker build -t "$IMAGE" .
docker push "$IMAGE"
```

Enable admin credentials **or** attach a managed identity with AcrPull when creating the Container App (Portal: Registry → Admin user, or identity-based pull).

## 3. PostgreSQL

Create **Azure Database for PostgreSQL – Flexible Server** (Portal or CLI), database `newsagent`, and allow your IP (for migrations) plus the Container Apps environment outbound access as needed.

```bash
DATABASE_URL='postgresql://USER:PASSWORD@SERVER.postgres.database.azure.com:5432/newsagent?sslmode=require' \
  npm run db:migrate:deploy
```

| Database state | Action |
| --- | --- |
| Fresh | `npm run db:migrate:deploy` |
| Existing dev `db push` DB (disposable) | `npx prisma migrate reset` or drop DB, then `migrate deploy` |
| Existing `db push` DB (keep data) | `npx prisma migrate resolve --applied 20260629120000_init` then `migrate deploy` for future migrations |

**Production rule:** never use `prisma db push`. Run migrations **before** pointing traffic at a new revision.

## 4. Create the Container App

Do **not** override the container command — the image entrypoint runs web + scheduler.

```bash
# Use ACR admin for a simple first deploy (or configure managed identity + AcrPull)
ACR_USER=$(az acr credential show -n "$ACR_NAME" --query username -o tsv)
ACR_PASS=$(az acr credential show -n "$ACR_NAME" --query "passwords[0].value" -o tsv)

az containerapp create \
  -g rg-newsagent -n newsagent-web \
  --environment newsagent-cae \
  --image "$IMAGE" \
  --registry-server "$ACR_NAME.azurecr.io" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 --memory 1.0Gi \
  --secrets "database-url=$DATABASE_URL" \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "APP_URL=https://placeholder.example.com" \
    "TZ=UTC" \
    "LLM_PROVIDER=openrouter" \
    "DATABASE_URL=secretref:database-url"
```

Add more secrets the same way (`openrouter-api-key=...` → `OPENROUTER_API_KEY=secretref:openrouter-api-key`). Prefer **Container App secrets** over Key Vault for this simple path.

### Probes (Portal or YAML)

After create, set probes (Portal → Container → Health probes), or update via revision:

- **Liveness:** HTTP GET `/api/health/live` port 3000
- **Readiness:** HTTP GET `/api/health` port 3000

### Set public `APP_URL`

```bash
FQDN=$(az containerapp show -n newsagent-web -g rg-newsagent \
  --query properties.configuration.ingress.fqdn -o tsv)
az containerapp update -n newsagent-web -g rg-newsagent \
  --set-env-vars "APP_URL=https://$FQDN"
```

### Orphan scheduler from a prior two-app deploy

```bash
az containerapp delete -n newsagent-scheduler -g rg-newsagent --yes
```

## 5. Update on each release

```bash
az acr login -n "$ACR_NAME"
TAG=$(git rev-parse --short HEAD)
IMAGE="$ACR_NAME.azurecr.io/newsagent:$TAG"
docker build -t "$IMAGE" .
docker push "$IMAGE"

# Migrate first when schema changed
# DATABASE_URL='...' npm run db:migrate:deploy

az containerapp update -n newsagent-web -g rg-newsagent --image "$IMAGE"
```

## 6. Verify

```bash
curl -sf "https://$FQDN/api/health/live"
curl -sf "https://$FQDN/api/health"
az containerapp logs show -n newsagent-web -g rg-newsagent --tail 40
```

Expect Next.js and scheduler startup lines in the same log stream.

## Environment variables

See [`.env.example`](../../.env.example). On Azure Container Apps:

| Kind | Examples |
| --- | --- |
| **Secrets** | `DATABASE_URL`, API keys (`OPENROUTER_API_KEY`, `SMTP_PASS`, `EMAIL_APPROVAL_SECRET`, `API_SECRET`, …) |
| **Plain env** | `APP_URL`, `TZ`, `PORT`, `NODE_ENV`, `LLM_PROVIDER`, `EMAIL_PROVIDER` |

For Microsoft Graph email/directory, see [MICROSOFT_GRAPH.md](./MICROSOFT_GRAPH.md).

## Security

The dashboard has **no built-in login**. Before exposing a public URL:

- Restrict network access (private environment, VPN, IP allow list), **or**
- Add Entra ID authentication (planned separately).

Set `API_SECRET` for automation routes (`POST /api/pipeline/[agentId]/run`).

## Scheduler locking

- **DB cron dedupe:** `SchedulerFire` prevents double-fires across replicas.
- **Pipeline claim:** only one run per agent (`ACTIVE` → `RUNNING`).
- **ACA scale:** keep `maxReplicas: 1` on `newsagent-web`.

## Local smoke test

```bash
docker compose -f docker-compose.azure-prep.yml up --build -d
docker compose -f docker-compose.azure-prep.yml run --rm web npx prisma migrate deploy
curl -sf http://localhost:3000/api/health/live
curl -sf http://localhost:3000/api/health
```

Open http://localhost:3000 — the compose `web` service uses the image entrypoint (web + scheduler).

## Optional: provision with Bicep

If you prefer IaC (Postgres + ACR + Key Vault + Container App in one deployment), use [`infra/azure/README.md`](../../infra/azure/README.md). Day-to-day image updates still use `az containerapp update` as above.

## CI

GitHub Actions runs `tsc`, `lint`, `test:unit`, and `docker build` on pull requests and pushes to `main`. Deploy steps are manual (this runbook).

## Docker image

```bash
docker build -t newsagent:latest .
```

Default `CMD` is `./scripts/docker-entrypoint.sh` (scheduler + Next.js). No `.env` file in the image — configure env/secrets on the Container App.
