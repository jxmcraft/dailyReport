# Microsoft Graph (directory search + Mail.Send)

Use Graph when `EMAIL_PROVIDER=graph` instead of SMTP. Application permissions (no user sign-in on the dashboard).

## Entra app registration

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Note **Tenant ID**, **Application (client) ID**
3. **Certificates & secrets** → new client secret
4. **API permissions** → **Application permissions** → add and **Grant admin consent**:
   - `Group.Read.All`
   - `User.Read.All`
   - `Mail.Send`

## Service mailbox

Create or choose a mailbox (e.g. `pulseagent@yourcompany.com`) and set:

```env
GRAPH_SENDER_UPN=pulseagent@yourcompany.com
EMAIL_PROVIDER=graph
```

The app sends mail **as this user** via `POST /users/{upn}/sendMail`. Some tenants require an Exchange application access policy so the app may send from that mailbox.

## Environment variables

```env
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
GRAPH_SENDER_UPN=
EMAIL_PROVIDER=graph
APP_URL=https://your-public-host
```

When Graph env vars are set, delivery settings show a **directory search** picker for reviewers and emailees (users and mail-enabled groups). Selected entries store the group's or user's **mail** address — same as typing it manually.

## Approval links

Approval URLs use `APP_URL` (see `lib/app-url.ts`). In production, `APP_URL` must be your public Azure hostname so reviewers open the correct `/reports/approve` page.

## Fallback

If Graph is not configured, PulseAgent uses SMTP (`SMTP_*` in `.env`) and manual email entry.
