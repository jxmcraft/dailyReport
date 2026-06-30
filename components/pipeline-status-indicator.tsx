import { cn } from "@/lib/utils";
import type { PipelineState } from "@/lib/agents";

const STATE_CONFIG: Record<
  PipelineState,
  { badgeColor: string; pulseAnimation: boolean; description: string }
> = {
  IDLE: {
    badgeColor: "bg-slate-100 text-slate-700",
    pulseAnimation: false,
    description: "Waiting for the next scheduled run.",
  },
  IN_PROGRESS: {
    badgeColor: "bg-blue-100 text-blue-800",
    pulseAnimation: true,
    description: "Fetch, synthesize, and deliver — in progress.",
  },
  FETCHING: {
    badgeColor: "bg-amber-100 text-amber-800",
    pulseAnimation: true,
    description: "Pulling articles from news and web sources.",
  },
  SYNTHESIZING: {
    badgeColor: "bg-blue-100 text-blue-800",
    pulseAnimation: true,
    description: "Building the report with the LLM.",
  },
  DELIVERING: {
    badgeColor: "bg-indigo-100 text-indigo-800",
    pulseAnimation: true,
    description: "Sending to configured delivery channels.",
  },
  COMPLETED: {
    badgeColor: "bg-emerald-100 text-emerald-800",
    pulseAnimation: false,
    description: "Latest run finished successfully.",
  },
};

const STEPS: { key: PipelineState; label: string }[] = [
  { key: "FETCHING", label: "Fetch" },
  { key: "SYNTHESIZING", label: "Synthesize" },
  { key: "DELIVERING", label: "Deliver" },
  { key: "COMPLETED", label: "Done" },
];

const ORDER: PipelineState[] = [
  "IDLE",
  "IN_PROGRESS",
  "FETCHING",
  "SYNTHESIZING",
  "DELIVERING",
  "COMPLETED",
];

export function PipelineStatusIndicator({ state }: { state: PipelineState }) {
  const config = STATE_CONFIG[state];
  const currentIndex = ORDER.indexOf(state);
  const isInProgress = state === "IN_PROGRESS";
  const runComplete = state === "COMPLETED";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
            config.badgeColor
          )}
        >
          {config.pulseAnimation ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
          ) : null}
          {state.replace(/_/g, " ")}
        </span>
        <span className="text-sm text-muted-foreground">{config.description}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center">
        {STEPS.map((step, i) => {
          const stepIndex = ORDER.indexOf(step.key);
          const done =
            runComplete || (!isInProgress && currentIndex > stepIndex);
          const active =
            !runComplete && (isInProgress || currentIndex === stepIndex);
          return (
            <div
              key={step.key}
              className="flex flex-1 items-center last:flex-none sm:contents"
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                    !done && !active && "border-border bg-white text-muted-foreground"
                  )}
                >
                  {done ? "\u2713" : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mx-3 hidden h-0.5 flex-1 rounded sm:block",
                    currentIndex > stepIndex || isInProgress
                      ? "bg-primary/60"
                      : "bg-border"
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
