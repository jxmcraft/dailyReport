"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { ReportEntryData } from "@/components/report-entry";
import {
  AGENT_STATUS_POLL_MS,
  PIPELINE_STAGE_TICK_MS,
} from "@/lib/constants";
import { fetchAgentStatus } from "@/lib/client-api";
import type { PipelineState } from "@/lib/agents";
import type { SourceDiagnostic } from "@/lib/sources";

type AgentRunStatus = "ACTIVE" | "PAUSED" | "RUNNING";

type ReportWithDiagnostics = ReportEntryData & {
  sourceDiagnostics: SourceDiagnostic[] | null;
};

interface AgentRunContextValue {
  status: AgentRunStatus;
  isRunning: boolean;
  pipelineState: PipelineState;
  reports: ReportWithDiagnostics[];
}

const AgentRunContext = createContext<AgentRunContextValue | null>(null);

function stageFromRunning(elapsedMs: number): PipelineState {
  if (elapsedMs < 12_000) return "FETCHING";
  if (elapsedMs < 45_000) return "SYNTHESIZING";
  return "DELIVERING";
}

export function AgentRunProvider({
  agentId,
  initialStatus,
  initialPipelineState,
  initialReports,
  children,
}: {
  agentId: string;
  initialStatus: AgentRunStatus;
  initialPipelineState: PipelineState;
  initialReports: ReportWithDiagnostics[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pipelineState, setPipelineState] = useState(initialPipelineState);
  const [reports, setReports] = useState(initialReports);
  const runStartedAtRef = useRef<number | null>(null);
  const lastSnapshot = useRef(
    `${initialStatus}:${initialReports[0]?.id ?? ""}:${initialReports.length}`
  );

  const poll = useCallback(async () => {
    const data = await fetchAgentStatus(agentId);
    if (!data) return;

    const snapshot = `${data.status}:${data.latestReport?.id ?? ""}:${data.reportCount}`;
    const changed = snapshot !== lastSnapshot.current;
    lastSnapshot.current = snapshot;

    setStatus(data.status);
    if (data.status === "RUNNING") {
      if (!runStartedAtRef.current) runStartedAtRef.current = Date.now();
      setPipelineState(stageFromRunning(Date.now() - runStartedAtRef.current));
    } else {
      runStartedAtRef.current = null;
      setPipelineState(data.pipelineState);
    }

    if (data.latestReport) {
      setReports((prev) => {
        const exists = prev.some((r) => r.id === data.latestReport!.id);
        if (exists) {
          return prev.map((r) =>
            r.id === data.latestReport!.id ? data.latestReport! : r
          );
        }
        return [data.latestReport!, ...prev];
      });
    }

    if (changed) router.refresh();
  }, [agentId, router]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, AGENT_STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  useEffect(() => {
    if (status !== "RUNNING" || !runStartedAtRef.current) return;
    const id = setInterval(() => {
      if (runStartedAtRef.current) {
        setPipelineState(
          stageFromRunning(Date.now() - runStartedAtRef.current)
        );
      }
    }, PIPELINE_STAGE_TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  return (
    <AgentRunContext.Provider
      value={{
        status,
        isRunning: status === "RUNNING",
        pipelineState,
        reports,
      }}
    >
      {children}
    </AgentRunContext.Provider>
  );
}

export function useAgentRun(): AgentRunContextValue {
  const ctx = useContext(AgentRunContext);
  if (!ctx) {
    throw new Error("useAgentRun must be used within AgentRunProvider");
  }
  return ctx;
}
