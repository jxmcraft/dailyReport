import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agent-card";
import { DashboardLiveSync } from "@/components/dashboard-live-sync";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { getAgents } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const agents = await getAgents();

  return (
    <PageShell size="xl">
      <DashboardLiveSync />

      <PageHeader
        title="Dashboard"
        description={`${pluralize(agents.length, "agent")} monitoring topics and producing reports.`}
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New agent
            </Link>
          </Button>
        }
      />

      {agents.length === 0 ? (
        <EmptyState>
          No agents yet. Create one to start fetching news and generating
          reports.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
