"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RunningBanner } from "@/components/running-banner";
import { DASHBOARD_LIVE_POLL_MS } from "@/lib/constants";
import { pluralize } from "@/lib/pluralize";
import { agentsLiveSnapshotKey, fetchAgentsLive } from "@/lib/client-api";

export function DashboardLiveSync() {
  const router = useRouter();
  const lastKey = useRef("");
  const [runningCount, setRunningCount] = useState(0);

  useEffect(() => {
    async function poll() {
      const data = await fetchAgentsLive();
      if (!data) return;

      setRunningCount(data.runningCount ?? 0);

      const key = agentsLiveSnapshotKey(data.agents);
      if (lastKey.current && key !== lastKey.current) {
        router.refresh();
      }
      lastKey.current = key;
    }

    poll();
    const id = setInterval(poll, DASHBOARD_LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  if (runningCount === 0) return null;

  return (
    <RunningBanner
      title={`${pluralize(runningCount, "agent")} running`}
      description="on schedule"
    />
  );
}
