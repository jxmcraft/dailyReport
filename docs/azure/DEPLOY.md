# Deploy PulseAgent on Azure

PulseAgent needs **two long-running processes** plus **PostgreSQL**:

| Process | Command | Notes |
| --- | --- | --- |
| Web | `npm run start` | Next.js dashboard + API |
| Scheduler | `npm run scheduler` | Cron matcher; keep **min 1 replica** |
| Database | PostgreSQL | Prisma via `DATABASE_URL` |

## Recommended Azure resources

1. **Azure Database for PostgreSQL – Flexible Server**
2. **Azure Container Apps Environment**
3. **Container App `pulseagent-web`** — ingress enabled, HTTPS, scale ≥ 1
4. **Container App `pulseagent-scheduler`** — no ingress, min replicas **1**
5. **Azure Key Vault** — store secrets; reference from Container Apps
6. **Custom domain** on the web app — set `APP_URL` to this URL (no trailing slash)

## Build and push image

```bash
docker build -t pulseagent:latest .
# Tag and push to Azure Container Registry, then deploy both Container Apps from the same image.
```

- **Web** container command: default (`npm run start`)
- **Scheduler** container command: `npm run scheduler`

## First-time database setup

Run once against production `DATABASE_URL`:

```bash
npx prisma db push
```

Prefer `prisma migrate deploy` once you adopt migrations for production.

## Required environment variables

See [`.env.example`](../../.env.example). Minimum for production:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (SSL) |
| `APP_URL` | Public HTTPS base URL for approval links |
| `LLM_PROVIDER` + API key | Report synthesis |
| `EMAIL_APPROVAL_SECRET` | If using email approval |
| `TZ` | Scheduler timezone (IANA, e.g. `America/New_York`) |

For Microsoft Graph email/directory, see [MICROSOFT_GRAPH.md](./MICROSOFT_GRAPH.md).

## Security

The dashboard has **no built-in login**. Before exposing a public URL:

- Restrict network access (private Container Apps environment, VPN, IP allow list), **or**
- Add Entra ID authentication (planned separately).

## Local smoke test

```bash
docker compose -f docker-compose.azure-prep.yml up --build
docker compose -f docker-compose.azure-prep.yml run --rm web npx prisma db push
```

Open http://localhost:3000
