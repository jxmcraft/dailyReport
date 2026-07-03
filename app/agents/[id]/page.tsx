import { notFound } from "next/navigation";

import { AgentLiveMonitor } from "@/components/agent-live-monitor";
import { AgentNameSettings } from "@/components/agent-name-settings";
import { AgentRunProvider } from "@/components/agent-run-context";
import { KeywordChips } from "@/components/keyword-chips";
import { KeywordSettings } from "@/components/keyword-settings";
import { ScrapeSourcesSettings } from "@/components/scrape-sources-settings";
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
import { PauseAgentButton } from "@/components/pause-agent-button";
import { StatusBadge } from "@/components/status-badge";
import { TriggerButton } from "@/components/trigger-button";
import { cronToHuman, getAgentById } from "@/lib/agents";
import { pluralize } from "@/lib/pluralize";
import { deliverySubtitle } from "@/lib/delivery-subtitle";
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
  const deliverySubtitleText = deliverySubtitle(deliveryChannel);
  const directorySearchEnabled = isMicrosoftGraphConfigured();
  const scrapeUrls = agent.dataSources
    .filter((s) => s.sourceType === "CUSTOM_SCRAPE")
    .map((s) => s.apiEndpoint);
  const scrapeSubtitle =
    scrapeUrls.length === 0
      ? "No custom URLs"
      : scrapeUrls.length === 1
        ? scrapeUrls[0].length > 60
          ? `${scrapeUrls[0].slice(0, 57)}…`
          : scrapeUrls[0]
        : `${scrapeUrls.length} URLs`;

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
          <div className="mb-10">
            <KeywordChips keywords={agent.topicKeywords} variant="detail" />
          </div>
        ) : null}

        <SectionLabel
          title="Activity"
          description="Live pipeline status and generated reports"
        />
        <AgentLiveMonitor
          agentId={agent.id}
          agentName={agent.name}
          emailDeliveryEnabled={deliveryChannel?.target === "EMAIL"}
          requireEmailApproval={deliveryChannel?.requireEmailApproval ?? false}
        />
      </AgentRunProvider>

      <SectionLabel
        title="Configuration"
        description="Schedule, relevance rules, and report prompt"
      />
      <CollapsibleGroup className="mb-6">
        <CollapsibleSection
          variant="nested"
          title="Agent name"
          subtitle={agent.name}
          defaultOpen={false}
        >
          <AgentNameSettings agentId={agent.id} initialName={agent.name} />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Topic keywords"
          subtitle={
            agent.topicKeywords.length > 0
              ? agent.topicKeywords.join(", ")
              : "No keywords set"
          }
          defaultOpen={false}
        >
          <KeywordSettings
            agentId={agent.id}
            initialKeywords={agent.topicKeywords}
            hasCustomScrapeSources={agent.dataSources.some(
              (s) => s.sourceType === "CUSTOM_SCRAPE"
            )}
          />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Custom scrape URLs"
          subtitle={scrapeSubtitle}
          defaultOpen={false}
        >
          <ScrapeSourcesSettings
            agentId={agent.id}
            initialUrls={scrapeUrls}
            hasTopicKeywords={agent.topicKeywords.length > 0}
          />
        </CollapsibleSection>

        <CollapsibleSection
          variant="nested"
          title="Relevance filtering"
          subtitle={`Min ${agent.minRankedSources} sources · score ${agent.relevanceMinScore} · ${agent.keywordMatchMode} match · last 7 days only`}
          defaultOpen={false}
        >
          <RelevanceSettings
            agentId={agent.id}
            initialMinScore={agent.relevanceMinScore}
            initialMinRankedSources={agent.minRankedSources}
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
          <DeliverySettings
            agentId={agent.id}
            channel={deliveryChannel}
            directorySearchEnabled={directorySearchEnabled}
          />
        </CollapsibleSection>
      </CollapsibleGroup>
    </PageShell>
  );
}
