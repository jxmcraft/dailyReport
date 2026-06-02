import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agent-card";
import { getAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const agents = await getAgents();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agents Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} reporting agents configured.
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Agent
          </Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No agents yet. Seed the database or create one to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
