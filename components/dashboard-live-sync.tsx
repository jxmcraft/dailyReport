"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RunningBanner } from "@/components/running-banner";
import { ACTIVE_RUN_POLL_MS } from "@/lib/constants";
import { pluralize } from "@/lib/pluralize";
import { agentsLiveSnapshotKey, fetchAgentsLive, fetchRuntimeSettings } from "@/lib/client-api";

export function DashboardLiveSync() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const lastKey = useRef("");
  const [runningCount, setRunningCount] = useState(0);
  const pollMsRef = useRef(ACTIVE_RUN_POLL_MS);

  useEffect(() => {
    let cancelled = false;
    void fetchRuntimeSettings().then((data) => {
      if (!cancelled && data?.activeRunPollMs) {
        pollMsRef.current = data.activeRunPollMs;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function pollOnce(): Promise<number> {
      const data = await fetchAgentsLive();
      if (!data || cancelled) return 0;

      const count = data.runningCount ?? 0;
      setRunningCount(count);

      const key = agentsLiveSnapshotKey(data.agents);
      if (lastKey.current && key !== lastKey.current) {
        routerRef.current.refresh();
      }
      lastKey.current = key;

      return count;
    }

    async function bootstrap() {
      const count = await pollOnce();
      if (cancelled || count === 0) return;

      intervalId = setInterval(async () => {
        const c = await pollOnce();
        if (!cancelled && c === 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, pollMsRef.current);
    }

    void bootstrap();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (runningCount === 0) return null;

  return (
    <RunningBanner
      title={`${pluralize(runningCount, "agent")} running`}
      description="on schedule"
    />
  );
}
