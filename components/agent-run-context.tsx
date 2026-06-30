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
import { ACTIVE_RUN_POLL_MS } from "@/lib/constants";
import { fetchAgentStatus, fetchRuntimeSettings } from "@/lib/client-api";
import type { EmailDeliveryStatus, PipelineState } from "@/lib/agents";
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
  setOptimisticStatus: (status: AgentRunStatus) => void;
  startWatching: () => void;
  removeReport: (reportId: string) => void;
  clearReports: () => void;
  updateReportEmailStatus: (reportId: string, status: EmailDeliveryStatus) => void;
}

const AgentRunContext = createContext<AgentRunContextValue | null>(null);

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
  const routerRef = useRef(router);
  routerRef.current = router;

  const [status, setStatus] = useState(initialStatus);
  const [pipelineState, setPipelineState] = useState(initialPipelineState);
  const [reports, setReports] = useState(initialReports);
  const [watching, setWatching] = useState(initialStatus === "RUNNING");
  const [pollMs, setPollMs] = useState(ACTIVE_RUN_POLL_MS);
  const lastSnapshot = useRef(
    `${initialStatus}:${initialReports[0]?.id ?? ""}:${initialReports.length}`
  );

  const agentIdRef = useRef(agentId);
  agentIdRef.current = agentId;

  const sawRunningRef = useRef(initialStatus === "RUNNING");

  const pollRef = useRef<() => Promise<void>>(async () => {});
  pollRef.current = async () => {
    const data = await fetchAgentStatus(agentIdRef.current);
    if (!data) return;

    const snapshot = `${data.status}:${data.latestReport?.id ?? ""}:${data.reportCount}`;
    const changed = snapshot !== lastSnapshot.current;
    lastSnapshot.current = snapshot;

    setStatus(data.status);
    setPipelineState(data.pipelineState);

    if (data.status === "RUNNING") {
      sawRunningRef.current = true;
    } else if (sawRunningRef.current) {
      setWatching(false);
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

    if (changed) routerRef.current.refresh();
  };

  const startWatching = useCallback(() => setWatching(true), []);

  const removeReport = useCallback((reportId: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== reportId);
      lastSnapshot.current = `${status}:${next[0]?.id ?? ""}:${next.length}`;
      return next;
    });
  }, [status]);

  const clearReports = useCallback(() => {
    setReports([]);
    lastSnapshot.current = `${status}::0`;
  }, [status]);

  const updateReportEmailStatus = useCallback(
    (reportId: string, emailStatus: EmailDeliveryStatus) => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, emailDeliveryStatus: emailStatus } : r
        )
      );
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    void fetchRuntimeSettings().then((data) => {
      if (!cancelled && data?.activeRunPollMs) {
        setPollMs(data.activeRunPollMs);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const shouldPoll = watching || status === "RUNNING";

  useEffect(() => {
    if (!shouldPoll) return;

    const tick = () => {
      void pollRef.current();
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => clearInterval(id);
  }, [agentId, shouldPoll, pollMs]);

  return (
    <AgentRunContext.Provider
      value={{
        status,
        isRunning: status === "RUNNING",
        pipelineState,
        reports,
        setOptimisticStatus: setStatus,
        startWatching,
        removeReport,
        clearReports,
        updateReportEmailStatus,
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
