import { Loader2, Radio } from "lucide-react";

export function RunningBanner({
  title,
  description,
  variant = "compact",
}: {
  title: string;
  description?: string;
  variant?: "compact" | "detail";
}) {
  if (variant === "detail") {
    return (
      <div
        className="flex items-start gap-4 rounded-xl border border-blue-200/80 bg-blue-50/80 px-5 py-4"
        role="status"
        aria-live="polite"
      >
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-blue-950">{title}</p>
          {description ? (
            <p className="text-sm leading-relaxed text-blue-900/80">{description}</p>
          ) : null}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-8 flex items-center gap-3 rounded-xl border border-blue-200/80 bg-blue-50/80 px-5 py-3.5"
      role="status"
    >
      <Radio className="h-4 w-4 shrink-0 text-blue-600" />
      <p className="text-sm text-blue-950">
        <span className="font-medium">{title}</span>
        {description ? (
          <span className="text-blue-900/80"> {description}</span>
        ) : null}
        <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin align-text-bottom" />
      </p>
    </div>
  );
}
