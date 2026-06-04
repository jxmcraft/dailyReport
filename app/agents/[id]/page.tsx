import { notFound } from "next/navigation";

import { AgentLiveMonitor } from "@/components/agent-live-monitor";
import { AgentRunProvider } from "@/components/agent-run-context";
import { KeywordChips } from "@/components/keyword-chips";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CronConfigurator } from "@/components/cron-configurator";
import { DeleteAgentButton } from "@/components/delete-agent-button";
import { DeliverySettings } from "@/components/delivery-settings";
import { MarkdownPreview } from "@/components/markdown-preview";
import {
  CollapsibleGroup,
  PageHeader,
  PageShell,
  SectionLabel,
} from "@/components/page-shell";
import { RelevanceSettings } from "@/components/relevance-settings";
import { StatusBadge } from "@/components/status-badge";
import { TriggerButton } from "@/components/trigger-button";
import { cronToHuman, getAgentById } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";
import { deliverySubtitle } from "@/lib/delivery-subtitle";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const agent = await getAgentById(params.id);
  if (!agent) notFound();

  const keywordSummary = `${cronToHuman(agent.cronSchedule)} · ${pluralize(agent.reports.length, "report")}`;
  const deliveryChannel = agent.deliveryChannels[0];
  const deliverySubtitleText = deliverySubtitle(deliveryChannel);

  return (
    <PageShell>
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
              <TriggerButton agentId={agent.id} />
              <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
            </>
          }
        />

        {agent.topicKeywords.length > 0 ? (
          <div className="mb-10">
            <KeywordChips keywords={agent.topicKeywords} variant="detail" />
          </div>
        ) : null}

        <SectionLabel
          title="Activity"
          description="Live pipeline status and generated reports"
        />
        <AgentLiveMonitor />
      </AgentRunProvider>

      <SectionLabel
        title="Configuration"
        description="Schedule, relevance rules, and report prompt"
      />
      <CollapsibleGroup className="mb-6">
        <CollapsibleSection
          variant="nested"
          title="Relevance filtering"
          subtitle={`Min score ${agent.relevanceMinScore} · ${agent.keywordMatchMode} match · last 7 days only`}
          defaultOpen={false}
        >
          <RelevanceSettings
            agentId={agent.id}
            initialMinScore={agent.relevanceMinScore}
            initialMatchMode={agent.keywordMatchMode}
            topicKeywords={agent.topicKeywords}
          />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Schedule"
          subtitle={cronToHuman(agent.cronSchedule)}
          defaultOpen={false}
        >
          <CronConfigurator cron={agent.cronSchedule} agentId={agent.id} />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Prompt & report framework"
          subtitle="Edit, optimize, and preview the system prompt"
          defaultOpen={false}
        >
          <MarkdownPreview
            initialPrompt={agent.systemPrompt}
            agentId={agent.id}
          />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Delivery"
          subtitle={deliverySubtitleText}
          defaultOpen={false}
        >
          <DeliverySettings agentId={agent.id} channel={deliveryChannel} />
        </CollapsibleSection>
      </CollapsibleGroup>
    </PageShell>
  );
}
