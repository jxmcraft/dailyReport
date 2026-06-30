import { KeyRound, CheckCircle2, XCircle } from "lucide-react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { getAgents } from "@/lib/agents";
import { getAppBaseUrl } from "@/lib/app-url";
import { resolveEmailProvider } from "@/lib/email-delivery";
import { SMTP_ENV_KEYS } from "@/lib/delivery-config";
import { isEnvConfigured } from "@/lib/env";
import { isMicrosoftGraphConfigured } from "@/lib/microsoft-graph";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const agents = await getAgents();

  const refs = new Set<string>([
    "APP_URL",
    "OPENROUTER_API_KEY",
    "DEEPSEEK_API_KEY",
    "NEWS_API_KEY",
    "GNEWS_API_KEY",
    "CURRENTS_API_KEY",
    "MARKETAUX_API_KEY",
    "GUARDIAN_API_KEY",
    "MEDIASTACK_API_KEY",
    "GOOGLE_SEARCH_API_KEY",
    "GOOGLE_SEARCH_CX",
    "REDDIT_USER",
    "EMAIL_APPROVAL_SECRET",
    "EMAIL_PROVIDER",
    "AZURE_TENANT_ID",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
    "GRAPH_SENDER_UPN",
    "API_SECRET",
  ]);
  for (const agent of agents) {
    for (const source of agent.dataSources) {
      if (source.authSecretKeyRef && source.authSecretKeyRef !== "NONE") {
        refs.add(source.authSecretKeyRef);
      }
    }
  }

  const hasEmailDelivery = agents.some((a) =>
    a.deliveryChannels.some((c) => c.target === "EMAIL")
  );
  if (hasEmailDelivery) {
    if (resolveEmailProvider() === "smtp") {
      for (const key of SMTP_ENV_KEYS) refs.add(key);
    }
  }

  const resolvedAppUrl = getAppBaseUrl();
  const graphReady = isMicrosoftGraphConfigured();

  const secrets = Array.from(refs)
    .sort()
    .map((ref) => ({ ref, configured: isEnvConfigured(ref) }));
  const configuredCount = secrets.filter((s) => s.configured).length;

  return (
    <PageShell size="md">
      <PageHeader
        title="Integrations"
        description={`${configuredCount} of ${secrets.length} API keys configured. Keys live in your project .env file and are never stored in the database.`}
      />

      <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
        <ul className="divide-y divide-border/70">
          {secrets.map(({ ref, configured }) => (
            <li
              key={ref}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-xs sm:text-sm">
                  {ref}
                </span>
              </span>
              {configured ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  <XCircle className="h-3.5 w-3.5" />
                  Missing
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {hasEmailDelivery ? (
        <div className="mt-6 rounded-xl border border-border/70 bg-slate-50/80 px-5 py-4 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Resolved approval base URL:</span>{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs">{resolvedAppUrl}</code>
          </p>
          <p className="mt-2">
            Email provider: <strong>{resolveEmailProvider()}</strong>
            {graphReady ? " · Graph directory search enabled" : ""}
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Add keys to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code>, save the file, then restart{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run dev</code>.
      </p>
    </PageShell>
  );
}
