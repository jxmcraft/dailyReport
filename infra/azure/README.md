# PulseAgent — Azure infrastructure (Bicep)

Provisions PostgreSQL, ACR, Key Vault, Container Apps Environment, **pulseagent-web**, and **pulseagent-scheduler**.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) with `az bicep` support
- Docker (for building the app image)
- Resource group (created below if needed)
- Deploying user needs **Owner** or **User Access Administrator** on the subscription/RG (role assignments for managed identities)

## 1. Validate templates

```bash
az bicep build --file infra/azure/main.bicep
```

## 2. Provision infrastructure

```bash
az login
az group create --name rg-pulseagent --location eastus

az deployment group create \
  --resource-group rg-pulseagent \
  --template-file infra/azure/main.bicep \
  --parameters infra/azure/main.bicepparam \
  --parameters postgresAdminPassword='YOUR_STRONG_PASSWORD' \
  --parameters containerImage='PLACEHOLDER:latest' \
  --parameters appUrl='https://will-update-after-deploy.example.com'
```

Note outputs:

```bash
az deployment group show -g rg-pulseagent -n main --query properties.outputs
```

Save `acrName`, `postgresFqdn`, `keyVaultName`, `webAppName`, `schedulerAppName`.

**First deploy:** Container Apps may fail to pull secrets until managed-identity role assignments propagate (1–3 minutes). If revisions are unhealthy, wait and run:

```bash
az containerapp revision restart -n pulseagent-web -g rg-pulseagent
az containerapp revision restart -n pulseagent-scheduler -g rg-pulseagent
```

## 3. Add secrets to Key Vault

Bicep seeds `DATABASE-URL` automatically. Add remaining secrets in Azure Portal or CLI:

| Key Vault secret | App env var | Required |
|------------------|-------------|----------|
| `DATABASE-URL` | `DATABASE_URL` | Yes (auto) |
| `OPENROUTER-API-KEY` | `OPENROUTER_API_KEY` | If using OpenRouter |
| `DEEPSEEK-API-KEY` | `DEEPSEEK_API_KEY` | If using DeepSeek |
| `EMAIL-APPROVAL-SECRET` | `EMAIL_APPROVAL_SECRET` | If email approval |
| `API-SECRET` | `API_SECRET` | Optional automation |
| `AZURE-CLIENT-SECRET` | `AZURE_CLIENT_SECRET` | If `EMAIL_PROVIDER=graph` |
| `SMTP-PASS` | `SMTP_PASS` | If SMTP email |

After adding secrets, update each Container App to reference them (Portal → Container App → Secrets → Key Vault reference, then Environment variables → secret ref). Or extend `main.bicep` `keyVaultSecretNames` and redeploy.

## 4. Build and push image

```bash
ACR_NAME=<from deployment output>
TAG=$(git rev-parse --short HEAD)

az acr login --name "$ACR_NAME"
docker build -t "$ACR_NAME.azurecr.io/pulseagent:$TAG" .
docker push "$ACR_NAME.azurecr.io/pulseagent:$TAG"
```

## 5. Apply database migrations

From a machine that can reach Postgres (add your IP to the server firewall temporarily):

```bash
DATABASE_URL="postgresql://pulseadmin:PASSWORD@<postgresFqdn>:5432/pulseagent?sslmode=require" \
  npx prisma migrate deploy
```

**Existing `db push` database (dev data kept):**

```bash
npx prisma migrate resolve --applied 20260629120000_init
```

Run **before** pointing production traffic at a new revision.

## 6. Deploy application revision

```bash
IMAGE="$ACR_NAME.azurecr.io/pulseagent:$TAG"

az containerapp update -n pulseagent-web -g rg-pulseagent --image "$IMAGE"
az containerapp update -n pulseagent-scheduler -g rg-pulseagent --image "$IMAGE"
```

Set `APP_URL` to the web app FQDN (no trailing slash):

```bash
FQDN=$(az containerapp show -n pulseagent-web -g rg-pulseagent --query properties.configuration.ingress.fqdn -o tsv)
az containerapp update -n pulseagent-web -g rg-pulseagent \
  --set-env-vars "APP_URL=https://$FQDN"
```

## 7. Verify

```bash
curl -sf "https://$FQDN/api/health"
az containerapp logs show -n pulseagent-scheduler -g rg-pulseagent --tail 30
```

## Secret / env mapping reference

| Variable | Web | Scheduler |
|----------|-----|-----------|
| `DATABASE_URL` | KV `DATABASE-URL` | KV `DATABASE-URL` |
| `APP_URL` | plain | — |
| `TZ` | plain | plain |
| `SCHEDULER_HEALTH_PORT` | — | `3001` |
| `LLM_PROVIDER` + API keys | yes | yes |
| `EMAIL_PROVIDER` + SMTP/Graph | yes | yes |

## Postgres firewall for local migrate

```bash
MY_IP=$(curl -s https://api.ipify.org)
az postgres flexible-server firewall-rule create \
  -g rg-pulseagent -n <postgresServerName> \
  -r allow-local-migrate --start-ip-address "$MY_IP" --end-ip-address "$MY_IP"
```

Remove the rule after migrating.

## Module layout

```
infra/azure/
  main.bicep
  main.bicepparam
  modules/
    logAnalytics.bicep
    containerAppsEnv.bicep
    acr.bicep
    postgres.bicep
    keyVault.bicep
    containerApp.bicep
```

See also [`docs/azure/DEPLOY.md`](../../docs/azure/DEPLOY.md) for the full release runbook.
