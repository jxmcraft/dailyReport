import { KeyRound, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const agents = await getAgents();

  // Built-in sources run automatically from keywords; their keys (plus the LLM
  // and any email delivery) are the integrations configured here via .env.
  const refs = new Set<string>([
    "OPENROUTER_API_KEY",
    "NEWS_API_KEY",
    "GOOGLE_SEARCH_API_KEY",
    "GOOGLE_SEARCH_CX",
    "REDDIT_USER",
  ]);
  for (const agent of agents) {
    for (const source of agent.dataSources) {
      if (source.authSecretKeyRef && source.authSecretKeyRef !== "NONE") {
        refs.add(source.authSecretKeyRef);
      }
    }
    for (const channel of agent.deliveryChannels) {
      if (channel.target === "EMAIL") refs.add("SENDGRID_API_KEY");
    }
  }

  const secrets = Array.from(refs)
    .sort()
    .map((ref) => ({ ref, configured: Boolean(process.env[ref]) }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Global API Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Agents pull from built-in sources (News, Reddit, Hacker News, Google)
          automatically using their topic keywords. API keys for those sources
          live here, not on the agent form. Secrets are read from server
          environment variables and never stored in the database; add missing
          keys to your <code>.env</code> file.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required Secrets</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {secrets.map(({ ref, configured }) => (
              <li key={ref} className="flex items-center justify-between py-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  {ref}
                </span>
                {configured ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    <XCircle className="h-3.5 w-3.5" />
                    Not configured
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
