import { cn } from "@/lib/utils";
import type { PipelineState } from "@/lib/agents";

const STATE_CONFIG: Record<
  PipelineState,
  { badgeColor: string; pulseAnimation: boolean; description: string }
> = {
  IDLE: {
    badgeColor: "bg-slate-100 text-slate-700",
    pulseAnimation: false,
    description: "Agent awaiting scheduled cron trigger.",
  },
  FETCHING: {
    badgeColor: "bg-amber-100 text-amber-700",
    pulseAnimation: true,
    description: "Connecting to external HTTP endpoints, parsing upstream payloads.",
  },
  SYNTHESIZING: {
    badgeColor: "bg-blue-100 text-blue-700",
    pulseAnimation: true,
    description: "Injecting context matrix into target model API context window.",
  },
  DELIVERING: {
    badgeColor: "bg-indigo-100 text-indigo-700",
    pulseAnimation: true,
    description: "Dispatching payload buffers via target protocol webhooks.",
  },
  COMPLETED: {
    badgeColor: "bg-emerald-100 text-emerald-700",
    pulseAnimation: false,
    description: "Report successfully parsed and distributed.",
  },
};

const STEPS: { key: PipelineState; label: string }[] = [
  { key: "FETCHING", label: "Fetching" },
  { key: "SYNTHESIZING", label: "Synthesizing" },
  { key: "DELIVERING", label: "Delivering" },
  { key: "COMPLETED", label: "Completed" },
];

const ORDER: PipelineState[] = [
  "IDLE",
  "FETCHING",
  "SYNTHESIZING",
  "DELIVERING",
  "COMPLETED",
];

export function PipelineStatusIndicator({ state }: { state: PipelineState }) {
  const config = STATE_CONFIG[state];
  const currentIndex = ORDER.indexOf(state);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
            config.badgeColor
          )}
        >
          {config.pulseAnimation && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
          )}
          {state}
        </span>
        <span className="text-sm text-muted-foreground">{config.description}</span>
      </div>

      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const stepIndex = ORDER.indexOf(step.key);
          const done = currentIndex > stepIndex;
          const active = currentIndex === stepIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                    done && "border-primary bg-primary text-primary-foreground",
                    active &&
                      "border-primary bg-primary/10 text-primary animate-pulse",
                    !done && !active && "border-border bg-background text-muted-foreground"
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
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded",
                    currentIndex > stepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
