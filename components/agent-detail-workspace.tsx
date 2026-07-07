"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Clock,
  FileText,
  Filter,
  Globe,
  History,
  Mail,
  PanelLeft,
  PanelRight,
  User,
  type LucideIcon,
} from "lucide-react";

import { AgentNameSettings } from "@/components/agent-name-settings";
import { useAgentRun } from "@/components/agent-run-context";
import { ClearLogsButton } from "@/components/clear-logs-button";
import { CronConfigurator } from "@/components/cron-configurator";
import { DeliverySettings } from "@/components/delivery-settings";
import { KeywordSettings } from "@/components/keyword-settings";
import { MarkdownPreview } from "@/components/markdown-preview";
import { PipelineStatusIndicator } from "@/components/pipeline-status-indicator";
import { RelevanceSettings } from "@/components/relevance-settings";
import { ReportEntry } from "@/components/report-entry";
import { RunningBanner } from "@/components/running-banner";
import { ScrapeSourcesSettings } from "@/components/scrape-sources-settings";
import { ReportStatusBadge } from "@/components/status-badge";
import { SourceHealthCard } from "@/components/source-health-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-date";
import type {
  AgentView,
  DeliveryChannelView,
  EmailDeliveryStatus,
} from "@/lib/agents";

type PanelId =
  | "pipeline"
  | "report-history"
  | "general"
  | "sources"
  | "relevance"
  | "schedule"
  | "prompt"
  | "delivery";

type PanelGroup = "activity" | "configuration";

type PanelDef = {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  group: PanelGroup;
};

type WorkspaceReport = ReturnType<typeof useAgentRun>["reports"][number];

const PANELS: PanelDef[] = [
  { id: "pipeline", label: "Pipeline", icon: Activity, group: "activity" },
  {
    id: "report-history",
    label: "Report history",
    icon: History,
    group: "activity",
  },
  { id: "general", label: "General", icon: User, group: "configuration" },
  { id: "sources", label: "Sources", icon: Globe, group: "configuration" },
  { id: "relevance", label: "Relevance", icon: Filter, group: "configuration" },
  { id: "schedule", label: "Schedule", icon: Clock, group: "configuration" },
  { id: "prompt", label: "Prompt", icon: FileText, group: "configuration" },
  { id: "delivery", label: "Delivery", icon: Mail, group: "configuration" },
];
const PANEL_GROUPS: { key: PanelGroup; title: string }[] = [
  { key: "activity", title: "Activity" },
  { key: "configuration", title: "Configuration" },
];

const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 560;
const DEFAULT_PANEL_WIDTH = 320;
const PANEL_WIDTH_STORAGE_KEY = "agent-detail-panel-width";

function clampPanelWidth(width: number) {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
}

function getPanel(panelId: PanelId): PanelDef {
  return PANELS.find((panel) => panel.id === panelId) ?? PANELS[0];
}

function PanelResizeHandle({
  panelPosition,
  onResizeStart,
}: {
  panelPosition: "left" | "right";
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize side panel"
      aria-valuemin={MIN_PANEL_WIDTH}
      aria-valuemax={MAX_PANEL_WIDTH}
      onPointerDown={onResizeStart}
      className={cn(
        "hidden w-2 shrink-0 touch-none select-none lg:block",
        "cursor-col-resize bg-transparent transition-colors hover:bg-primary/15 active:bg-primary/25",
        panelPosition === "left" ? "-mr-1" : "-ml-1"
      )}
    />
  );
}

