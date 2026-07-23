import { notFound } from "next/navigation";

import { AgentDetailWorkspace } from "@/components/agent-detail-workspace";
import { AgentRunProvider } from "@/components/agent-run-context";
import { KeywordChips } from "@/components/keyword-chips";
import { DeleteAgentButton } from "@/components/delete-agent-button";
import { PageHeader, PageShell } from "@/components/page-shell";
import { PauseAgentButton } from "@/components/pause-agent-button";
import { StatusBadge } from "@/components/status-badge";
import { TriggerButton } from "@/components/trigger-button";
import { cronToHuman, getAgentById } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";
import { isMicrosoftGraphConfigured } from "@/lib/microsoft-graph";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const agent = await getAgentById(params.id);
  if (!agent) notFound();

  const keywordSummary = `${cronToHuman(agent.cronSchedule)} · ${pluralize(agent.reportCount, "report")}`;
  const deliveryChannel = agent.deliveryChannels[0];
  const directorySearchEnabled = isMicrosoftGraphConfigured();

  return (
    <PageShell size="xl">
      <AgentRunProvider
        agentId={agent.id}
        initialStatus={agent.status}
        initialPipelineState={agent.pipelineState}
        initialReports={agent.reports}
      >
        <PageHeader
          backHref="/"
          backLabel="Dashboard"
          title={agent.name}
          description={keywordSummary}
          badges={<StatusBadge status={agent.status} />}
          actions={
            <>
              <PauseAgentButton
                agentId={agent.id}
                initialPaused={agent.status === "PAUSED"}
              />
              <TriggerButton agentId={agent.id} disabled={agent.status === "PAUSED"} />
              <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
            </>
          }
        />

        {agent.topicKeywords.length > 0 ? (
          <div className="mb-6">
            <KeywordChips keywords={agent.topicKeywords} variant="detail" />
          </div>
        ) : null}

        <AgentDetailWorkspace
          agent={{
            id: agent.id,
            name: agent.name,
            topicKeywords: agent.topicKeywords,
            cronSchedule: agent.cronSchedule,
            systemPrompt: agent.systemPrompt,
            relevanceMinScore: agent.relevanceMinScore,
            minRankedSources: agent.minRankedSources,
            maxRankedSources: agent.maxRankedSources,
            shallowScrapeMaxLinks: agent.shallowScrapeMaxLinks,
            enableNewsApi: agent.enableNewsApi,
            enableReddit: agent.enableReddit,
            enableHackerNews: agent.enableHackerNews,
            enableGoogleSearch: agent.enableGoogleSearch,
            keywordMatchMode: agent.keywordMatchMode,
            dataSources: agent.dataSources,
          }}
          deliveryChannel={deliveryChannel}
          directorySearchEnabled={directorySearchEnabled}
          emailDeliveryEnabled={deliveryChannel?.target === "EMAIL"}
          requireEmailApproval={deliveryChannel?.requireEmailApproval ?? false}
        />
      </AgentRunProvider>
    </PageShell>
  );
}
