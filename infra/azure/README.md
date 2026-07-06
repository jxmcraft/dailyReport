# NewsAgent — Azure infrastructure (Bicep)

Provisions PostgreSQL, ACR, Key Vault, Container Apps Environment, **newsagent-web**, and **newsagent-scheduler**.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) with `az bicep` support
- Docker (for building the app image)
- Resource group (created below if needed)
- **Role assignments (default):** deploying user needs **Owner** or **User Access Administrator** on the subscription/RG
- **Contributor only:** set `assignManagedIdentityRoles=false` and have an admin assign roles manually (see below)

## 1. Validate templates

```bash
az bicep build --file infra/azure/main.bicep
```

## 2. Provision infrastructure

```bash
az login
az group create --name rg-newsagent --location eastus

az deployment group create \
  --resource-group rg-newsagent \
  --template-file infra/azure/main.bicep \
  --parameters infra/azure/main.bicepparam \
  --parameters postgresAdminPassword="${POSTGRES_ADMIN_PASSWORD}" \
  --parameters containerImage='PLACEHOLDER:latest' \
  --parameters appUrl='https://will-update-after-deploy.example.com'
```

Note outputs:

```bash
az deployment group show -g rg-newsagent -n main --query properties.outputs
```

Save `acrName`, `postgresFqdn`, `keyVaultName`, `webAppName`, `schedulerAppName`.

### Contributor without role-assignment permission

If deploy fails with `roleAssignments/write` denied, redeploy with role assignment creation skipped:

```powershell
az deployment group create `
  -g rg-newsagent `
  -f infra/azure/main.bicep `
  -p infra/azure/main.bicepparam `
  -p assignManagedIdentityRoles=false `
  -p postgresAdminPassword='YOUR_STRONG_PASSWORD'
```

Then ask an **Owner** or **User Access Administrator** to grant:

| Role | Scope | Principal |
|------|--------|-----------|
| **AcrPull** | Your ACR | Managed identity of `newsagent-web` |
| **AcrPull** | Your ACR | Managed identity of `newsagent-scheduler` |
| **Key Vault Secrets User** | Your Key Vault | Managed identity of `newsagent-web` |
| **Key Vault Secrets User** | Your Key Vault | Managed identity of `newsagent-scheduler` |

Get principal IDs:

```powershell
az containerapp show -n newsagent-web -g rg-newsagent --query identity.principalId -o tsv
az containerapp show -n newsagent-scheduler -g rg-newsagent --query identity.principalId -o tsv
```

**First deploy:** Container Apps may fail to pull images/secrets until those roles exist (1–3 minutes after assignment). If revisions are unhealthy, wait and run:

```bash
az containerapp revision restart -n newsagent-web -g rg-newsagent
az containerapp revision restart -n newsagent-scheduler -g rg-newsagent
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
docker build -t "$ACR_NAME.azurecr.io/newsagent:$TAG" .
docker push "$ACR_NAME.azurecr.io/newsagent:$TAG"
```

## 5. Apply database migrations

From a machine that can reach Postgres (add your IP to the server firewall temporarily):

```bash
DATABASE_URL="postgresql://newsadmin:PASSWORD@<postgresFqdn>:5432/newsagent?sslmode=require" \
  npx prisma migrate deploy
```

**Existing `db push` database (dev data kept):**

```bash
npx prisma migrate resolve --applied 20260629120000_init
```

Run **before** pointing production traffic at a new revision.

## 6. Deploy application revision

```bash
IMAGE="$ACR_NAME.azurecr.io/newsagent:$TAG"

az containerapp update -n newsagent-web -g rg-newsagent --image "$IMAGE"
az containerapp update -n newsagent-scheduler -g rg-newsagent --image "$IMAGE"
```

Set `APP_URL` to the web app FQDN (no trailing slash):

```bash
FQDN=$(az containerapp show -n newsagent-web -g rg-newsagent --query properties.configuration.ingress.fqdn -o tsv)
az containerapp update -n newsagent-web -g rg-newsagent \
  --set-env-vars "APP_URL=https://$FQDN"
```

## 7. Verify

```bash
curl -sf "https://$FQDN/api/health"
az containerapp logs show -n newsagent-scheduler -g rg-newsagent --tail 30
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
  -g rg-newsagent -n <postgresServerName> \
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