function PanelContainer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-white shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ReportHistoryPanel({
  reports,
  activeReportId,
  isRunning,
  agentId,
  agentName,
  onSelectReport,
  onClearReports,
}: {
  reports: WorkspaceReport[];
  activeReportId: string | null;
  isRunning: boolean;
  agentId: string;
  agentName: string;
  onSelectReport: (reportId: string) => void;
  onClearReports: () => void;
}) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reports yet. Trigger a run or wait for the scheduler.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ClearLogsButton
          scope="agent"
          agentId={agentId}
          agentName={agentName}
          disabled={isRunning}
          onCleared={onClearReports}
        />
      </div>
      <ul className="space-y-1">
        {reports.map((report) => {
          const isActive = activeReportId === report.id;
          return (
            <li key={report.id}>
              <button
                type="button"
                onClick={() => onSelectReport(report.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-white hover:bg-slate-50"
                )}
              >
                <span className="min-w-0 truncate font-medium">
                  {formatDate(report.timestamp)}
                </span>
                <ReportStatusBadge status={report.status} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WorkspacePanelContent({
  activePanelId,
  isRunning,
  pipelineState,
  reports,
  activeReportId,
  agent,
  deliveryChannel,
  directorySearchEnabled,
  onSelectReport,
  onClearReports,
}: {
  activePanelId: PanelId;
  isRunning: boolean;
  pipelineState: ReturnType<typeof useAgentRun>["pipelineState"];
  reports: WorkspaceReport[];
  activeReportId: string | null;
  agent: AgentDetailWorkspaceProps["agent"];
  deliveryChannel: DeliveryChannelView | undefined;
  directorySearchEnabled: boolean;
  onSelectReport: (reportId: string) => void;
  onClearReports: () => void;
}) {
  const scrapeUrls = agent.dataSources
    .filter((s) => s.sourceType === "CUSTOM_SCRAPE")
    .map((s) => s.apiEndpoint);
  const hasCustomScrape = agent.dataSources.some(
    (s) => s.sourceType === "CUSTOM_SCRAPE"
  );

  switch (activePanelId) {
    case "pipeline":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isRunning
              ? "Run active — tracking progress"
              : "Idle until next scheduled run"}
          </p>
          <PipelineStatusIndicator state={pipelineState} />
        </div>
      );
    case "report-history":
      return (
        <ReportHistoryPanel
          reports={reports}
          activeReportId={activeReportId}
          isRunning={isRunning}
          agentId={agent.id}
          agentName={agent.name}
          onSelectReport={onSelectReport}
          onClearReports={onClearReports}
        />
      );
    case "general":
      return <AgentNameSettings agentId={agent.id} initialName={agent.name} />;
    case "sources":
      return (
        <div className="space-y-6">
          <KeywordSettings
            agentId={agent.id}
            initialKeywords={agent.topicKeywords}
            hasCustomScrapeSources={hasCustomScrape}
          />
          <div className="border-t border-border/60 pt-6">
            <ScrapeSourcesSettings
              agentId={agent.id}
              initialUrls={scrapeUrls}
              hasTopicKeywords={agent.topicKeywords.length > 0}
            />
          </div>
        </div>
      );
    case "relevance":
      return (
        <RelevanceSettings
          agentId={agent.id}
          initialMinScore={agent.relevanceMinScore}
          initialMinRankedSources={agent.minRankedSources}
          initialMatchMode={agent.keywordMatchMode}
          topicKeywords={agent.topicKeywords}
        />
      );
    case "schedule":
      return <CronConfigurator cron={agent.cronSchedule} agentId={agent.id} />;
    case "prompt":
      return (
        <MarkdownPreview
          initialPrompt={agent.systemPrompt}
          agentId={agent.id}
        />
      );
    case "delivery":
      return (
        <DeliverySettings
          agentId={agent.id}
          channel={deliveryChannel}
          directorySearchEnabled={directorySearchEnabled}
        />
      );
    default:
      return null;
  }
}

function SidePanel({
  panelWidth,
  activePanel,
  activePanelId,
  panelPosition,
  onTogglePosition,
  onSelectPanel,
  children,
}: {
  panelWidth: number;
  activePanel: PanelDef;
  activePanelId: PanelId;
  panelPosition: "left" | "right";
  onTogglePosition: () => void;
  onSelectPanel: (id: PanelId) => void;
  children: ReactNode;
}) {
  return (
    <aside
      style={{ width: panelWidth }}
      className="flex shrink-0 flex-col rounded-xl border border-border/70 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {activePanel.label}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 shrink-0 lg:inline-flex"
          onClick={onTogglePosition}
          title={
            panelPosition === "right"
              ? "Move panel to left"
              : "Move panel to right"
          }
          aria-label={
            panelPosition === "right"
              ? "Move panel to left"
              : "Move panel to right"
          }
        >
          {panelPosition === "right" ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="hidden border-b border-border/60 p-3 lg:block">
        <PanelNav
          activePanelId={activePanelId}
          onSelect={onSelectPanel}
          layout="vertical"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto p-4 lg:max-h-[calc(100vh-14rem)]">
        {children}
      </div>
    </aside>
  );
}

function CenterColumn({
  activeReport,
  isRunning,
  emailDeliveryEnabled,
  requireEmailApproval,
  viewingOlder,
  onBackToLatest,
  onReportDeleted,
  onReportEmailSent,
}: {
  activeReport: WorkspaceReport | null;
  isRunning: boolean;
  emailDeliveryEnabled: boolean;
  requireEmailApproval: boolean;
  viewingOlder: boolean;
  onBackToLatest: () => void;
  onReportDeleted: (reportId: string) => void;
  onReportEmailSent: (reportId: string, status: EmailDeliveryStatus) => void;
}) {
  return (
    <main className="min-w-0 flex-1">
      <div className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-white shadow-sm">
          {viewingOlder ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50/80 px-4 py-2.5 text-sm">
              <span className="text-amber-900">Viewing older report</span>
              <button
                type="button"
                onClick={onBackToLatest}
                className="font-medium text-amber-900 underline-offset-2 hover:underline"
              >
                Back to latest
              </button>
            </div>
          ) : null}

          {activeReport ? (
            <div className="p-4 sm:p-6">
              <ReportEntry
                report={activeReport}
                variant="expanded"
                showSendEmail={emailDeliveryEnabled}
                requireEmailApproval={requireEmailApproval}
                sendEmailDisabled={isRunning}
                onEmailSent={(status) => onReportEmailSent(activeReport.id, status)}
                deleteDisabled={isRunning}
                onDeleted={() => onReportDeleted(activeReport.id)}
              />
            </div>
          ) : (
            <div className="px-8 py-16 text-center text-sm text-muted-foreground">
              No reports yet. Trigger a run or wait for the scheduler.
            </div>
          )}
        </div>

        <PanelContainer title="Source health">
          <SourceHealthCard diagnostics={activeReport?.sourceDiagnostics ?? null} />
        </PanelContainer>
      </div>
    </main>
  );
}

export type AgentDetailWorkspaceProps = {
  agent: Pick<
    AgentView,
    | "id"
    | "name"
    | "topicKeywords"
    | "cronSchedule"
    | "systemPrompt"
    | "relevanceMinScore"
    | "minRankedSources"
    | "keywordMatchMode"
    | "dataSources"
  >;
  deliveryChannel: DeliveryChannelView | undefined;
  directorySearchEnabled: boolean;
  emailDeliveryEnabled: boolean;
  requireEmailApproval: boolean;
};

function PanelNav({
  activePanelId,
  onSelect,
  layout,
}: {
  activePanelId: PanelId;
  onSelect: (id: PanelId) => void;
  layout: "vertical" | "horizontal";
}) {
  if (layout === "horizontal") {
    return (
      <nav
        className="flex gap-1.5 overflow-x-auto pb-1"
        aria-label="Workspace panels"
      >
        {PANELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activePanelId === id
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/70 bg-white text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-4" aria-label="Workspace panels">
      {PANEL_GROUPS.map(({ key, title }) => (
        <div key={key} className="space-y-0.5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {title}
          </p>
          {PANELS.filter((p) => p.group === key).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activePanelId === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function AgentDetailWorkspace({
  agent,
  deliveryChannel,
  directorySearchEnabled,
  emailDeliveryEnabled,
  requireEmailApproval,
}: AgentDetailWorkspaceProps) {
  const [activePanelId, setActivePanelId] = useState<PanelId>("pipeline");
  const [panelPosition, setPanelPosition] = useState<"left" | "right">("right");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
      if (!stored) return;
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        setPanelWidth(clampPanelWidth(parsed));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const startPanelResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = panelWidthRef.current;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta =
          panelPosition === "right"
            ? startX - moveEvent.clientX
            : moveEvent.clientX - startX;
        setPanelWidth(clampPanelWidth(startWidth + delta));
      };

      const onPointerUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try {
          localStorage.setItem(
            PANEL_WIDTH_STORAGE_KEY,
            String(panelWidthRef.current)
          );
        } catch {
          // ignore storage errors
        }
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [panelPosition]
  );

  const {
    isRunning,
    pipelineState,
    reports,
    removeReport,
    clearReports,
    updateReportEmailStatus,
  } = useAgentRun();

  const latestReport = reports[0] ?? null;
  const activeReport = useMemo(
    () =>
      (activeReportId
        ? reports.find((report) => report.id === activeReportId)
        : undefined) ?? latestReport,
    [activeReportId, latestReport, reports]
  );
  const viewingOlder =
    latestReport != null &&
    activeReport != null &&
    activeReport.id !== latestReport.id;

  useEffect(() => {
    if (
      activeReportId &&
      !reports.some((r) => r.id === activeReportId)
    ) {
      setActiveReportId(null);
    }
  }, [reports, activeReportId]);

  const activePanel = getPanel(activePanelId);
  const panelContent = (
    <WorkspacePanelContent
      activePanelId={activePanelId}
      isRunning={isRunning}
      pipelineState={pipelineState}
      reports={reports}
      activeReportId={activeReport?.id ?? null}
      agent={agent}
      deliveryChannel={deliveryChannel}
      directorySearchEnabled={directorySearchEnabled}
      onSelectReport={setActiveReportId}
      onClearReports={() => {
        clearReports();
        setActiveReportId(null);
      }}
    />
  );

  return (
    <div className="mb-8 space-y-4">
      {isRunning ? (
        <RunningBanner
          variant="compact"
          title="Run in progress"
          description="Fetching sources and building your report."
        />
      ) : null}

      {/* Desktop layout */}
      <div className="hidden gap-2 lg:flex">
        {panelPosition === "left" ? (
          <>
            <SidePanel
              panelWidth={panelWidth}
              activePanel={activePanel}
              activePanelId={activePanelId}
              panelPosition={panelPosition}
              onTogglePosition={() =>
                setPanelPosition((position) =>
                  position === "right" ? "left" : "right"
                )
              }
              onSelectPanel={setActivePanelId}
            >
              {panelContent}
            </SidePanel>
            <PanelResizeHandle
              panelPosition={panelPosition}
              onResizeStart={startPanelResize}
            />
          </>
        ) : null}
        <CenterColumn
          activeReport={activeReport}
          isRunning={isRunning}
          emailDeliveryEnabled={emailDeliveryEnabled}
          requireEmailApproval={requireEmailApproval}
          viewingOlder={viewingOlder}
          onBackToLatest={() => setActiveReportId(null)}
          onReportDeleted={(reportId) => {
            removeReport(reportId);
            if (activeReportId === reportId) {
              setActiveReportId(null);
            }
          }}
          onReportEmailSent={(reportId, status) =>
            updateReportEmailStatus(reportId, status)
          }
        />
        {panelPosition === "right" ? (
          <>
            <PanelResizeHandle
              panelPosition={panelPosition}
              onResizeStart={startPanelResize}
            />
            <SidePanel
              panelWidth={panelWidth}
              activePanel={activePanel}
              activePanelId={activePanelId}
              panelPosition={panelPosition}
              onTogglePosition={() =>
                setPanelPosition((position) =>
                  position === "right" ? "left" : "right"
                )
              }
              onSelectPanel={setActivePanelId}
            >
              {panelContent}
            </SidePanel>
          </>
        ) : null}
      </div>

      {/* Mobile layout */}
      <div className="space-y-4 lg:hidden">
        <CenterColumn
          activeReport={activeReport}
          isRunning={isRunning}
          emailDeliveryEnabled={emailDeliveryEnabled}
          requireEmailApproval={requireEmailApproval}
          viewingOlder={viewingOlder}
          onBackToLatest={() => setActiveReportId(null)}
          onReportDeleted={(reportId) => {
            removeReport(reportId);
            if (activeReportId === reportId) {
              setActiveReportId(null);
            }
          }}
          onReportEmailSent={(reportId, status) =>
            updateReportEmailStatus(reportId, status)
          }
        />
        <PanelContainer title={activePanel.label}>
          <div className="border-b border-border/60 px-3 pb-3 -mx-4 -mt-4 mb-4 pt-3">
            <PanelNav
              activePanelId={activePanelId}
              onSelect={setActivePanelId}
              layout="horizontal"
            />
          </div>
          {panelContent}
        </PanelContainer>
      </div>
    </div>
  );
}
